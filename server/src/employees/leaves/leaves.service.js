// server/src/employees/leaves/leaves.service.js
import prisma from "../../config/prisma.js";
import * as activityLogsService from "../activity-logs/activityLogs.service.js";

export async function listLeaves({ employeeId, status, page = 1, limit = 20 }, outletId) {
  const where = {
    outletId,
    ...(employeeId ? { employeeId } : {}),
    ...(status ? { status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.leaveRequest.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeCode: true } } },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.leaveRequest.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
}

const LEAVE_TYPES = new Set(["CASUAL", "SICK", "PAID", "EMERGENCY"]);

export async function createLeaveRequest(payload, outletId) {
  const { employeeId, type, fromDate, toDate, reason } = payload || {};

  // CHANGED: validate explicitly instead of handing req.body straight to
  // Prisma. A blank/invalid date input (e.g. a cleared <input type="date">)
  // or a stray/blank type value previously reached Prisma as-is and came
  // back as an opaque 400 with a raw Prisma error message. Fail fast here
  // with messages that actually explain what's wrong.
  if (!employeeId) {
    throw new Error("employeeId is required.");
  }
  if (!type || !LEAVE_TYPES.has(type)) {
    throw new Error(
      `A valid leave type is required (one of: ${[...LEAVE_TYPES].join(", ")}).`,
    );
  }

  const from = fromDate ? new Date(fromDate) : null;
  const to = toDate ? new Date(toDate) : null;
  if (!from || Number.isNaN(from.getTime())) {
    throw new Error("A valid 'from' date is required.");
  }
  if (!to || Number.isNaN(to.getTime())) {
    throw new Error("A valid 'to' date is required.");
  }
  if (to < from) {
    throw new Error("The 'to' date can't be before the 'from' date.");
  }

  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, outletId },
    select: { id: true, fullName: true },
  });
  if (!employee) {
    throw new Error("No employee found with that id.");
  }

  const leave = await prisma.leaveRequest.create({
    data: {
      outletId,
      employeeId,
      type,
      fromDate: from,
      toDate: to,
      reason: reason || null,
    },
  });

  // CHANGED: automatically record this in the employee's activity log —
  // previously nothing anywhere ever called logActivity, so the Activity
  // Log tab was always empty regardless of what actions took place.
  await activityLogsService.logActivity({
    employeeId,
    action: `Applied for ${type} leave (${from.toISOString().slice(0, 10)} to ${to
      .toISOString()
      .slice(0, 10)})`,
  }, outletId);

  return leave;
}

export async function decideLeaveRequest(id, { status, approvedById }, outletId) {
  // FIX: previously updated by id alone with no ownership check.
  const existing = await prisma.leaveRequest.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Leave request not found");
    err.code = "P2025";
    throw err;
  }

  // status: "APPROVED" | "REJECTED"
  const leave = await prisma.leaveRequest.update({
    where: { id },
    data: { status, approvedById },
  });

  if (status === "APPROVED") {
    // Reflect approved leave in the daily attendance rollup for each day in range
    const dates = [];
    const cursor = new Date(leave.fromDate);
    const end = new Date(leave.toDate);
    while (cursor <= end) {
      dates.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    await prisma.$transaction(
      dates.map((date) =>
        prisma.attendance.upsert({
          where: { employeeId_date: { employeeId: leave.employeeId, date } },
          create: { outletId, employeeId: leave.employeeId, date, status: "LEAVE" },
          update: { status: "LEAVE" },
        }),
      ),
    );
  }

  // CHANGED: auto-log the decision, same reasoning as createLeaveRequest above.
  await activityLogsService.logActivity({
    employeeId: leave.employeeId,
    action: `Leave request ${status === "APPROVED" ? "approved" : "rejected"} (${new Date(
      leave.fromDate,
    )
      .toISOString()
      .slice(0, 10)} to ${new Date(leave.toDate).toISOString().slice(0, 10)})`,
  }, outletId);

  return leave;
}