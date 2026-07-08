// client/src/inventory/components/ui.jsx
import { useEffect } from "react";

export const PageHeader = ({ title, subtitle, action }) => (
  <div className="flex items-start justify-between gap-4 mb-6">
    <div>
      <h1 className="text-2xl font-semibold text-[var(--inv-ink)]">{title}</h1>
      {subtitle && <p className="text-sm text-[var(--inv-steel)] mt-1">{subtitle}</p>}
    </div>
    {action}
  </div>
);

export const Button = ({ variant = "primary", className = "", ...props }) => {
  const variants = {
    primary:
      "bg-[var(--inv-pine)] text-white hover:bg-[var(--inv-pine-dark)] focus-visible:outline-2",
    secondary:
      "bg-white text-[var(--inv-ink)] border border-[var(--inv-line)] hover:bg-[var(--inv-steel-light)]",
    danger: "bg-[var(--inv-rust)] text-white hover:opacity-90",
    ghost: "bg-transparent text-[var(--inv-steel)] hover:bg-[var(--inv-steel-light)]",
  };
  return (
    <button
      className={`px-3.5 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    />
  );
};

export const Card = ({ children, className = "" }) => (
  <div
    className={`bg-[var(--inv-paper-raised)] border border-[var(--inv-line)] rounded-lg ${className}`}
  >
    {children}
  </div>
);

export const StatCard = ({ label, value, tone = "neutral" }) => {
  const toneColor = {
    neutral: "text-[var(--inv-ink)]",
    warn: "text-[var(--inv-amber)]",
    bad: "text-[var(--inv-rust)]",
    good: "text-[var(--inv-pine)]",
  }[tone];
  return (
    <Card className="p-4">
      <p className="text-xs uppercase tracking-wide text-[var(--inv-steel)] mb-1">{label}</p>
      <p className={`text-2xl font-semibold inv-mono ${toneColor}`}>{value}</p>
    </Card>
  );
};

export const TicketPill = ({ tone = "neutral", children }) => (
  <span className={`ticket-pill ticket-pill--${tone}`}>{children}</span>
);

export const EmptyState = ({ title, hint }) => (
  <div className="text-center py-12 px-4">
    <p className="text-sm font-medium text-[var(--inv-ink)]">{title}</p>
    {hint && <p className="text-xs text-[var(--inv-steel)] mt-1">{hint}</p>}
  </div>
);

export const Table = ({ columns, children }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-[var(--inv-line)] text-left">
          {columns.map((c) => (
            <th
              key={c}
              className="px-4 py-2.5 font-medium text-xs uppercase tracking-wide text-[var(--inv-steel)] whitespace-nowrap"
            >
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--inv-line)]">{children}</tbody>
    </table>
  </div>
);

export const Field = ({ label, children, hint }) => (
  <label className="block">
    <span className="block text-xs font-medium text-[var(--inv-steel)] mb-1">{label}</span>
    {children}
    {hint && <span className="block text-xs text-[var(--inv-steel)] mt-1">{hint}</span>}
  </label>
);

const inputClass =
  "w-full px-3 py-2 rounded-md border border-[var(--inv-line)] bg-white text-sm focus-visible:outline-2 focus-visible:outline-[var(--inv-pine)]";

export const Input = (props) => <input className={inputClass} {...props} />;
export const Select = (props) => <select className={inputClass} {...props} />;
export const Textarea = (props) => <textarea className={inputClass} rows={3} {...props} />;

export const Modal = ({ open, title, onClose, children, wide = false }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-lg shadow-lg mt-12 mb-12 w-full ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--inv-line)]">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-[var(--inv-steel)] hover:text-[var(--inv-ink)] text-xl leading-none"
          >
            ×
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

export const ErrorBanner = ({ message }) => {
  if (!message) return null;
  return (
    <div className="mb-4 px-4 py-2.5 rounded-md bg-[var(--inv-rust-tint)] text-[var(--inv-rust)] text-sm">
      {message}
    </div>
  );
};