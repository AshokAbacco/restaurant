// ==============================================
// client/src/platform/ui.jsx
// Small UI kit + helpers for the platform admin. Light, dense, data-first.
// Accent follows the product green (#3FA34D).
// ==============================================

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { FiX, FiChevronLeft, FiChevronRight, FiInbox, FiLoader } from "react-icons/fi";

export const cx = (...c) => c.filter(Boolean).join(" ");

// ---------- formatters ----------
export const inr = (n, { compact = false } = {}) => {
  const v = Number(n || 0);
  if (compact && Math.abs(v) >= 100000) {
    if (Math.abs(v) >= 10000000) return `₹${(v / 10000000).toFixed(2)}Cr`;
    return `₹${(v / 100000).toFixed(2)}L`;
  }
  return `₹${Math.round(v).toLocaleString("en-IN")}`;
};
export const num = (n) => Number(n || 0).toLocaleString("en-IN");
export const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (d) =>
  d
    ? new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";
export const ago = (d) => {
  if (!d) return "never";
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 0) {
    const f = -s;
    if (f < 3600) return `in ${Math.ceil(f / 60)}m`;
    if (f < 86400) return `in ${Math.ceil(f / 3600)}h`;
    return `in ${Math.ceil(f / 86400)}d`;
  }
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(d);
};
export const toInputDate = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
export const titleCase = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
export const duration = (sec) => {
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
};
export const minutes = (m) => {
  const v = Number(m || 0);
  if (v < 60) return `${v}m`;
  return `${Math.floor(v / 60)}h ${v % 60}m`;
};

// ---------- data hook ----------
export function useApi(fn, deps = [], { interval } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const d = await fnRef.current();
      setData(d);
      setError(null);
      return d;
    } catch (e) {
      setError(e);
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!interval) return undefined;
    const t = setInterval(() => load({ silent: true }), interval);
    return () => clearInterval(t);
  }, [interval, load]);

  return { data, error, loading, reload: load, setData };
}

// ---------- primitives ----------
export function Spinner({ className = "" }) {
  return <FiLoader className={cx("animate-spin text-[#3FA34D]", className)} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F6F7F4]">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function Loading({ label = "Loading…" }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <span>{error.message || String(error)}</span>
      {onRetry && (
        <button onClick={() => onRetry()} className="font-semibold underline">
          Retry
        </button>
      )}
    </div>
  );
}

