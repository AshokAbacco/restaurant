// server/src/employees/activity-logs/activityLogs.service.js
import prisma from "../../config/prisma.js";

// Called internally from other modules (e.g. after order creation, inventory
// update) to record an auditable employee action. Not just an HTTP-triggered
// write — see attendance.service.js's checkIn/checkOut for internal callers.
// ActivityLog itself has no outletId column (child row — scope comes from
// its parent Employee, same pattern as AttendanceLog), but every internal
// caller is required to pass outletId so this function can verify the
// employeeId it's logging against actually belongs to that outlet before
// writing — a defensive check worth keeping here specifically, since a
// caller passing the wrong employeeId/outletId pairing would otherwise
// silently attribute an action to someone at a different outlet entirely.
export async function logActivity({ employeeId, action, ipAddress, device }, outletId) {
  if (outletId) {
    const employee = await prisma.employee.findFirst({
      where: { id: employeeId, outletId },
      select: { id: true },
    });
    if (!employee) {
      throw new Error("Employee not found");
    }
  }
  return prisma.activityLog.create({
    data: { employeeId, action, ipAddress, device },
  });
}

export async function listActivityLogs({ employeeId, from, to, page = 1, limit = 50 }, outletId) {
  const where = {
    employee: { outletId },
    ...(employeeId ? { employeeId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeCode: true } } },
      orderBy: { createdAt: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.activityLog.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
}