// server/src/employees/attendance/attendance.service.js
import prisma from "../../config/prisma.js";
import * as activityLogsService from "../activity-logs/activityLogs.service.js";

function startOfDay(dateInput) {
  const d = dateInput ? new Date(dateInput) : new Date();
  // CHANGED: build the boundary in UTC (not d.setHours, which uses the
  // server process's local timezone). Attendance.date is a @db.Date column,
  // and Prisma stores DateTime values into it by taking the UTC date part.
  // If the server runs in a timezone ahead of UTC (e.g. IST, +5:30), local
  // midnight is still the previous day in UTC, so a plain setHours(0,0,0,0)
  // silently writes attendance one calendar day early. Constructing with
  // Date.UTC anchors us to the same calendar day the DB column will store.
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// FIX: none of checkIn/checkOut/recordBreak/markStatus below previously
// verified employeeId belonged to this outlet before writing attendance
// against it — in practice this is normally an employee acting on their
// own id, but the id still comes from the request and was never checked.
async function assertEmployeeInOutlet(employeeId, outletId) {
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, outletId },
  });
  if (!employee) {
    throw new Error("Employee not found");
  }
}

export async function checkIn(employeeId, { ipAddress, device } = {}, outletId) {
  await assertEmployeeInOutlet(employeeId, outletId);

  const date = startOfDay();
  const now = new Date();

  const [attendance] = await prisma.$transaction([
    prisma.attendance.upsert({
      where: { employeeId_date: { employeeId, date } },
      create: { outletId, employeeId, date, clockIn: now, status: "PRESENT" },
      update: { clockIn: now, status: "PRESENT" },
    }),
    prisma.attendanceLog.create({
      data: { employeeId, eventType: "CLOCK_IN", ipAddress, device },
    }),
  ]);

  // CHANGED: auto-record to the employee activity log — nothing previously
  // called logActivity anywhere, so the Activity Log tab was always empty.
  await activityLogsService.logActivity({
    employeeId,
    action: "Checked in",
    ipAddress,
    device,
  }, outletId);

  return attendance;
}

export async function checkOut(employeeId, { ipAddress, device } = {}, outletId) {
  await assertEmployeeInOutlet(employeeId, outletId);

  const date = startOfDay();
  const now = new Date();

  const existing = await prisma.attendance.findUnique({
    where: { employeeId_date: { employeeId, date } },
  });

  if (!existing || !existing.clockIn) {
    throw new Error("No clock-in record found for today");
  }

  const workingHours = (now - new Date(existing.clockIn)) / (1000 * 60 * 60);

  const [attendance] = await prisma.$transaction([
    prisma.attendance.update({
      where: { employeeId_date: { employeeId, date } },
      data: {
        clockOut: now,
        workingHours: Math.round(workingHours * 100) / 100,
        overtimeHours:
          workingHours > 9 ? Math.round((workingHours - 9) * 100) / 100 : 0,
      },
    }),
    prisma.attendanceLog.create({
      data: { employeeId, eventType: "CLOCK_OUT", ipAddress, device },
    }),
  ]);

  // CHANGED: auto-record to the employee activity log (see checkIn above).
  await activityLogsService.logActivity({
    employeeId,
    action: `Checked out (worked ${attendance.workingHours ?? "—"} hrs)`,
    ipAddress,
    device,
  }, outletId);

  return attendance;
}

export async function recordBreak(
  employeeId,
  type,
  { ipAddress, device } = {},
  outletId,
) {
  await assertEmployeeInOutlet(employeeId, outletId);
  // type: "BREAK_START" | "BREAK_END"
  return prisma.attendanceLog.create({
    data: { employeeId, eventType: type, ipAddress, device },
  });
}

export async function listAttendance({
  employeeId,
  from,
  to,
  status,
  page = 1,
  limit = 30,
}, outletId) {
  const where = {
    outletId,
    ...(employeeId ? { employeeId } : {}),
    ...(status ? { status } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.attendance.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeCode: true } } },
      orderBy: { date: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.attendance.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
}

export async function getEmployeeAttendanceLogs(employeeId, { from, to } = {}, outletId) {
  // AttendanceLog has no outletId of its own (child row — scope comes from
  // its parent Employee, same pattern as elsewhere in this codebase).
  await assertEmployeeInOutlet(employeeId, outletId);

  return prisma.attendanceLog.findMany({
    where: {
      employeeId,
      ...(from || to
        ? {
            timestamp: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    orderBy: { timestamp: "desc" },
  });
}

export async function markStatus(employeeId, date, status, outletId) {
  await assertEmployeeInOutlet(employeeId, outletId);

  return prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: startOfDay(date) } },
    create: { outletId, employeeId, date: startOfDay(date), status },
    update: { status },
  });
}

// CHANGED: "close the day" — for every ACTIVE employee in this outlet who
// does NOT already have an attendance row for the given date, create one
// with status ABSENT. Employees who checked in already have PRESENT (or
// HALF_DAY), and employees whose leave was approved already have LEAVE
// written in by leaves.service#decideLeaveRequest — this only fills in the
// remaining gap: "nothing recorded at all" => treated as an unmarked absence.
// Intended to be called once per day (e.g. via a scheduled job just after
// midnight, or manually by an Owner from the UI) for the day that just ended.
//
// IMPORTANT if/when a scheduled job calls this: it must loop over every
// active Outlet and call this once per outlet, same as alerts.service.js's
// generateAlerts — a single global call no longer makes sense.
export async function markAbsentees(dateInput, outletId) {
  const date = startOfDay(dateInput);

  const [alreadyMarked, activeEmployees] = await Promise.all([
    prisma.attendance.findMany({
      where: { date, outletId },
      select: { employeeId: true },
    }),
    prisma.employee.findMany({
      where: { status: "ACTIVE", outletId },
      select: { id: true },
    }),
  ]);

  const markedIds = new Set(alreadyMarked.map((a) => a.employeeId));
  const toMark = activeEmployees.filter((e) => !markedIds.has(e.id));

  if (toMark.length === 0) {
    return { date, marked: 0 };
  }

  await prisma.$transaction(
    toMark.map((e) =>
      prisma.attendance.create({
        data: { outletId, employeeId: e.id, date, status: "ABSENT" },
      }),
    ),
  );

  return { date, marked: toMark.length };
}