// client/src/platform/pages/Reports.jsx — /platform/reports
import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FiDownload, FiPrinter, FiDollarSign, FiUserPlus, FiRefreshCw, FiTrendingDown, FiPercent, FiShoppingBag } from "react-icons/fi";
import { api, downloadCsv } from "../api";
import { Card, PageHeader, Stat, Table, Button, Input, Loading, ErrorBox, StatusBadge, Badge, ProgressBar, inr, num, fmtDate, ago, minutes, titleCase, useApi, CHART_COLORS, toInputDate } from "../ui";

const PRESETS = [
  ["30 days", 30],
  ["90 days", 90],
  ["6 months", 182],
  ["12 months", 365],
];
const shortMonth = (m) => new Date(`${m}-01`).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

function Section({ title, children, action }) {
  return (
    <section className="space-y-3 break-inside-avoid">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function PieCard({ title, data }) {
  return (
    <Card title={title}>
      {data.length ? (
        <div className="h-52">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={data} dataKey="amount" nameKey="key" innerRadius={40} outerRadius={70} paddingAngle={2}>
                {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => inr(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-10 text-center text-sm text-slate-400">No payments in range</p>
      )}
    </Card>
  );
}

export default function Reports() {
  const today = new Date();
  const [range, setRange] = useState({ from: toInputDate(new Date(Date.now() - 89 * 86400000)), to: toInputDate(today) });
  const { data, error, loading, reload } = useApi(() => api.get("/reports", range), [range.from, range.to]);
  const exp = (section) => downloadCsv("/reports/export", { ...range, section }).catch((e) => toast.error(e.message));
  const [sort, setSort] = useState("revenueInRange");

  return (
    <div className="space-y-6 print:space-y-4">
      <PageHeader
        title="Reports"
        subtitle="A complete, date-ranged report of the platform — revenue, growth, subscriptions, usage, support and operations."
        actions={
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            {PRESETS.map(([l, d]) => (
              <Button key={l} size="sm" variant="secondary" onClick={() => setRange({ from: toInputDate(new Date(Date.now() - (d - 1) * 86400000)), to: toInputDate(new Date()) })}>
                {l}
              </Button>
            ))}
            <Input type="date" className="!w-auto" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} />
            <Input type="date" className="!w-auto" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} />
            <Button size="sm" variant="secondary" icon={FiPrinter} onClick={() => window.print()}>Print / PDF</Button>
          </div>
        }
      />
      {loading && !data ? (
        <Loading label="Building report…" />
      ) : error && !data ? (
        <ErrorBox error={error} onRetry={reload} />
      ) : (
        (() => {
          const r = data.report;
          const s = r.summary;
          const rows = [...r.restaurants].sort((a, b) => (sort === "name" ? a.name.localeCompare(b.name) : (b[sort] || 0) - (a[sort] || 0)));
          return (
            <>
              <p className="text-xs text-slate-500">
                {fmtDate(r.range.from)} – {fmtDate(r.range.to)}
              </p>
              <Section title="Summary">
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <Stat label="Revenue collected" value={inr(s.revenue, { compact: true })} sub={`net ${inr(s.revenueNet, { compact: true })} · GST ${inr(s.gst, { compact: true })}`} icon={FiDollarSign} />
                  <Stat label="Payments" value={num(s.payments)} sub={`avg ${inr(s.avgPayment)} · ${s.failedPayments} failed`} icon={FiDollarSign} tone="blue" />
                  <Stat label="New restaurants" value={num(s.signups)} sub={`${s.converted} converted to paid (${s.conversionRate}%)`} icon={FiUserPlus} tone="violet" />
                  <Stat label="Renewals" value={num(s.renewals)} sub={`${inr(s.renewalRevenue)} renewal revenue`} icon={FiRefreshCw} />
                  <Stat label="Churned (expired in range)" value={num(s.churned)} icon={FiTrendingDown} tone="red" />
                  <Stat label="Current MRR" value={inr(s.mrr, { compact: true })} sub={`ARR ${inr(s.mrr * 12, { compact: true })}`} icon={FiPercent} tone="amber" />
                  <Stat label="Restaurant GMV" value={inr(s.gmv, { compact: true })} sub={`${num(s.orders)} orders processed`} icon={FiShoppingBag} tone="blue" />
                  <Stat label="Ops" value={`${r.operations.serverErrors} errors`} sub={`${r.operations.webhooks} webhooks · ${r.operations.webhooksFailed} failed`} icon={FiPercent} tone="slate" />
                </div>
              </Section>

              <Section title="Revenue & growth" action={<Button size="sm" variant="ghost" icon={FiDownload} onClick={() => exp("monthly")}>CSV</Button>}>
                <Card title="By month">
                  <div className="h-64">
                    <ResponsiveContainer>
                      <BarChart data={r.monthly}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EA" vertical={false} />
                        <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="l" tickFormatter={(v) => inr(v, { compact: true })} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={70} />
                        <YAxis yAxisId="r" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip formatter={(v, n) => (n === "Revenue" ? inr(v) : v)} labelFormatter={shortMonth} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar yAxisId="l" dataKey="revenue" name="Revenue" fill="#3FA34D" radius={[5, 5, 0, 0]} />
                        <Bar yAxisId="r" dataKey="signups" name="Signups" fill="#0EA5E9" radius={[5, 5, 0, 0]} />
                        <Bar yAxisId="r" dataKey="payments" name="Payments" fill="#F59E0B" radius={[5, 5, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
                <div className="grid gap-5 lg:grid-cols-3">
                  <PieCard title="Revenue by plan" data={r.revenueByPlan} />
                  <PieCard title="Revenue by source" data={r.revenueBySource} />
                  <PieCard title="Revenue by method" data={r.revenueByMethod} />
                </div>
              </Section>

              <Section title="Subscriptions">
                <div className="grid gap-5 lg:grid-cols-2">
                  <Card title="Current status mix">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {Object.entries(r.statusCounts)
                        .filter(([k]) => k !== "ALL")
                        .map(([k, v]) => (
                          <div key={k} className="rounded-xl bg-[#F6F7F4] py-3">
                            <p className="text-xl font-black text-slate-800">{v}</p>
                            <StatusBadge status={k} />
                          </div>
                        ))}
                    </div>
                  </Card>
                  <Card title="Churned in range" bodyClass="p-0">
                    <Table
                      dense
                      rows={r.churnedList}
                      empty={<p className="p-6 text-center text-sm text-slate-400">No churn in this period 🎉</p>}
                      columns={[
                        { key: "name", label: "Restaurant", render: (x) => <Link to={`/platform/restaurants/${x.id}`} className="font-medium text-[#3FA34D]">{x.name}</Link> },
                        { key: "plan", label: "Plan" },
                        { key: "expired", label: "Expired", render: (x) => fmtDate(x.expired) },
                      ]}
                    />
                  </Card>
                </div>
              </Section>

              <Section title="Feature adoption" action={<Button size="sm" variant="ghost" icon={FiDownload} onClick={() => exp("adoption")}>CSV</Button>}>
                <Card>
                  <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
                    {r.adoption.map((m) => (
                      <div key={m.key}>
                        <div className="mb-1 flex justify-between text-xs">
                          <span className="font-medium text-slate-700">{m.module}</span>
                          <span className="text-slate-500">{m.restaurants} restaurants · {m.pct}%</span>
                        </div>
                        <ProgressBar value={m.pct} tone={m.pct >= 50 ? "green" : m.pct >= 20 ? "amber" : "red"} />
                      </div>
                    ))}
                  </div>
                </Card>
              </Section>

              <Section title="Support & follow-ups">
                <div className="grid gap-5 lg:grid-cols-3">
                  <Card title="Conversations">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-2xl font-black">{r.support.conversations}</p><p className="text-xs text-slate-500">opened</p></div>
                      <div><p className="text-2xl font-black">{r.support.resolved}</p><p className="text-xs text-slate-500">resolved / closed</p></div>
                      <div><p className="text-2xl font-black">{r.support.avgFirstResponseMin === null ? "—" : minutes(r.support.avgFirstResponseMin)}</p><p className="text-xs text-slate-500">avg first response</p></div>
                      <div><p className="text-2xl font-black">{r.support.adminMessages}/{r.support.restaurantMessages}</p><p className="text-xs text-slate-500">messages sent / received</p></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {Object.entries(r.support.byCategory).map(([k, v]) => <Badge key={k}>{k}: {v}</Badge>)}
                    </div>
                  </Card>
                  <Card title="Follow-ups">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-2xl font-black">{r.followUps.created}</p><p className="text-xs text-slate-500">created</p></div>
                      <div><p className="text-2xl font-black">{r.followUps.completed}</p><p className="text-xs text-slate-500">completed</p></div>
                      <div><p className="text-2xl font-black text-rose-600">{r.followUps.overdue}</p><p className="text-xs text-slate-500">overdue now</p></div>
                      <div><p className="text-2xl font-black">{r.followUps.completionRate}%</p><p className="text-xs text-slate-500">completion</p></div>
                    </div>
                    <div className="mt-4 space-y-1">
                      {r.followUps.byAssignee.map((a) => (
                        <div key={a.name} className="flex justify-between text-xs"><span>{a.name}</span><span className="text-slate-500">{a.open} open · {a.done} done</span></div>
                      ))}
                    </div>
                  </Card>
                  <Card title="Website enquiries">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-2xl font-black">{r.enquiries.total}</p><p className="text-xs text-slate-500">received</p></div>
                      <div><p className="text-2xl font-black">{r.enquiries.replied}</p><p className="text-xs text-slate-500">replied</p></div>
                      <div><p className="text-2xl font-black text-emerald-600">{r.enquiries.converted}</p><p className="text-xs text-slate-500">converted</p></div>
                      <div><p className="text-2xl font-black">{r.enquiries.total ? Math.round((r.enquiries.converted / r.enquiries.total) * 100) : 0}%</p><p className="text-xs text-slate-500">conversion</p></div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {Object.entries(r.enquiries.byStatus).map(([k, v]) => <Badge key={k}>{titleCase(k)}: {v}</Badge>)}
                    </div>
                  </Card>
                </div>
              </Section>

              <Section
                title={`Restaurants (${rows.length})`}
                action={
                  <div className="flex items-center gap-2 print:hidden">
                    <select className="rounded-lg border border-[#E2E6DC] px-2 py-1 text-xs" value={sort} onChange={(e) => setSort(e.target.value)}>
                      <option value="revenueInRange">Revenue in range</option>
                      <option value="lifetimeRevenue">Lifetime revenue</option>
                      <option value="sales">Sales (GMV)</option>
                      <option value="activeMinutes">Time in app</option>
                      <option value="inactiveDays">Inactive days</option>
                      <option value="name">Name</option>
                    </select>
                    <Button size="sm" icon={FiDownload} onClick={() => exp("restaurants")}>Export CSV</Button>
                  </div>
                }
              >
                <Card bodyClass="p-0">
                  <Table
                    dense
                    rows={rows}
                    columns={[
                      { key: "name", label: "Restaurant", render: (x) => <Link to={`/platform/restaurants/${x.id}`} className="font-semibold text-slate-900 hover:text-[#3FA34D]">{x.name}<p className="text-[11px] font-normal text-slate-500">{x.owner}</p></Link> },
                      { key: "plan", label: "Plan" },
                      { key: "status", label: "Status", render: (x) => <StatusBadge status={x.status} /> },
                      { key: "rev", label: "Revenue (range)", align: "right", render: (x) => inr(x.revenueInRange) },
                      { key: "life", label: "Lifetime", align: "right", render: (x) => inr(x.lifetimeRevenue) },
                      { key: "orders", label: "Orders", align: "right", render: (x) => num(x.orders) },
                      { key: "sales", label: "GMV", align: "right", render: (x) => inr(x.sales, { compact: true }) },
                      { key: "time", label: "Time in app", align: "right", render: (x) => minutes(x.activeMinutes) },
                      { key: "last", label: "Last active", render: (x) => <span className="text-xs">{ago(x.lastActiveAt)}</span> },
                    ]}
                  />
                </Card>
              </Section>
            </>
          );
        })()
      )}
    </div>
  );
}
