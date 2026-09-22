// src/crm/pages/CrmDashboard.jsx
//
// CRM overview: find a customer by mobile, see how the customer base is
// split, and what needs attention today — follow-ups due, open complaints,
// upcoming birthdays/anniversaries, and good customers who stopped coming.
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FiSearch, FiPlus, FiRefreshCw, FiGift, FiHeart, FiPhone, FiCheck, FiAlertCircle } from "react-icons/fi";
import { getCrmOverview, lookupCustomerByMobile, updateReminder } from "../crmApi";
import CrmTabs from "../components/CrmTabs";
import CustomerFormModal from "../components/CustomerFormModal";
import {
  CrmPage, StatCard, SegmentBadge, Avatar, ErrorNote, EmptyState, SEGMENTS,
  inr, fmtDate, fmtDay, relativeDays, cardClass, inputClass, btnPrimary, btnSecondary,
} from "../components/crmUI";

function Section({ title, action, children }) {
  return (
    <section className={`${cardClass} p-5`}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-bold text-[#1F2937] dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function MobileLookup({ onAdd }) {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState("");
  const [state, setState] = useState({ status: "idle", customer: null, error: "" });

  async function lookup(e) {
    e.preventDefault();
    if (mobile.replace(/\D/g, "").length < 7) {
      setState({ status: "error", customer: null, error: "Enter at least 7 digits." });
      return;
    }
    setState({ status: "loading", customer: null, error: "" });
    try {
      const { customer } = await lookupCustomerByMobile(mobile);
      setState({ status: customer ? "found" : "missing", customer, error: "" });
    } catch (err) {
      setState({ status: "error", customer: null, error: err.message });
    }
  }

  const c = state.customer;
  return (
    <section className={`${cardClass} p-5`}>
      <h2 className="text-base font-bold text-[#1F2937] dark:text-white">Find a customer by mobile</h2>
      <form onSubmit={lookup} className="mt-3 flex gap-2">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" placeholder="9876543210" className={`${inputClass} pl-9`} />
        </div>
        <button className={btnPrimary} disabled={state.status === "loading"}>
          {state.status === "loading" ? "Searching…" : "Search"}
        </button>
      </form>

      {state.status === "error" && <div className="mt-3"><ErrorNote>{state.error}</ErrorNote></div>}

      {state.status === "missing" && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F3F5EE] p-3 text-sm text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]">
          No customer with this number yet.
          <button onClick={() => onAdd(mobile)} className={btnSecondary}><FiPlus /> Add as new customer</button>
        </div>
      )}

      {state.status === "found" && c && (
        <button
          onClick={() => navigate(`/crm/customers/${c.id}`)}
          className="mt-3 w-full rounded-xl border border-[#E7EAE1] p-4 text-left transition-colors hover:border-[#3FA34D] dark:border-[#262B24] dark:hover:border-[#43B75A]"
        >
          <div className="flex items-center gap-3">
            <Avatar name={c.name} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#1F2937] dark:text-white">{c.name}</p>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">{c.mobile}</p>
            </div>
            <SegmentBadge segment={c.segment} />
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
            {[
              ["Orders", c.totalOrders],
              ["Total spent", inr(c.totalSpent)],
              ["Average bill", inr(c.avgBill)],
              ["Last visit", c.lastVisitAt ? fmtDate(c.lastVisitAt, { day: "numeric", month: "long" }) : "—"],
              ["Favourite", c.favoriteItems?.[0]?.name || "—"],
              ["Outstanding", inr(c.outstanding)],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">{k}</dt>
                <dd className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{v}</dd>
              </div>
            ))}
          </dl>
        </button>
      )}
    </section>
  );
}

