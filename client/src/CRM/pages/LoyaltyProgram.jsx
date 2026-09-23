// src/crm/pages/LoyaltyProgram.jsx
//
// The loyalty programme across all customers: how many points are out
// there (and what they'd cost if everyone redeemed), membership tiers,
// bonus-point campaigns, discount coupons, reward vouchers, and the
// points ledger.
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiSettings, FiSlash, FiRefreshCw, FiGift } from "react-icons/fi";
import {
  getLoyaltyOverview, listLoyaltyTransactions, listVouchers, cancelVoucher, issueVoucher,
} from "../loyaltyApi";
import { listCustomers } from "../crmApi";
import { useAuth } from "../../auth/AuthContext";
import CrmTabs from "../components/CrmTabs";
import {
  CRM_MANAGER_ROLES, CrmPage, StatCard, Modal, ErrorNote, EmptyState,
  inr, fmtDate, fmtDateTime, cardClass, inputClass, labelClass, btnPrimary, btnSecondary, chipClass,
} from "../components/crmUI";

const VIEWS = [
  ["overview", "Overview"],
  // Vouchers, every customer's points, and the points ledger all live
  // under one tab — they're read together.
  ["vouchers", "Reward vouchers"],
];

export default function LoyaltyProgram() {
  const { user } = useAuth();
  const canManage = CRM_MANAGER_ROLES.includes(user?.role);
  const [view, setView] = useState("overview");
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getLoyaltyOverview());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <CrmPage
      title="Loyalty programme"
      subtitle="Points, rewards and membership levels for your customers."
      tabs={<CrmTabs />}
      actions={
        <>
          <button onClick={load} className={btnSecondary} disabled={loading}><FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh</button>
          {canManage && <Link to="/settings/loyalty" className={btnSecondary}><FiSettings /> Loyalty settings</Link>}
        </>
      }
    >
      <ErrorNote>{error}</ErrorNote>

      {data && (
        <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Members with points" value={data.members ?? 0} />
          <StatCard label="Points outstanding" value={(data.outstandingPoints ?? 0).toLocaleString("en-IN")} hint={`worth ${inr(data.outstandingValue || 0)}`} accent="text-[#3FA34D] dark:text-[#43B75A]" />
          <StatCard label="Points issued (30 days)" value={(data.issuedLast30Days ?? 0).toLocaleString("en-IN")} />
          <StatCard
            label="Points redeemed (30 days)"
            value={(data.redeemedLast30Days ?? 0).toLocaleString("en-IN")}
            hint={data.redeemedValueLast30Days ? `${inr(data.redeemedValueLast30Days)} given back` : undefined}
          />
          <StatCard
            label="Expiring in 30 days"
            value={(data.expiringIn30Days ?? 0).toLocaleString("en-IN")}
            accent={data.expiringIn30Days > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
          />
          <StatCard label="Active vouchers" value={data.activeVouchers ?? 0} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {VIEWS.map(([k, l]) => <button key={k} onClick={() => setView(k)} className={chipClass(view === k)}>{l}</button>)}
      </div>

      {view === "overview" && <Overview data={data} />}
      {view === "vouchers" && <Vouchers canManage={canManage} />}
    </CrmPage>
  );
}

function Overview({ data }) {
  if (!data) return <p className="text-sm text-[#9CA3AF]">Loading…</p>;
  const tiers = data.tiers || [];
  const maxCustomers = Math.max(1, ...tiers.map((t) => t.customers || 0));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <section className={`${cardClass} p-5`}>
        <h3 className="mb-3 font-bold text-[#1F2937] dark:text-white">Membership levels</h3>
        {tiers.length ? (
          <ul className="space-y-3">
            {tiers.map((t) => (
              <li key={t.name}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold" style={{ color: t.color }}>{t.name}</span>
                  <span className="text-[#6B7280] dark:text-[#9CA8A0]">
                    {t.customers} customer{t.customers === 1 ? "" : "s"} · {t.multiplier}× points
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[#F3F5EE] dark:bg-white/5">
                  <div className="h-2 rounded-full" style={{ width: `${((t.customers || 0) / maxCustomers) * 100}%`, backgroundColor: t.color }} />
                </div>
                <p className="mt-0.5 text-xs text-[#9CA3AF]">Lifetime spend from {inr(t.minSpend)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Membership levels are switched off in Settings → Loyalty.</EmptyState>
        )}
      </section>

      <section className={`${cardClass} p-5`}>
        <h3 className="mb-3 font-bold text-[#1F2937] dark:text-white">Top points holders</h3>
        {data.topHolders?.length ? (
          <ul className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
            {data.topHolders.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-2 py-2.5">
                <Link to={`/crm/customers/${m.id}?tab=loyalty`} className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#1F2937] hover:underline dark:text-[#E4E9E2]">{m.name}</p>
                  <p className="text-xs text-[#9CA3AF]">{m.mobile} · worth {inr(m.pointsValue)}</p>
                </Link>
                <span className="font-bold text-[#3FA34D] dark:text-[#43B75A]">{m.loyaltyPoints} pts</span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>Nobody has points yet.</EmptyState>
        )}
      </section>
    </div>
  );
}

// ── Reward vouchers ─────────────────────────────────────────────────────
// Two parts: the vouchers themselves, and every customer with their points
// balance — so you can see who's eligible and issue a reward on the spot
// without going to each profile.
function Vouchers({ canManage }) {
  const [status, setStatus] = useState("ACTIVE");
  const [rows, setRows] = useState([]);
  const [members, setMembers] = useState([]);
  const [activeByCustomer, setActiveByCustomer] = useState({});
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [issueFor, setIssueFor] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, active, customers] = await Promise.all([
        listVouchers({ status }),
        // Always fetched, whatever the filter is, to count each customer's
        // live vouchers in the members table.
        status === "ACTIVE" ? Promise.resolve(null) : listVouchers({ status: "ACTIVE" }),
        listCustomers({ limit: 100, sortBy: "totalSpent", sortDir: "desc" }),
      ]);
      setRows(list);
      const activeList = active || list;
      const counts = {};
      for (const v of activeList) if (v.customer?.id) counts[v.customer.id] = (counts[v.customer.id] || 0) + 1;
      setActiveByCustomer(counts);
      // Only customers who actually hold points — a list of zeros is noise.
      setMembers(
        (customers.data || [])
          .filter((c) => (c.loyaltyPoints || 0) > 0)
          .sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0)),
      );
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => { load(); }, [load]);

  const term = search.trim().toLowerCase();
  const shownMembers = term
    ? members.filter((m) => m.name.toLowerCase().includes(term) || (m.mobile || "").includes(term))
    : members;

  return (
    <div className="space-y-6">
      <ErrorNote>{error}</ErrorNote>

      {/* Vouchers */}
      <section>
        <div className="mb-3 flex flex-wrap gap-2">
          {["ACTIVE", "USED", "EXPIRED", "CANCELLED"].map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={chipClass(status === s)}>{s.charAt(0) + s.slice(1).toLowerCase()}</button>
          ))}
        </div>
        {rows.length === 0 ? (
          <EmptyState>
            {status === "ACTIVE"
              ? "No active vouchers. Issue one to any customer from the table below."
              : "No vouchers in this view."}
          </EmptyState>
        ) : (
          <div className={`${cardClass} overflow-x-auto`}>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-[#F3F5EE] text-xs uppercase text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]">
                <tr>
                  <th className="px-4 py-2">Code</th><th className="px-4 py-2">Reward</th>
                  <th className="px-4 py-2">Customer</th><th className="px-4 py-2">Mobile</th>
                  <th className="px-4 py-2 text-right">Their points</th>
                  <th className="px-4 py-2">Issued</th><th className="px-4 py-2">Expires</th>
                  <th className="px-4 py-2 text-right">Points used</th><th />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
                {rows.map((v) => {
                  const m = members.find((x) => x.id === v.customer?.id);
                  return (
                    <tr key={v.id}>
                      <td className="px-4 py-2 font-mono font-semibold text-[#1F2937] dark:text-white">{v.code}</td>
                      <td className="px-4 py-2">{v.title}</td>
                      <td className="px-4 py-2">
                        {v.customer ? <Link to={`/crm/customers/${v.customer.id}?tab=loyalty`} className="font-semibold hover:underline">{v.customer.name}</Link> : "—"}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-[#6B7280] dark:text-[#9CA8A0]">{v.customer?.mobile || m?.mobile || "—"}</td>
                      <td className="px-4 py-2 text-right font-semibold text-[#3FA34D] dark:text-[#43B75A]">{m ? m.loyaltyPoints ?? 0 : "—"}</td>
                      <td className="px-4 py-2 text-xs text-[#6B7280] dark:text-[#9CA8A0]">{fmtDate(v.createdAt)}</td>
                      <td className="px-4 py-2 text-xs text-[#6B7280] dark:text-[#9CA8A0]">{v.expiresAt ? fmtDate(v.expiresAt) : "—"}</td>
                      <td className="px-4 py-2 text-right">{v.pointsUsed || "—"}</td>
                      <td className="px-4 py-2 text-right">
                        {canManage && v.status === "ACTIVE" && (
                          <button
                            onClick={async () => { await cancelVoucher(v.id).catch((e) => setError(e.message)); load(); }}
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"
                            title="Cancel voucher"
                          >
                            <FiSlash size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Every customer and their points */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-[#1F2937] dark:text-white">Customers & points</h3>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name or mobile"
            className={`${inputClass} w-auto min-w-[220px] py-1.5 text-sm`}
          />
        </div>
        {loading && members.length === 0 ? (
          <p className="text-sm text-[#9CA3AF]">Loading…</p>
        ) : shownMembers.length === 0 ? (
          <EmptyState>
            {term
              ? "No customer with points matches that search."
              : "Nobody holds points yet. Points are added when a bill with a customer on it is completed."}
          </EmptyState>
        ) : (
          <div className={`${cardClass} overflow-x-auto`}>
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[#F3F5EE] text-xs uppercase text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]">
                <tr>
                  <th className="px-4 py-2">Customer</th><th className="px-4 py-2">Mobile</th>
                  <th className="px-4 py-2">Level</th>
                  <th className="px-4 py-2 text-right">Points</th><th className="px-4 py-2 text-right">Worth</th>
                  <th className="px-4 py-2 text-right">Orders</th><th className="px-4 py-2 text-right">Total spent</th>
                  <th className="px-4 py-2 text-right">Active vouchers</th><th />
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
                {shownMembers.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2">
                      <Link to={`/crm/customers/${m.id}?tab=loyalty`} className="font-semibold text-[#1F2937] hover:underline dark:text-[#E4E9E2]">{m.name}</Link>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-[#6B7280] dark:text-[#9CA8A0]">{m.mobile}</td>
                    <td className="px-4 py-2 text-xs font-semibold" style={{ color: m.tier?.color || "#9CA3AF" }}>{m.tier?.name || "—"}</td>
                    <td className="px-4 py-2 text-right font-bold text-[#3FA34D] dark:text-[#43B75A]">{m.loyaltyPoints ?? 0}</td>
                    <td className="px-4 py-2 text-right text-[#1F2937] dark:text-[#E4E9E2]">{inr(m.pointsValue || 0)}</td>
                    <td className="px-4 py-2 text-right">{m.totalOrders}</td>
                    <td className="px-4 py-2 text-right">{inr(m.totalSpent)}</td>
                    <td className="px-4 py-2 text-right">{activeByCustomer[m.id] || 0}</td>
                    <td className="px-4 py-2 text-right">
                      {canManage && (
                        <button onClick={() => setIssueFor(m)} className={`${btnSecondary} px-2.5 py-1 text-xs`}>
                          <FiGift size={12} /> Issue voucher
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Points ledger */}
      <section>
        <h3 className="mb-3 font-bold text-[#1F2937] dark:text-white">Points history</h3>
        <History />
      </section>

      {issueFor && (
        <IssueVoucherModal
          customer={issueFor}
          onClose={() => setIssueFor(null)}
          onSaved={() => { setIssueFor(null); load(); }}
        />
      )}
    </div>
  );
}

function IssueVoucherModal({ customer, onClose, onSaved }) {
  const [form, setForm] = useState({ title: "", type: "FIXED_AMOUNT", value: "", minBillAmount: "", validDays: 30, pointsCost: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await issueVoucher(customer.id, {
        ...form,
        value: Number(form.value),
        minBillAmount: form.minBillAmount === "" ? null : Number(form.minBillAmount),
        pointsCost: form.pointsCost === "" ? null : Number(form.pointsCost),
        validDays: Number(form.validDays),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Issue a voucher to ${customer.name}`}
      onClose={onClose}
      footer={<><button onClick={onClose} className={btnSecondary}>Cancel</button><button form="issue-voucher-form" disabled={saving || !form.title.trim() || !form.value} className={btnPrimary}>{saving ? "Saving…" : "Issue voucher"}</button></>}
    >
      <form id="issue-voucher-form" onSubmit={save} className="space-y-3">
        <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
          {customer.mobile} · {customer.loyaltyPoints ?? 0} points{customer.tier ? ` · ${customer.tier.name}` : ""}
        </p>
        <div><label className={labelClass}>Title *</label><input autoFocus value={form.title} onChange={set("title")} className={inputClass} placeholder="e.g. ₹200 off your next visit" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select value={form.type} onChange={set("type")} className={inputClass}>
              <option value="FIXED_AMOUNT">Flat amount off</option>
              <option value="PERCENTAGE">Percentage off</option>
            </select>
          </div>
          <div><label className={labelClass}>{form.type === "PERCENTAGE" ? "Percent *" : "Amount (₹) *"}</label><input type="number" min="1" value={form.value} onChange={set("value")} className={inputClass} /></div>
          <div><label className={labelClass}>Minimum bill (₹)</label><input type="number" min="0" value={form.minBillAmount} onChange={set("minBillAmount")} className={inputClass} placeholder="Any" /></div>
          <div><label className={labelClass}>Valid for (days)</label><input type="number" min="1" value={form.validDays} onChange={set("validDays")} className={inputClass} /></div>
          <div className="col-span-2">
            <label className={labelClass}>Deduct points for this voucher</label>
            <input type="number" min="0" value={form.pointsCost} onChange={set("pointsCost")} className={inputClass} placeholder={`Leave empty for a free reward · balance ${customer.loyaltyPoints ?? 0}`} />
          </div>
        </div>
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Modal>
  );
}

// ── Ledger ──────────────────────────────────────────────────────────────
function History() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0 });
  const [error, setError] = useState("");
  useEffect(() => {
    listLoyaltyTransactions({ page, limit: 25 }).then(setResult).catch((e) => setError(e.message));
  }, [page]);
  const pages = Math.max(1, Math.ceil(result.total / 25));

  return (
    <div className={`${cardClass} overflow-hidden`}>
      <ErrorNote>{error}</ErrorNote>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[#F3F5EE] text-xs uppercase text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]">
            <tr><th className="px-4 py-2">When</th><th className="px-4 py-2">Customer</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Details</th><th className="px-4 py-2 text-right">Points</th></tr>
          </thead>
          <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
            {result.data.map((t) => (
              <tr key={t.id}>
                <td className="whitespace-nowrap px-4 py-2 text-[#6B7280] dark:text-[#9CA8A0]">{fmtDateTime(t.createdAt)}</td>
                <td className="px-4 py-2">
                  {t.customer ? <Link to={`/crm/customers/${t.customer.id}?tab=loyalty`} className="font-semibold hover:underline">{t.customer.name}</Link> : "—"}
                </td>
                <td className="px-4 py-2 text-xs font-semibold uppercase text-[#6B7280] dark:text-[#9CA8A0]">{t.type}</td>
                <td className="px-4 py-2 text-[#6B7280] dark:text-[#9CA8A0]">{t.reason || "—"}</td>
                <td className={`px-4 py-2 text-right font-bold ${t.points >= 0 ? "text-[#3FA34D] dark:text-[#43B75A]" : "text-red-500"}`}>{t.points >= 0 ? "+" : ""}{t.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between border-t border-[#E7EAE1] px-4 py-3 text-sm text-[#6B7280] dark:border-[#262B24] dark:text-[#9CA8A0]">
        <span>{result.total} entries</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`${btnSecondary} px-3 py-1`}>Previous</button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={`${btnSecondary} px-3 py-1`}>Next</button>
        </div>
      </div>
    </div>
  );
}