// src/crm/pages/CustomerList.jsx
//
// All customers in one place. Filters, search, sort and page live in the
// URL, so the overview's "View all VIPs" style links land pre-filtered and
// the browser back button returns to the same page of results.
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiSearch, FiPlus, FiFilter, FiEye, FiEdit2, FiClock, FiX, FiChevronLeft, FiChevronRight, FiRefreshCw } from "react-icons/fi";
import { listCustomers, listTags } from "../crmApi";
import CrmTabs from "../components/CrmTabs";
import CustomerFormModal from "../components/CustomerFormModal";
import {
  CrmPage, SegmentBadge, StatusBadge, TagChip, ErrorNote, EmptyState, SEGMENTS,
  inr, fmtDate, fmtDay, relativeDays, cardClass, inputClass, labelClass, btnPrimary, btnSecondary, chipClass,
} from "../components/crmUI";

const FILTER_KEYS = ["segment", "tagId", "status", "hasDues", "minSpent", "maxSpent", "minOrders", "lastVisitFrom", "lastVisitTo", "occasion"];

const SORT_OPTIONS = [
  ["lastVisitAt", "Last visit"],
  ["totalSpent", "Total spent"],
  ["totalOrders", "Orders"],
  ["avgBill", "Average bill"],
  ["outstanding", "Outstanding"],
  ["name", "Name"],
  ["createdAt", "Date added"],
];

