// src/pos/components/PosCustomerPanel.jsx
//
// Customer picker on the POS order ticket. Only rendered when Settings ->
// CRM is on (PosOrderScreen decides; this component assumes it's wanted).
//
// Staff type a mobile number or name, pick a match, or add a new customer
// without leaving the order. The picked customer's id goes onto the order,
// which is what makes their CRM stats update — nothing else needs syncing.
import { useEffect, useRef, useState } from "react";
import { FiSearch, FiUserPlus, FiX, FiUser, FiAlertTriangle, FiBookmark } from "react-icons/fi";
import { searchCustomers } from "../../crm/crmApi";
import CustomerFormModal from "../../crm/components/CustomerFormModal";
import { SegmentBadge, inr, relativeDays } from "../../crm/components/crmUI";

export default function PosCustomerPanel({
  customer,
  onSelect,
  required = false,
  showInsights = true,
  linking = false, // true while attaching to an already-placed order
  hint,
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const boxRef = useRef(null);

  // Debounced search
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError("");
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const t = setTimeout(() => {
      searchCustomers(q)
        .then((rows) => {
          if (!cancelled) {
            setResults(rows || []);
            setError("");
          }
        })
        .catch((err) => {
          if (!cancelled) {
            setResults([]);
            setError(navigator.onLine === false ? "Customer search needs an internet connection." : err.message);
          }
        })
        .finally(() => !cancelled && setSearching(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  // Close the dropdown on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function pick(c) {
    onSelect(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  }

  const digits = query.replace(/\D/g, "");
  const looksLikeMobile = digits.length >= 5 && digits.length === query.replace(/[\s+-]/g, "").length;

  // ── Selected ─────────────────────────────────────────────────────────
  if (customer) {
    const blocked = customer.status === "BLOCKED";
    return (
      <div className="mt-2.5 rounded-lg border border-[#E7EAE1] bg-[#F3F5EE]/60 p-2.5 dark:border-[#262B24] dark:bg-white/5">
        <div className="flex items-start gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#3FA34D]/10 text-[#3FA34D] dark:bg-[#43B75A]/10 dark:text-[#43B75A]">
            <FiUser size={14} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="truncate text-sm font-semibold text-[#1F2937] dark:text-white">{customer.name}</span>
              {customer.segment && <SegmentBadge segment={customer.segment} />}
            </div>
            <p className="font-mono text-[11px] text-[#6B7280] dark:text-[#9CA8A0]">{customer.mobile}</p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(null)}
            disabled={linking}
            className="rounded p-1 text-[#9CA3AF] hover:bg-white hover:text-red-500 disabled:opacity-40 dark:hover:bg-white/10"
            title="Remove customer from this order"
            aria-label="Remove customer"
          >
            <FiX size={14} />
          </button>
        </div>

        {blocked && (
          <p className="mt-2 flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <FiAlertTriangle size={11} /> This customer is marked as blocked.
          </p>
        )}

        {showInsights && (
          <>
            <dl className="mt-2 grid grid-cols-3 gap-x-2 gap-y-1 text-[11px]">
              <Stat label="Orders" value={customer.totalOrders ?? 0} />
              <Stat label="Spent" value={inr(customer.totalSpent)} />
              <Stat label="Avg bill" value={inr(customer.avgBill)} />
              <Stat label="Last visit" value={customer.lastVisitAt ? relativeDays(customer.lastVisitAt) : "First visit"} />
              <Stat label="Favourite" value={customer.favoriteItems?.[0]?.name || "—"} wide />
            </dl>
            {customer.outstanding > 0 && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                <FiAlertTriangle size={11} /> {inr(customer.outstanding, 2)} outstanding from earlier bills
              </p>
            )}
            {customer.latestNote && (
              <p className="mt-1.5 flex items-start gap-1 text-[11px] text-[#6B7280] dark:text-[#9CA8A0]">
                <FiBookmark size={11} className="mt-0.5 shrink-0" /> <span className="line-clamp-2">{customer.latestNote}</span>
              </p>
            )}
          </>
        )}
        {linking && <p className="mt-1.5 text-[11px] text-[#9CA3AF]">Saving to order…</p>}
      </div>
    );
  }

  // ── Search ───────────────────────────────────────────────────────────
  return (
    <div className="relative mt-2.5" ref={boxRef}>
      <label className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
        <span>Customer{required ? " *" : ""}</span>
        {hint && <span className="normal-case tracking-normal">{hint}</span>}
      </label>
      <div className="flex gap-1.5">
        <div className="relative min-w-0 flex-1">
          <FiSearch className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={12} />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="Mobile number or name"
            inputMode="search"
            className={`w-full rounded-lg border bg-white py-1.5 pl-7 pr-2 text-xs text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none dark:bg-[#262B24] dark:text-white ${
              required ? "border-amber-300 dark:border-amber-500/40" : "border-[#E7EAE1] dark:border-[#262B24]"
            } focus:border-[#3FA34D] dark:focus:border-[#43B75A]`}
          />
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-[#E7EAE1] px-2.5 py-1.5 text-xs font-semibold text-[#6B7280] hover:bg-[#F3F5EE] dark:border-[#262B24] dark:text-[#9CA8A0] dark:hover:bg-white/5"
          title="Add a new customer"
        >
          <FiUserPlus size={12} /> New
        </button>
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-[#E7EAE1] bg-white shadow-lg dark:border-[#262B24] dark:bg-[#1D231D]">
          {searching && <p className="px-3 py-2 text-xs text-[#9CA3AF]">Searching…</p>}
          {error && <p className="px-3 py-2 text-xs text-red-500">{error}</p>}
          {!searching && !error && results.length === 0 && (
            <p className="px-3 py-2 text-xs text-[#9CA3AF]">No customer found.</p>
          )}
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(c)}
              className="flex w-full items-center gap-2 border-b border-[#E7EAE1] px-3 py-2 text-left last:border-0 hover:bg-[#F3F5EE] dark:border-[#262B24] dark:hover:bg-white/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#1F2937] dark:text-white">{c.name}</p>
                <p className="font-mono text-[11px] text-[#6B7280] dark:text-[#9CA8A0]">{c.mobile}</p>
              </div>
              <div className="text-right text-[11px] text-[#6B7280] dark:text-[#9CA8A0]">
                <p>{c.totalOrders} orders</p>
                <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{inr(c.totalSpent)}</p>
              </div>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-left text-xs font-semibold text-[#3FA34D] hover:bg-[#F3F5EE] dark:text-[#43B75A] dark:hover:bg-white/5"
          >
            <FiUserPlus size={12} /> Add “{query.trim()}” as a new customer
          </button>
        </div>
      )}

      {adding && (
        <CustomerFormModal
          compact
          source="POS"
          initialMobile={looksLikeMobile ? query.trim() : ""}
          initialName={looksLikeMobile ? "" : query.trim()}
          onClose={() => setAdding(false)}
          onSaved={(c) => {
            setAdding(false);
            pick(c);
          }}
          onUseExisting={async (existing) => {
            // The mobile is already on file — load that customer's stats and use them.
            setAdding(false);
            try {
              const rows = await searchCustomers(existing.name);
              pick(rows.find((r) => r.id === existing.id) || { ...existing, totalOrders: 0 });
            } catch {
              pick({ ...existing, totalOrders: 0 });
            }
          }}
        />
      )}
    </div>
  );
}

function Stat({ label, value, wide }) {
  return (
    <div className={`min-w-0 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-[#9CA3AF] dark:text-[#6B7280]">{label}</dt>
      <dd className="truncate font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{value}</dd>
    </div>
  );
}