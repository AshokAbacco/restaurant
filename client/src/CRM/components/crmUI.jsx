// src/crm/components/crmUI.jsx
//
// Small shared pieces for the CRM screens. Colours, radii and borders are
// the ones used across the app (see billing/DuePayments.jsx, PageHeader):
// #F3F5EE page, white/#171C17 cards, #E7EAE1/#262B24 borders, #3FA34D
// green primary.
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FiX, FiUsers, FiSettings } from "react-icons/fi";

// Roles that can manage CRM configuration, groups and deletions.
export const CRM_MANAGER_ROLES = ["OWNER", "ADMIN", "MANAGER"];

// ── Formatting ──────────────────────────────────────────────────────────
export const inr = (n, digits = 0) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;

export const fmtDate = (d, opts = { day: "numeric", month: "short", year: "numeric" }) =>
  d ? new Date(d).toLocaleDateString("en-IN", opts) : "—";

export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
    : "—";

// Birthdays/anniversaries arrive as "YYYY-MM-DD". Parsed by hand so the
// browser's timezone can never move them a day.
export const fmtDay = (ymd, withYear = false) => {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-IN", withYear ? { day: "numeric", month: "short", year: "numeric" } : { day: "numeric", month: "short" });
};

export const relativeDays = (d) => {
  if (!d) return "Never";
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  if (days < 365) return `${Math.floor(days / 30)} mo ago`;
  return `${Math.floor(days / 365)} yr ago`;
};

export const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

export const ORDER_TYPE_LABEL = { DINE_IN: "Dine in", TAKEAWAY: "Takeaway", DELIVERY: "Delivery" };

// ── Class strings ───────────────────────────────────────────────────────
export const inputClass =
  "w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] px-3 py-2 text-sm text-[#1F2937] dark:text-[#E4E9E2] placeholder:text-[#9CA3AF] dark:[color-scheme:dark] outline-none focus:border-[#3FA34D] dark:focus:border-[#43B75A]";

export const labelClass =
  "mb-1 block text-xs font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]";

export const cardClass =
  "rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17]";

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#3FA34D] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#358F42] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] px-4 py-2 text-sm font-semibold text-[#1F2937] dark:text-[#E4E9E2] transition-colors hover:bg-[#F3F5EE] dark:hover:bg-white/5 disabled:opacity-60";

export const chipClass = (active) =>
  `rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
    active
      ? "border-[#3FA34D] bg-[#3FA34D] text-white dark:border-[#43B75A] dark:bg-[#43B75A]"
      : "border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
  }`;

// ── Badges ──────────────────────────────────────────────────────────────
export const SEGMENTS = {
  vip: { label: "VIP", cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30" },
  regular: { label: "Regular", cls: "bg-[#EAF6EC] text-[#2F7D3A] border-[#C9E7CF] dark:bg-[#43B75A]/10 dark:text-[#43B75A] dark:border-[#43B75A]/30" },
  new: { label: "New", cls: "bg-[#E8F4FB] text-[#1B6E9C] border-[#CBE5F4] dark:bg-[#4AA8E0]/10 dark:text-[#6FC0EA] dark:border-[#4AA8E0]/30" },
  at_risk: { label: "At risk", cls: "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/30" },
  no_orders: { label: "No orders yet", cls: "bg-[#F3F5EE] text-[#6B7280] border-[#E7EAE1] dark:bg-white/5 dark:text-[#9CA8A0] dark:border-[#262B24]" },
};

export function SegmentBadge({ segment }) {
  const s = SEGMENTS[segment] || SEGMENTS.no_orders;
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold ${s.cls}`}>{s.label}</span>;
}

const STATUS_STYLES = {
  ACTIVE: "bg-[#EAF6EC] text-[#2F7D3A] dark:bg-[#43B75A]/10 dark:text-[#43B75A]",
  INACTIVE: "bg-[#F3F5EE] text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]",
  BLOCKED: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
};

export function StatusBadge({ status }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_STYLES[status] || STATUS_STYLES.INACTIVE}`}>
      {status ? status.charAt(0) + status.slice(1).toLowerCase() : "—"}
    </span>
  );
}

export function TagChip({ tag, onRemove }) {
  const color = tag.color || "#3FA34D";
  return (
    <span
      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, borderColor: `${color}55`, backgroundColor: `${color}14` }}
    >
      {tag.name}
      {onRemove && (
        <button type="button" onClick={onRemove} className="opacity-70 hover:opacity-100" aria-label={`Remove ${tag.name}`}>
          <FiX size={11} />
        </button>
      )}
    </span>
  );
}

export function Avatar({ name, size = "h-10 w-10 text-sm" }) {
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full bg-[#3FA34D]/10 font-bold text-[#3FA34D] dark:bg-[#43B75A]/10 dark:text-[#43B75A] ${size}`}>
      {initials(name)}
    </div>
  );
}

// ── Layout pieces ───────────────────────────────────────────────────────
export function StatCard({ label, value, hint, accent = "text-[#1F2937] dark:text-white" }) {
  return (
    <div className={`${cardClass} p-4`}>
      <p className="text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0]">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold ${accent}`}>{value}</p>
      {hint && <p className="mt-0.5 text-xs text-[#9CA3AF] dark:text-[#6B7280]">{hint}</p>}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <p className="rounded-lg border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-[#EF5350] dark:text-red-400">
      {children}
    </p>
  );
}

export function EmptyState({ children, action }) {
  return (
    <div className="rounded-xl border border-dashed border-[#D5DAD0] dark:border-[#2E342C] bg-white dark:bg-[#171C17] p-8 text-center text-sm text-[#9CA3AF] dark:text-[#6B7280]">
      <p>{children}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer, width = "max-w-lg" }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/40 dark:bg-black/60 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div role="dialog" aria-modal="true" className={`flex max-h-[92vh] w-full ${width} flex-col rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] shadow-xl`}>
        <div className="flex items-center justify-between border-b border-[#E7EAE1] dark:border-[#262B24] px-5 py-4">
          <h3 className="text-lg font-bold text-[#1F2937] dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#6B7280] dark:text-[#6B7280] dark:hover:text-[#9CA8A0]" aria-label="Close">
            <FiX size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[#E7EAE1] dark:border-[#262B24] px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

// Shown on every CRM page when Settings -> CRM is off.
export function CrmDisabledState({ canManage }) {
  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#12160F] p-6">
      <div className={`mx-auto mt-10 max-w-lg ${cardClass} p-8 text-center`}>
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3FA34D]/10 text-2xl text-[#3FA34D] dark:bg-[#43B75A]/10 dark:text-[#43B75A]">
          <FiUsers />
        </div>
        <h1 className="mt-4 text-xl font-bold text-[#1F2937] dark:text-white">CRM is turned off</h1>
        <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
          Turn on CRM to keep customer profiles, see purchase history, and pick customers while taking orders on the POS.
        </p>
        {canManage ? (
          <Link to="/settings/crm" className={`${btnPrimary} mt-6`}>
            <FiSettings /> Open CRM settings
          </Link>
        ) : (
          <p className="mt-6 text-sm text-[#9CA3AF] dark:text-[#6B7280]">Ask your manager to turn it on in Settings → CRM.</p>
        )}
      </div>
    </div>
  );
}

// Page shell used by all CRM pages.
export function CrmPage({ title, subtitle, actions, children, tabs }) {
  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#12160F] p-4 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white">{title}</h1>
            {subtitle && <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
        {tabs}
        {children}
      </div>
    </div>
  );
}