export function Card({ children, className = "", title, action, subtitle, bodyClass = "p-5" }) {
  return (
    <div className={cx("rounded-2xl border border-[#E7EAE1] bg-white", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3 border-b border-[#EEF0EA] px-5 py-3.5">
          <div>
            {title && <h3 className="text-sm font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={bodyClass}>{children}</div>
    </div>
  );
}

export function Stat({ label, value, sub, icon: Icon, tone = "green", to, trend }) {
  const tones = {
    green: "bg-emerald-50 text-emerald-600",
    blue: "bg-sky-50 text-sky-600",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-rose-50 text-rose-600",
    violet: "bg-violet-50 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
  };
  const body = (
    <div className="flex h-full items-start justify-between gap-3 rounded-2xl border border-[#E7EAE1] bg-white p-4 transition hover:border-[#3FA34D]/40">
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        {(sub || trend !== undefined) && (
          <p className="mt-1 text-xs text-slate-500">
            {trend !== undefined && trend !== null && (
              <span className={cx("mr-1 font-semibold", trend >= 0 ? "text-emerald-600" : "text-rose-600")}>
                {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}%
              </span>
            )}
            {sub}
          </p>
        )}
      </div>
      {Icon && (
        <div className={cx("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      )}
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

const BADGE_TONES = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  blue: "bg-sky-50 text-sky-700 ring-sky-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-rose-50 text-rose-700 ring-rose-200",
  violet: "bg-violet-50 text-violet-700 ring-violet-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

export function Badge({ children, tone = "slate", className = "" }) {
  return (
    <span className={cx("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", BADGE_TONES[tone], className)}>
      {children}
    </span>
  );
}

const STATUS_TONE = {
  ACTIVE: "green",
  TRIAL: "blue",
  EXPIRING: "amber",
  EXPIRED: "red",
  TRIAL_EXPIRED: "red",
  SUSPENDED: "slate",
  OPEN: "blue",
  PENDING: "amber",
  RESOLVED: "green",
  CLOSED: "slate",
  IN_PROGRESS: "violet",
  DONE: "green",
  CANCELLED: "slate",
  PAID: "green",
  CREATED: "amber",
  FAILED: "red",
  VERIFICATION_FAILED: "red",
  NEW: "blue",
  CONTACTED: "violet",
  QUALIFIED: "amber",
  CONVERTED: "green",
  LOW: "slate",
  NORMAL: "blue",
  HIGH: "amber",
  URGENT: "red",
  CHURN_RISK: "red",
  INACTIVE: "amber",
  critical: "red",
  warning: "amber",
  info: "blue",
  healthy: "green",
  degraded: "amber",
  down: "red",
};

const STATUS_LABEL = { TRIAL_EXPIRED: "Trial expired", CHURN_RISK: "Churn risk", IN_PROGRESS: "In progress", VERIFICATION_FAILED: "Verify failed" };

export function StatusBadge({ status }) {
  if (!status) return null;
  return <Badge tone={STATUS_TONE[status] || "slate"}>{STATUS_LABEL[status] || titleCase(status)}</Badge>;
}

export function Button({ children, variant = "primary", size = "md", className = "", loading, icon: Icon, ...props }) {
  const variants = {
    primary: "bg-[#3FA34D] text-white hover:bg-[#368F42] shadow-sm",
    secondary: "border border-[#E2E6DC] bg-white text-slate-700 hover:bg-[#F3F5EE]",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    dangerSoft: "border border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
    dark: "bg-slate-900 text-white hover:bg-slate-800",
  };
  const sizes = { sm: "h-8 px-3 text-xs", md: "h-9 px-3.5 text-sm", lg: "h-11 px-5 text-sm" };
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading ? <Spinner className="h-4 w-4 text-current" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
}

const fieldCls =
  "w-full rounded-xl border border-[#E2E6DC] bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#3FA34D] focus:ring-2 focus:ring-[#3FA34D]/15 disabled:bg-slate-50";

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={cx("block", className)}>
      {label && <span className="mb-1 block text-xs font-semibold text-slate-600">{label}</span>}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

// A width utility passed in className replaces the default w-full (two
// width classes of equal specificity would otherwise fight).
const withWidth = (className) => (/(^|\s)!?(max-)?w-/.test(className) && !/max-w-/.test(className) ? fieldCls.replace("w-full ", "") : fieldCls);

export const Input = ({ className = "", ...p }) => <input {...p} className={cx(withWidth(className), className)} />;
export const Textarea = ({ className = "", ...p }) => <textarea {...p} className={cx(fieldCls, "min-h-[90px]", className)} />;
export function Select({ options = [], className = "", placeholder, ...p }) {
  return (
    <select {...p} className={cx(withWidth(className), "pr-8", className)}>
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((o) =>
        typeof o === "string" ? (
          <option key={o} value={o}>
            {titleCase(o)}
          </option>
        ) : (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ),
      )}
    </select>
  );
}

export function Toggle({ checked, onChange, label, description, disabled }) {
  return (
    <label className={cx("flex items-start justify-between gap-4", disabled && "opacity-50")}>
      <span>
        {label && <span className="block text-sm font-medium text-slate-800">{label}</span>}
        {description && <span className="block text-xs text-slate-500">{description}</span>}
      </span>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-[#3FA34D]" : "bg-slate-300")}
      >
        <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-[22px]" : "left-0.5")} />
      </button>
    </label>
  );
}

export function SearchInput({ value, onChange, placeholder = "Search…", className = "" }) {
  const [v, setV] = useState(value || "");
  useEffect(() => setV(value || ""), [value]);
  useEffect(() => {
    const t = setTimeout(() => {
      if (v !== (value || "")) onChange(v);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);
  return <Input value={v} onChange={(e) => setV(e.target.value)} placeholder={placeholder} className={cx("max-w-xs", className)} />;
}

export function Tabs({ tabs, value, onChange, className = "" }) {
  return (
    <div className={cx("flex flex-wrap gap-1 rounded-xl bg-[#EEF0EA] p-1", className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
            value === t.value ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800",
          )}
        >
          {t.label}
          {t.count !== undefined && t.count !== null && (
            <span className={cx("rounded-full px-1.5 text-[10px]", value === t.value ? "bg-[#3FA34D] text-white" : "bg-white/70 text-slate-600")}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, back }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {back && (
          <Link to={back} className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800">
            <FiChevronLeft /> Back
          </Link>
        )}
        <h1 className="truncate text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Empty({ title = "Nothing here yet", text, icon: Icon = FiInbox, action }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3F5EE] text-slate-400">
        <Icon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {text && <p className="mt-1 max-w-sm text-xs text-slate-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/**
 * columns: [{ key, label, render?(row), className?, align? }]
 */
export function Table({ columns, rows, onRowClick, empty, rowKey = "id", dense }) {
  if (!rows?.length) return empty || <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[#EEF0EA] text-[11px] uppercase tracking-wide text-slate-400">
            {columns.map((c) => (
              <th key={c.key} className={cx("whitespace-nowrap px-4 py-2.5 font-semibold", c.align === "right" && "text-right", c.headClass)}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r[rowKey] ?? i}
              onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cx("border-b border-[#F2F4EF] last:border-0", onRowClick && "cursor-pointer hover:bg-[#F8FAF5]")}
            >
              {columns.map((c) => (
                <td key={c.key} className={cx("px-4 align-middle text-slate-700", dense ? "py-2" : "py-3", c.align === "right" && "text-right", c.className)}>
                  {c.render ? c.render(r) : r[c.key] ?? "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ page, pageSize, total, onChange }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-[#EEF0EA] px-4 py-3 text-xs text-slate-500">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {num(total)}
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)} icon={FiChevronLeft} />
        <span className="px-2">
          {page} / {pages}
        </span>
        <Button size="sm" variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)} icon={FiChevronRight} />
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, footer, size = "md" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const widths = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        className={cx("flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl", widths[size])}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#EEF0EA] px-5 py-3.5">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <FiX />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[#EEF0EA] px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, width = "max-w-xl", footer }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-900/30" onMouseDown={onClose}>
      <div className={cx("flex h-full w-full flex-col bg-white shadow-2xl", width)} onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[#EEF0EA] px-5 py-3.5">
          <h3 className="truncate text-base font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <FiX />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[#EEF0EA] px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function KeyValue({ items, cols = 2 }) {
  return (
    <dl className={cx("grid gap-x-6 gap-y-3", cols === 3 ? "sm:grid-cols-3" : cols === 1 ? "" : "sm:grid-cols-2")}>
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k} className="min-w-0">
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{k}</dt>
          <dd className="mt-0.5 break-words text-sm text-slate-800">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProgressBar({ value, max = 100, tone = "green" }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  const colors = { green: "bg-[#3FA34D]", amber: "bg-amber-500", red: "bg-rose-500", blue: "bg-sky-500" };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={cx("h-full rounded-full", colors[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

export const CHART_COLORS = ["#3FA34D", "#0EA5E9", "#F59E0B", "#8B5CF6", "#EF4444", "#14B8A6", "#64748B", "#EC4899"];

export function Avatar({ name, size = "h-8 w-8 text-xs" }) {
  const initials = String(name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div className={cx("flex shrink-0 items-center justify-center rounded-full bg-[#3FA34D]/10 font-bold text-[#2F7D3A]", size)}>{initials}</div>
  );
}
