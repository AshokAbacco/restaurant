// server/src/employees/payroll/payroll.service.js
import prisma from "../../config/prisma.js";

export async function listPayroll({ employeeId, month, status, page = 1, limit = 20 }, outletId) {
  const where = {
    outletId,
    ...(employeeId ? { employeeId } : {}),
    ...(month ? { month } : {}),
    ...(status ? { status } : {}),
  };

  const [data, total] = await Promise.all([
    prisma.payrollRecord.findMany({
      where,
      include: { employee: { select: { fullName: true, employeeCode: true } }, salaryExpense: true },
      orderBy: { month: "desc" },
      skip: (Number(page) - 1) * Number(limit),
      take: Number(limit),
    }),
    prisma.payrollRecord.count({ where }),
  ]);

  return { data, total, page: Number(page), limit: Number(limit) };
}

export async function generatePayroll(payload, outletId) {
  const { employeeId, month, basicSalary, allowances = 0, bonus = 0, overtimePay = 0, deductions = 0 } = payload;

  // FIX: previously trusted employeeId outright with no ownership check —
  // a stray id from another outlet could have payroll generated against it.
  const employee = await prisma.employee.findFirst({ where: { id: employeeId, outletId } });
  if (!employee) throw new Error("Employee not found");

  const netSalary = Number(basicSalary) + Number(allowances) + Number(bonus) + Number(overtimePay) - Number(deductions);

  return prisma.payrollRecord.upsert({
    where: { employeeId_month: { employeeId, month } },
    create: { outletId, employeeId, month, basicSalary, allowances, bonus, overtimePay, deductions, netSalary },
    update: { basicSalary, allowances, bonus, overtimePay, deductions, netSalary },
  });
}

// Marks a payroll record as paid and creates the linked accounting-side SalaryExpense row
export async function markAsPaid(id, outletId) {
  const payroll = await prisma.payrollRecord.findFirst({
    where: { id, outletId },
    include: { employee: true },
  });
  if (!payroll) throw new Error("Payroll record not found");
  if (payroll.salaryExpenseId) throw new Error("Payroll already marked as paid");

  const salaryExpense = await prisma.salaryExpense.create({
    data: {
      outletId,
      employeeName: payroll.employee.fullName,
      employeeId: payroll.employeeId,
      salaryMonth: new Date(`${payroll.month}-01`),
      baseSalary: payroll.basicSalary,
      bonus: payroll.bonus,
      incentives: 0,
      overtime: payroll.overtimePay,
      deductions: payroll.deductions,
      netSalary: payroll.netSalary,
      paymentStatus: "PAID",
      paymentDate: new Date(),
    },
  });

  return prisma.payrollRecord.update({
    where: { id },
    data: { status: "PAID", salaryExpenseId: salaryExpense.id },
    include: { salaryExpense: true },
  });
}