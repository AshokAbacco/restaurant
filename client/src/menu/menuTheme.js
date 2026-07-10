// client/src/menu/menuTheme.js
// ==============================================
// Shared design tokens for Menu Management.
// Mirrors the Dashboard's cream/charcoal + green theme so every
// menu screen looks like one product instead of a bolted-on section.
// ==============================================

export const ui = {
  // Layout
  card: "bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none transition-colors",
  cardHover:
    "hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/30 hover:border-[#3FA34D]/30 dark:hover:border-[#43B75A]/40 hover:-translate-y-0.5 transition-all duration-300",

  // Text
  heading: "text-[#1F2937] dark:text-white",
  muted: "text-[#6B7280] dark:text-[#9CA8A0]",
  faint: "text-[#9CA3AF] dark:text-[#6B7280]",

  // Form controls
  input:
    "w-full border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#0D110C] text-[#1F2937] dark:text-white rounded-xl px-3 py-2.5 text-sm placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280] focus:outline-none focus:ring-2 focus:ring-[#3FA34D]/40 dark:focus:ring-[#43B75A]/40 focus:border-[#3FA34D] dark:focus:border-[#43B75A] transition-colors disabled:bg-[#F3F5EE] dark:disabled:bg-[#1A1F19] disabled:text-[#9CA3AF]",
  inputSm:
    "border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#0D110C] text-[#1F2937] dark:text-white rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#3FA34D]/40 dark:focus:ring-[#43B75A]/40 transition-colors",
  label: "block text-sm font-medium text-[#1F2937] dark:text-white mb-1.5",
  sectionLabel:
    "text-xs font-semibold uppercase tracking-wider text-[#3FA34D] dark:text-[#43B75A] mb-3 mt-1",

  // Buttons
  btnPrimary:
    "inline-flex items-center justify-center gap-2 bg-[#3FA34D] hover:bg-[#358F42] dark:bg-[#43B75A] dark:hover:bg-[#39A34E] text-white font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-60 disabled:cursor-not-allowed",
  btnSecondary:
    "inline-flex items-center justify-center gap-2 border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] hover:bg-[#F3F5EE] dark:hover:bg-[#1E241C] text-[#1F2937] dark:text-white font-medium px-3.5 py-2 rounded-xl text-sm transition-colors disabled:opacity-60",
  btnCancel:
    "px-4 py-2 rounded-xl text-sm font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-[#1E241C] transition-colors disabled:opacity-60",
  btnDanger:
    "px-4 py-2 rounded-xl text-sm font-medium text-white bg-[#EF5350] hover:bg-[#D9433E] disabled:opacity-60 transition-colors",
  linkEdit:
    "text-xs font-medium text-[#3FA34D] dark:text-[#43B75A] hover:opacity-80 transition-colors",
  linkDanger:
    "text-xs font-medium text-[#EF5350] hover:text-[#D9433E] transition-colors",

  // Feedback
  errorBanner:
    "bg-[#EF5350]/10 text-[#EF5350] text-sm px-4 py-3 rounded-xl mb-4 border border-[#EF5350]/20",

  // Badges
  badgeGreen: "bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 text-[#3FA34D] dark:text-[#43B75A]",
  badgeGray: "bg-[#F3F5EE] dark:bg-[#232A22] text-[#6B7280] dark:text-[#9CA8A0]",
  badgeAmber: "bg-[#FFA94D]/15 text-[#E8873A] dark:text-[#FFA94D]",
  badgeRed: "bg-[#EF5350]/10 text-[#EF5350]",

  // Modal
  // NOTE: modalCard is a flex column with overflow-hidden (not sticky headers).
  // This is what keeps the rounded corners clean and the header/footer fully
  // visible even when the middle content scrolls — add max-h-[..vh] per usage
  // and put "overflow-y-auto flex-1" on the body div in between.
// Modal
  modalOverlay: "fixed inset-0 bg-black/50 backdrop-blur-[2px] flex items-center justify-center z-50 px-4",
  modalCard: "bg-white dark:bg-[#171C17] rounded-2xl shadow-2xl w-full flex flex-col overflow-hidden transition-colors",
  modalHeader:
    "px-6 py-4 border-b border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-between flex-shrink-0",
  modalFooter:
    "px-6 py-4 border-t border-[#E7EAE1] dark:border-[#262B24] flex justify-end gap-3 flex-shrink-0",
};


// Small helper for row list items (kitchen sections, add-ons, etc.)
export const rowItem =
  "flex items-center justify-between px-5 py-3.5 border-b border-[#E7EAE1] dark:border-[#262B24] last:border-b-0";
