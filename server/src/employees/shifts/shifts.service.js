// server/src/employees/shifts/shifts.service.js
import prisma from "../../config/prisma.js";

export async function listShifts(outletId) {
  return prisma.shift.findMany({
    where: { outletId },
    include: { assignments: { select: { id: true, employeeId: true, date: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createShift(payload, outletId) {
  return prisma.shift.create({ data: { ...payload, outletId } });
}

export async function updateShift(id, payload, outletId) {
  const existing = await prisma.shift.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Shift not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.shift.update({ where: { id }, data: payload });
}

export async function deleteShift(id, outletId) {
  const existing = await prisma.shift.findFirst({ where: { id, outletId } });
  if (!existing) {
    const err = new Error("Shift not found");
    err.code = "P2025";
    throw err;
  }
  return prisma.shift.delete({ where: { id } });
}

export async function assignShift(shiftId, { employeeId, date }, outletId) {
  // FIX: previously trusted both shiftId and employeeId outright with no
  // ownership check — a stray id from another outlet could be assigned.
  const [shift, employee] = await Promise.all([
    prisma.shift.findFirst({ where: { id: shiftId, outletId } }),
    prisma.employee.findFirst({ where: { id: employeeId, outletId } }),
  ]);
  if (!shift) throw new Error("Shift not found");
  if (!employee) throw new Error("Employee not found");

  const assignDate = new Date(date);
  assignDate.setHours(0, 0, 0, 0);

  return prisma.shiftAssignment.upsert({
    where: { employeeId_date: { employeeId, date: assignDate } },
    create: { outletId, employeeId, shiftId, date: assignDate },
    update: { shiftId },
  });
}

export async function listAssignments({ date, shiftId }, outletId) {
  const where = {
    outletId,
    ...(shiftId ? { shiftId } : {}),
    ...(date
      ? {
          date: (() => {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            return d;
          })(),
        }
      : {}),
  };

  return prisma.shiftAssignment.findMany({
    where,
    include: {
      employee: { select: { fullName: true, employeeCode: true, designation: true } },
      shift: true,
    },
    orderBy: { date: "desc" },
  });
}