export default function CustomerList() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [tags, setTags] = useState([]);
  const [result, setResult] = useState({ data: [], total: 0, page: 1, limit: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(params.get("search") || "");
  const [showFilters, setShowFilters] = useState(() => FILTER_KEYS.some((k) => k !== "segment" && params.get(k)));
  const [editing, setEditing] = useState(null); // customer | "new" | null
  const [reloadKey, setReloadKey] = useState(0);

  const query = useMemo(() => Object.fromEntries(params.entries()), [params]);
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);

  function update(changes, { resetPage = true } = {}) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "" || v === false) next.delete(k);
      else next.set(k, String(v));
    });
    if (resetPage) next.delete("page");
    setParams(next, { replace: true });
  }

  // Debounced search box -> URL
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("search") || "") !== search.trim()) update({ search: search.trim() });
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    listTags().then(setTags).catch(() => setTags([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    listCustomers({ ...query, sortBy: query.sortBy || "lastVisitAt", sortDir: query.sortDir || "desc", page, limit })
      .then((r) => !cancelled && setResult(r))
      .catch((err) => !cancelled && setError(err.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [query, page, limit, reloadKey]);

  const activeFilterCount = FILTER_KEYS.filter((k) => query[k]).length;
  const totalPages = Math.max(1, Math.ceil(result.total / limit));
  const from = result.total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(result.total, page * limit);

  return (
    <CrmPage
      title="Customers"
      subtitle="Every customer, with their visits, spend and favourites — updated from the POS automatically."
      tabs={<CrmTabs />}
      actions={
        <>
          <button onClick={() => setReloadKey((k) => k + 1)} className={btnSecondary} disabled={loading}>
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setEditing("new")} className={btnPrimary}>
            <FiPlus /> Add customer
          </button>
        </>
      }
    >
      {/* Search + quick segments */}
      <div className={`${cardClass} mb-4 p-4`}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile number or email"
              className={`${inputClass} pl-9`}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={query.sortBy || "lastVisitAt"}
              onChange={(e) => update({ sortBy: e.target.value })}
              className={`${inputClass} w-auto`}
              aria-label="Sort by"
            >
              {SORT_OPTIONS.map(([v, l]) => (
                <option key={v} value={v}>Sort: {l}</option>
              ))}
            </select>
            <button
              onClick={() => update({ sortDir: (query.sortDir || "desc") === "desc" ? "asc" : "desc" })}
              className={btnSecondary}
              title="Change sort direction"
            >
              {(query.sortDir || "desc") === "desc" ? "High → low" : "Low → high"}
            </button>
            <button onClick={() => setShowFilters((v) => !v)} className={btnSecondary}>
              <FiFilter /> Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={() => update({ segment: "" })} className={chipClass(!query.segment)}>All</button>
          {Object.entries(SEGMENTS).map(([k, s]) => (
            <button key={k} onClick={() => update({ segment: k })} className={chipClass(query.segment === k)}>
              {s.label}
            </button>
          ))}
          <button onClick={() => update({ hasDues: query.hasDues ? "" : "true" })} className={chipClass(!!query.hasDues)}>
            Has outstanding
          </button>
          <button onClick={() => update({ occasion: query.occasion === "birthday_month" ? "" : "birthday_month" })} className={chipClass(query.occasion === "birthday_month")}>
            Birthday this month
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-[#E7EAE1] pt-4 dark:border-[#262B24] sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className={labelClass}>Group / tag</label>
              <select value={query.tagId || ""} onChange={(e) => update({ tagId: e.target.value })} className={inputClass}>
                <option value="">Any group</option>
                {tags.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={query.status || ""} onChange={(e) => update({ status: e.target.value })} className={inputClass}>
                <option value="">Any status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="BLOCKED">Blocked</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Occasion</label>
              <select value={query.occasion || ""} onChange={(e) => update({ occasion: e.target.value })} className={inputClass}>
                <option value="">Any</option>
                <option value="upcoming">Birthday/anniversary coming up</option>
                <option value="birthday_month">Birthday this month</option>
                <option value="anniversary_month">Anniversary this month</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Minimum orders</label>
              <input type="number" min="0" value={query.minOrders || ""} onChange={(e) => update({ minOrders: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Spent from (₹)</label>
              <input type="number" min="0" value={query.minSpent || ""} onChange={(e) => update({ minSpent: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Spent up to (₹)</label>
              <input type="number" min="0" value={query.maxSpent || ""} onChange={(e) => update({ maxSpent: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last visit from</label>
              <input type="date" value={query.lastVisitFrom || ""} onChange={(e) => update({ lastVisitFrom: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Last visit to</label>
              <input type="date" value={query.lastVisitTo || ""} onChange={(e) => update({ lastVisitTo: e.target.value })} className={inputClass} />
            </div>
            {activeFilterCount > 0 && (
              <div className="sm:col-span-2 lg:col-span-4">
                <button
                  onClick={() => update(Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])))}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-red-500 hover:underline"
                >
                  <FiX /> Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <ErrorNote>{error}</ErrorNote>

      {/* Table */}
      <div className={`${cardClass} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1500px] text-left text-sm">
            <thead className="bg-[#F3F5EE] text-xs font-semibold uppercase tracking-wide text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]">
              <tr>
                {["Customer", "Mobile", "Email", "Address", "Orders", "Total spent", "Avg bill", "Last visit", "Favourite items", "Birthday / Anniv.", "Notes", "Status", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {result.data.map((c) => (
                <tr key={c.id} className="align-top hover:bg-[#F3F5EE]/60 dark:hover:bg-white/[0.03]">
                  <td className="px-3 py-3">
                    <button onClick={() => navigate(`/crm/customers/${c.id}`)} className="text-left">
                      <span className="block font-semibold text-[#1F2937] hover:underline dark:text-white">{c.name}</span>
                      <span className="mt-1 inline-block"><SegmentBadge segment={c.segment} /></span>
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-[#1F2937] dark:text-[#E4E9E2]">{c.mobile}</td>
                  <td className="max-w-[180px] truncate px-3 py-3 text-[#6B7280] dark:text-[#9CA8A0]" title={c.email || ""}>{c.email || "—"}</td>
                  <td className="max-w-[200px] px-3 py-3 text-[#6B7280] dark:text-[#9CA8A0]">
                    <span className="line-clamp-2" title={c.address || ""}>{[c.address, c.city].filter(Boolean).join(", ") || "—"}</span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-[#1F2937] dark:text-white">{c.totalOrders}</td>
                  <td className="whitespace-nowrap px-3 py-3 font-semibold text-[#1F2937] dark:text-white">{inr(c.totalSpent)}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-[#1F2937] dark:text-[#E4E9E2]">{inr(c.avgBill)}</td>
                  <td className="whitespace-nowrap px-3 py-3">
                    <span className="block text-[#1F2937] dark:text-[#E4E9E2]">{c.lastVisitAt ? fmtDate(c.lastVisitAt) : "—"}</span>
                    {c.lastVisitAt && <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">{relativeDays(c.lastVisitAt)}</span>}
                  </td>
                  <td className="max-w-[200px] px-3 py-3 text-[#6B7280] dark:text-[#9CA8A0]">
                    {c.favoriteItems?.length ? c.favoriteItems.map((f) => `${f.name} (${f.quantity})`).join(", ") : "—"}
                  </td>
                 
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-[#6B7280] dark:text-[#9CA8A0]">
                    <span className="block">🎂 {fmtDay(c.birthday)}</span>
                    <span className="block">💍 {fmtDay(c.anniversary)}</span>
                  </td>
                  <td className="max-w-[200px] px-3 py-3 text-xs text-[#6B7280] dark:text-[#9CA8A0]">
                    <span className="line-clamp-2" title={c.latestNote || ""}>{c.latestNote || "—"}</span>
                  </td>
                  <td className="px-3 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <IconBtn title="View profile" onClick={() => navigate(`/crm/customers/${c.id}`)}><FiEye /></IconBtn>
                      <IconBtn title="Edit customer" onClick={() => setEditing(c)}><FiEdit2 /></IconBtn>
                      <IconBtn title="Order history" onClick={() => navigate(`/crm/customers/${c.id}?tab=orders`)}><FiClock /></IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && result.data.length === 0 && (
          <div className="p-4">
            <EmptyState action={<button onClick={() => setEditing("new")} className={btnPrimary}><FiPlus /> Add customer</button>}>
              {query.search || activeFilterCount || query.segment ? "No customers match these filters." : "No customers yet. Add one here, or pick/add customers while taking orders on the POS."}
            </EmptyState>
          </div>
        )}

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-[#E7EAE1] px-4 py-3 text-sm text-[#6B7280] dark:border-[#262B24] dark:text-[#9CA8A0] sm:flex-row sm:items-center sm:justify-between">
          <span>
            {loading ? "Loading…" : `Showing ${from}–${to} of ${result.total.toLocaleString("en-IN")} customers`}
          </span>
          <div className="flex items-center gap-2">
            <select value={limit} onChange={(e) => update({ limit: e.target.value })} className={`${inputClass} w-auto py-1.5`} aria-label="Rows per page">
              {[20, 50, 100].map((n) => <option key={n} value={n}>{n} per page</option>)}
            </select>
            <button disabled={page <= 1} onClick={() => update({ page: page - 1 }, { resetPage: false })} className={`${btnSecondary} px-2.5 py-1.5`} aria-label="Previous page">
              <FiChevronLeft />
            </button>
            <span className="whitespace-nowrap">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => update({ page: page + 1 }, { resetPage: false })} className={`${btnSecondary} px-2.5 py-1.5`} aria-label="Next page">
              <FiChevronRight />
            </button>
          </div>
        </div>
      </div>

      {editing && (
        <CustomerFormModal
          customer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(c) => {
            setEditing(null);
            if (editing === "new") navigate(`/crm/customers/${c.id}`);
            else setReloadKey((k) => k + 1);
          }}
          onUseExisting={(c) => navigate(`/crm/customers/${c.id}`)}
        />
      )}
    </CrmPage>
  );
}

function IconBtn({ title, onClick, children }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] hover:bg-[#F3F5EE] hover:text-[#3FA34D] dark:text-[#9CA8A0] dark:hover:bg-white/5 dark:hover:text-[#43B75A]"
    >
      {children}
    </button>
  );
}