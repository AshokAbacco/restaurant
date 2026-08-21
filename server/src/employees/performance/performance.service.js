// server/src/employees/performance/performance.service.js
import prisma from "../../config/prisma.js";

export async function listPerformance({ employeeId, period }, outletId) {
  return prisma.performanceRecord.findMany({
    where: {
      outletId,
      ...(employeeId ? { employeeId } : {}),
      ...(period ? { period } : {}),
    },
    include: { employee: { select: { fullName: true, employeeCode: true } } },
    orderBy: { period: "desc" },
  });
}

export async function upsertPerformance(payload, outletId) {
  const { employeeId, period, ...metrics } = payload;

  // FIX: previously trusted employeeId outright with no ownership check.
  const employee = await prisma.employee.findFirst({
    where: { id: employeeId, outletId },
  });
  if (!employee) throw new Error("Employee not found");

  return prisma.performanceRecord.upsert({
    where: { employeeId_period: { employeeId, period } },
    create: { outletId, employeeId, period, ...metrics },
    update: metrics,
  });
}