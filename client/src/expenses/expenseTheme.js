// client/src/expenses/expenseTheme.js
// ==============================================
// Shared design tokens for Expense Management.
// Same cream/charcoal + green system used by the Dashboard and
// Menu Management, so every module in the app reads as one product.
// ==============================================

export const ui = {
  page: "p-6 max-w-6xl mx-auto",

  card: "bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors",
  cardHover:
    "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 hover:border-[#3FA34D]/30 dark:hover:border-[#43B75A]/40 hover:-translate-y-0.5 transition-all duration-300",

  heading: "text-[#1F2937] dark:text-white",
  muted: "text-[#6B7280] dark:text-[#9CA8A0]",
  faint: "text-[#9CA3AF] dark:text-[#6B7280]",

  input:
    "w-full border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#0D110C] text-[#1F2937] dark:text-white rounded-xl px-3 py-2.5 text-sm placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#3FA34D]/40 dark:focus:ring-[#43B75A]/40 focus:border-[#3FA34D] dark:focus:border-[#43B75A] transition-colors",
  label: "mb-2 flex items-center gap-1.5 font-medium text-[#1F2937] dark:text-white",
  labelSm: "block text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0] mb-1.5",

  btnPrimary:
    "inline-flex items-center justify-center gap-2 bg-[#3FA34D] hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#39A34E] text-white font-semibold px-5 py-3 rounded-xl shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed",
  btnSecondary:
    "inline-flex items-center justify-center gap-2 border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] hover:bg-[#F3F5EE] dark:hover:bg-[#1E241C] text-[#1F2937] dark:text-white font-medium px-4 py-3 rounded-xl transition-colors disabled:opacity-50",
  btnCancel:
    "rounded-lg border border-[#E7EAE1] dark:border-[#262B24] px-5 py-2.5 font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-[#1E241C] transition-colors",
  linkEdit: "flex items-center gap-1.5 text-sm font-medium text-[#3FA34D] dark:text-[#43B75A] hover:opacity-80 transition-colors",
  linkDanger: "flex items-center gap-1.5 text-sm font-medium text-[#EF5350] hover:text-[#D9433E] transition-colors",

  errorBanner:
    "rounded-2xl bg-[#EF5350]/10 border border-[#EF5350]/20 text-[#EF5350] px-5 py-4 text-sm",

  pillActive: "border-[#3FA34D] bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 text-[#3FA34D] dark:text-[#43B75A]",
  pillInactive: "border-[#E7EAE1] dark:border-[#262B24] text-[#6B7280] dark:text-[#9CA8A0] hover:border-[#3FA34D]/30",

  badgeGreen: "bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 text-[#3FA34D] dark:text-[#43B75A]",
  badgeGray: "bg-[#F3F5EE] dark:bg-[#232A22] text-[#6B7280] dark:text-[#9CA8A0]",
  badgeAmber: "bg-[#FFA94D]/15 text-[#E8873A] dark:text-[#FFA94D]",
  badgeRed: "bg-[#EF5350]/10 text-[#EF5350]",
  badgeBlue: "bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 text-[#3FA34D] dark:text-[#43B75A]", // legacy "approved" tone folded into brand green

  modalOverlay: "fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-5",
  modalCard: "bg-white dark:bg-[#171C17] rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden transition-colors",
  modalHeader: "flex items-center justify-between border-b border-[#E7EAE1] dark:border-[#262B24] px-6 py-4 flex-shrink-0",
  modalFooter: "flex justify-end gap-3 border-t border-[#E7EAE1] dark:border-[#262B24] px-6 py-4 flex-shrink-0",
};

// Status/payment badge color maps shared across ExpenseTable, ExpenseDetails, etc.
export const STATUS_STYLES = {
  DRAFT: ui.badgeGray,
  PENDING_APPROVAL: ui.badgeAmber,
  APPROVED: ui.badgeGreen,
  REJECTED: ui.badgeRed,
  PAID: ui.badgeGreen,
};

export const STATUS_LABELS = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Waiting for Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PAID: "Paid",
};

export const PAYMENT_STYLES = {
  PAID: ui.badgeGreen,
  PARTIAL: ui.badgeAmber,
  OVERDUE: ui.badgeRed,
  UNPAID: ui.badgeGray,
};

export const formatMoney = (value = 0) =>
  `₹${Number(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