export default function CrmDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(null); // mobile prefill, or "" for blank

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await getCrmOverview());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function markDone(reminder) {
    try {
      await updateReminder(reminder.id, { status: "DONE" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  const seg = data?.segments || {};
  const segTotal = Object.values(seg).reduce((a, b) => a + b, 0) || 1;

  return (
    <CrmPage
      title="Customer Relationship Management"
      subtitle="Know your regulars, follow up on time, and win back customers who stopped coming."
      tabs={<CrmTabs />}
      actions={
        <>
          <button onClick={load} className={btnSecondary} disabled={loading}>
            <FiRefreshCw className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button onClick={() => setAdding("")} className={btnPrimary}>
            <FiPlus /> Add customer
          </button>
        </>
      }
    >
      <ErrorNote>{error}</ErrorNote>

      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Customers" value={data.totalCustomers.toLocaleString("en-IN")} hint={`${data.newThisMonth} new this month`} />
            <StatCard label="Visited in last 30 days" value={data.activeLast30Days.toLocaleString("en-IN")} />
            <StatCard label="Repeat rate" value={`${data.repeatRate}%`} hint="ordered 2+ times" />
            <StatCard label="Average bill" value={inr(data.avgBill)} hint={`${inr(data.avgSpendPerCustomer)} per customer`} />
            <StatCard label="Customer revenue" value={inr(data.lifetimeRevenue)} accent="text-[#3FA34D] dark:text-[#43B75A]" />
            <StatCard
              label="Outstanding credit"
              value={inr(data.totalOutstanding)}
              hint={`${data.customersWithDues} customer${data.customersWithDues === 1 ? "" : "s"}`}
              accent={data.totalOutstanding > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <MobileLookup onAdd={(m) => setAdding(m)} />

            <Section title="Customer segments">
              <div className="mb-4 flex h-3 overflow-hidden rounded-full bg-[#F3F5EE] dark:bg-white/5">
                {["vip", "regular", "new", "at_risk", "no_orders"].map((k) => (
                  <div
                    key={k}
                    title={`${SEGMENTS[k].label}: ${seg[k] || 0}`}
                    style={{ width: `${((seg[k] || 0) / segTotal) * 100}%` }}
                    className={{ vip: "bg-amber-400", regular: "bg-[#3FA34D]", new: "bg-[#4AA8E0]", at_risk: "bg-red-400", no_orders: "bg-[#D5DAD0] dark:bg-[#2E342C]" }[k]}
                  />
                ))}
              </div>
              <ul className="space-y-2">
                {[
                  ["vip", `Spent ${inr(data.config.vipSpendThreshold)}+ or ${data.config.vipOrderThreshold}+ orders`],
                  ["regular", `${data.config.regularOrderThreshold}+ orders, visiting recently`],
                  ["new", "Ordered once or twice"],
                  ["at_risk", `No visit in ${data.config.inactiveDays}+ days`],
                  ["no_orders", "Added, but no orders linked yet"],
                ].map(([k, desc]) => (
                  <li key={k}>
                    <Link to={`/crm/customers?segment=${k}`} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-[#F3F5EE] dark:hover:bg-white/5">
                      <span className="flex items-center gap-2">
                        <SegmentBadge segment={k} />
                        <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">{desc}</span>
                      </span>
                      <span className="font-bold text-[#1F2937] dark:text-white">{seg[k] || 0}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>

            <Section
              title="Follow-ups due"
              action={
                data.overdueReminders > 0 && (
                  <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    {data.overdueReminders} overdue
                  </span>
                )
              }
            >
              {data.dueReminders.length === 0 ? (
                <EmptyState>No follow-ups due today.</EmptyState>
              ) : (
                <ul className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
                  {data.dueReminders.map((r) => {
                    const overdue = new Date(r.dueAt) < new Date(new Date().setHours(0, 0, 0, 0));
                    return (
                      <li key={r.id} className="flex items-center gap-3 py-2.5">
                        <FiPhone className={overdue ? "text-red-500" : "text-[#9CA3AF]"} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{r.title}</p>
                          <Link to={`/crm/customers/${r.customer.id}`} className="text-xs text-[#6B7280] hover:underline dark:text-[#9CA8A0]">
                            {r.customer.name} · {r.customer.mobile} · {overdue ? `was due ${fmtDate(r.dueAt)}` : "due today"}
                          </Link>
                        </div>
                        <button onClick={() => markDone(r)} className={`${btnSecondary} px-2.5 py-1 text-xs`}>
                          <FiCheck /> Done
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Section>

            <Section title={`Birthdays & anniversaries (next ${data.config.occasionLookaheadDays} days)`}>
              {data.upcomingOccasions.length === 0 ? (
                <EmptyState>None coming up.</EmptyState>
              ) : (
                <ul className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
                  {data.upcomingOccasions.map((o) => (
                    <li key={`${o.customerId}-${o.kind}`} className="flex items-center gap-3 py-2.5">
                      {o.kind === "BIRTHDAY" ? <FiGift className="text-[#EA580C]" /> : <FiHeart className="text-[#E11D48]" />}
                      <Link to={`/crm/customers/${o.customerId}`} className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#1F2937] hover:underline dark:text-[#E4E9E2]">{o.name}</p>
                        <p className="text-xs text-[#6B7280] dark:text-[#9CA8A0]">
                          {o.kind === "BIRTHDAY" ? "Birthday" : "Anniversary"} on {fmtDay(o.date)} · {o.mobile}
                        </p>
                      </Link>
                      <span className="text-xs font-semibold text-[#3FA34D] dark:text-[#43B75A]">
                        {o.inDays === 0 ? "Today" : o.inDays === 1 ? "Tomorrow" : `In ${o.inDays} days`}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="Top customers" action={<Link to="/crm/customers?sortBy=totalSpent" className="text-xs font-semibold text-[#3FA34D] hover:underline dark:text-[#43B75A]">View all</Link>}>
              {data.topCustomers.length === 0 ? (
                <EmptyState>Customers show up here once orders are linked to them on the POS.</EmptyState>
              ) : (
                <CustomerMiniList customers={data.topCustomers} onOpen={(id) => navigate(`/crm/customers/${id}`)} />
              )}
            </Section>

            <Section title="Customers to win back" action={<Link to="/crm/customers?segment=at_risk" className="text-xs font-semibold text-[#3FA34D] hover:underline dark:text-[#43B75A]">View all</Link>}>
              {data.atRiskCustomers.length === 0 ? (
                <EmptyState>Nobody has lapsed. Nice.</EmptyState>
              ) : (
                <CustomerMiniList customers={data.atRiskCustomers} onOpen={(id) => navigate(`/crm/customers/${id}`)} showLastVisit />
              )}
            </Section>

            <Section
              title="Open feedback & complaints"
              action={
                <Link to="/crm/follow-ups" className="text-xs font-semibold text-[#3FA34D] hover:underline dark:text-[#43B75A]">
                  {data.openComplaints} open complaint{data.openComplaints === 1 ? "" : "s"}
                </Link>
              }
            >
              {data.openFeedback.length === 0 ? (
                <EmptyState>Nothing open.</EmptyState>
              ) : (
                <ul className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
                  {data.openFeedback.map((f) => (
                    <li key={f.id} className="flex items-start gap-3 py-2.5">
                      <FiAlertCircle className={`mt-0.5 ${f.type === "COMPLAINT" ? "text-red-500" : "text-[#9CA3AF]"}`} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm text-[#1F2937] dark:text-[#E4E9E2]">{f.message}</p>
                        <Link to={`/crm/customers/${f.customer.id}`} className="text-xs text-[#6B7280] hover:underline dark:text-[#9CA8A0]">
                          {f.customer.name} · {fmtDate(f.createdAt)}
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}

      {loading && !data && <p className="text-sm text-[#9CA3AF]">Loading…</p>}

      {adding !== null && (
        <CustomerFormModal
          initialMobile={adding}
          onClose={() => setAdding(null)}
          onSaved={(c) => navigate(`/crm/customers/${c.id}`)}
          onUseExisting={(c) => navigate(`/crm/customers/${c.id}`)}
        />
      )}
    </CrmPage>
  );
}

function CustomerMiniList({ customers, onOpen, showLastVisit }) {
  return (
    <ul className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
      {customers.map((c) => (
        <li key={c.id}>
          <button onClick={() => onOpen(c.id)} className="flex w-full items-center gap-3 py-2.5 text-left">
            <Avatar name={c.name} size="h-8 w-8 text-xs" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{c.name}</p>
              <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                {c.totalOrders} orders · {showLastVisit ? `last visit ${relativeDays(c.lastVisitAt)}` : `avg ${inr(c.avgBill)}`}
              </p>
            </div>
            <span className="text-sm font-bold text-[#1F2937] dark:text-white">{inr(c.totalSpent)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}