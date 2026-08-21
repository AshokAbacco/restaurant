// server/src/employees/incentives/incentives.service.js
import prisma from "../../config/prisma.js";

export async function listIncentives({ employeeId, page = 1, limit = 20 }, outletId) {
  const where = { outletId, ...(employeeId ? { employeeId } : {}) };

  const [data, total] = await Promise.all([
    prisma.incentive.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeCode: true } } },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.incentive.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
}

export async function createIncentive(payload, outletId) {
  // FIX: previously trusted payload.employeeId outright with no ownership
  // check — a stray id from another outlet could have an incentive
  // recorded against it.
  const employee = await prisma.employee.findFirst({
    where: { id: payload.employeeId, outletId },
  });
  if (!employee) throw new Error("Employee not found");

  return prisma.incentive.create({ data: { ...payload, outletId } });
}