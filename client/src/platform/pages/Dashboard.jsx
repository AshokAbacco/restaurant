// client/src/platform/pages/Dashboard.jsx — /platform/dashboard
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  FiHome,
  FiDollarSign,
  FiTrendingUp,
  FiUsers,
  FiShoppingBag,
  FiMessageSquare,
  FiCheckSquare,
  FiMail,
  FiZap,
  FiAlertTriangle,
  FiDatabase,
  FiClock,
  FiPercent,
  FiMapPin,
} from "react-icons/fi";
import { api } from "../api";
import {
  Card,
  Stat,
  Loading,
  ErrorBox,
  PageHeader,
  StatusBadge,
  inr,
  num,
  ago,
  fmtDate,
  useApi,
  CHART_COLORS,
  Badge,
  Button,
} from "../ui";

const pct = (a, b) => (b ? Math.round(((a - b) / b) * 100) : a ? 100 : null);
const shortMonth = (m) => new Date(`${m}-01`).toLocaleDateString("en-IN", { month: "short" });
const shortDay = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function Attention({ a }) {
  const items = [
    { label: "Unread messages", value: a.unreadMessages, to: "/platform/messages", icon: FiMessageSquare, tone: "text-sky-600" },
    { label: "Follow-ups due today", value: a.followUpsToday, to: "/platform/follow-ups?tab=today", icon: FiCheckSquare, tone: "text-emerald-600" },
    { label: "Overdue follow-ups", value: a.followUpsOverdue, to: "/platform/follow-ups?tab=overdue", icon: FiClock, tone: "text-rose-600" },
    { label: "New enquiries", value: a.newEnquiries, to: "/platform/enquiries?status=NEW", icon: FiMail, tone: "text-violet-600" },
    { label: "Failed webhooks (24h)", value: a.failedWebhooks24h, to: "/platform/webhooks", icon: FiZap, tone: "text-amber-600" },
    { label: "Unresolved errors", value: a.unresolvedErrors, to: "/platform/health", icon: FiAlertTriangle, tone: "text-rose-600" },
  ];
  return (
    <Card title="Needs attention" bodyClass="p-2">
      {items.map((i) => (
        <Link key={i.label} to={i.to} className="flex items-center justify-between rounded-xl px-3 py-2.5 hover:bg-[#F6F7F4]">
          <span className="flex items-center gap-2.5 text-sm text-slate-600">
            <i.icon className={i.tone} /> {i.label}
          </span>
          <span className={`text-sm font-bold ${i.value ? "text-slate-900" : "text-slate-300"}`}>{i.value}</span>
        </Link>
      ))}
    </Card>
  );
}

export default function Dashboard() {
  const { data, error, loading, reload } = useApi(() => api.get("/dashboard"), [], { interval: 60000 });
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  const { kpis: k, statusCounts: s, health: h } = data;

  const statusPie = [
    { name: "Active", value: s.ACTIVE },
    { name: "Trial", value: s.TRIAL },
    { name: "Expiring", value: s.EXPIRING },
    { name: "Expired", value: (s.EXPIRED || 0) + (s.TRIAL_EXPIRED || 0) },
    { name: "Suspended", value: s.SUSPENDED },
  ].filter((x) => x.value > 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Dashboard"
        subtitle="Platform-wide overview — revenue, restaurants, users and health."
        actions={<Button variant="secondary" size="sm" onClick={() => reload()}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total revenue" value={inr(k.totalRevenue, { compact: true })} sub={`${num(k.totalPayments)} payments`} icon={FiDollarSign} to="/platform/payments" />
        <Stat
          label="Revenue this month"
          value={inr(k.revenueThisMonth, { compact: true })}
          trend={pct(k.revenueThisMonth, k.revenueLastMonth)}
          sub="vs last month"
          icon={FiTrendingUp}
          tone="blue"
        />
        <Stat label="MRR" value={inr(k.mrr, { compact: true })} sub={`ARR ${inr(k.arr, { compact: true })} · ARPU ${inr(k.arpu)}`} icon={FiPercent} tone="violet" />
        <Stat label="Restaurants" value={num(k.restaurants)} trend={pct(k.newThisMonth, k.newLastMonth)} sub={`${k.newThisMonth} new this month`} icon={FiHome} tone="amber" to="/platform/restaurants" />
        <Stat label="Paying restaurants" value={num(k.payingRestaurants)} sub={`${k.conversionRate}% have paid`} icon={FiCheckSquare} />
        <Stat label="Outlets / branches" value={num(k.outlets)} sub={`${k.activeRestaurantsToday} restaurants active today`} icon={FiMapPin} tone="blue" />
        <Stat label="Users" value={num(k.users)} sub={`${num(k.activeUsers7d)} logged in last 7 days`} icon={FiUsers} tone="violet" />
        <Stat label="GMV (30 days)" value={inr(k.gmv30, { compact: true })} sub={`${num(k.orders30)} orders across restaurants`} icon={FiShoppingBag} tone="amber" />
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <Card title="Revenue & signups" subtitle="Last 12 months" className="xl:col-span-2">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EA" vertical={false} />
                <XAxis dataKey="month" tickFormatter={shortMonth} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="l" tickFormatter={(v) => inr(v, { compact: true })} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={70} />
                <YAxis yAxisId="r" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={30} />
                <Tooltip formatter={(v, n) => (n === "Revenue" ? inr(v) : v)} labelFormatter={shortMonth} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="l" dataKey="revenue" name="Revenue" fill="#3FA34D" radius={[6, 6, 0, 0]} />
                <Bar yAxisId="r" dataKey="signups" name="Signups" fill="#0EA5E9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Attention a={data.attention} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Daily revenue" subtitle="Last 30 days" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={data.dailyRevenue}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3FA34D" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3FA34D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EA" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tickFormatter={(v) => inr(v, { compact: true })} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={64} />
                <Tooltip formatter={(v) => inr(v)} labelFormatter={shortDay} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#3FA34D" strokeWidth={2} fill="url(#rev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Subscription status">
          {statusPie.length ? (
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={statusPie} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {statusPie.map((_, i) => (
                      <Cell key={i} fill={["#3FA34D", "#0EA5E9", "#F59E0B", "#EF4444", "#64748B"][i % 5]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">No restaurants yet</p>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Plan distribution">
          <div className="space-y-3">
            {data.planDistribution.map((p, i) => (
              <div key={p.plan}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{p.plan}</span>
                  <span className="text-slate-500">
                    {p.restaurants} · {inr(p.mrr)}/mo
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full" style={{ width: `${(p.restaurants / Math.max(1, k.restaurants)) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Active restaurants per day" subtitle="Last 14 days (from in-app usage)">
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={data.dailyActive}>
                <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={2} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip labelFormatter={shortDay} />
                <Bar dataKey="restaurants" name="Active restaurants" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="System health" action={<Link to="/platform/health" className="text-xs font-semibold text-[#3FA34D]">Details</Link>}>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Database", h.db ? `${h.dbLatencyMs} ms` : "Down", h.db ? (h.dbLatencyMs > 800 ? "amber" : "green") : "red", FiDatabase],
              ["Avg response", `${h.avgResponseMs} ms`, h.avgResponseMs > 1000 ? "amber" : "green", FiClock],
              ["p95 response", `${h.p95ResponseMs} ms`, h.p95ResponseMs > 1500 ? "amber" : "green", FiClock],
              ["Error rate", `${h.errorRatePct}%`, h.errorRatePct > 5 ? "red" : "green", FiAlertTriangle],
            ].map(([l, v, tone, Icon]) => (
              <div key={l}>
                <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <Icon /> {l}
                </p>
                <p className="mt-1 text-lg font-bold text-slate-900">{v}</p>
                <Badge tone={tone}>{tone === "green" ? "OK" : tone === "amber" ? "Slow" : "Issue"}</Badge>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-400">{h.rpm} req/min · up {Math.round(h.uptimeSec / 3600)}h</p>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Recent signups" bodyClass="p-2" action={<Link to="/platform/restaurants" className="text-xs font-semibold text-[#3FA34D]">All</Link>}>
          {data.recentSignups.map((r) => (
            <Link key={r.id} to={`/platform/restaurants/${r.id}`} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-[#F6F7F4]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{r.name}</p>
                <p className="text-xs text-slate-400">
                  {r.owner} · {ago(r.createdAt)}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </Link>
          ))}
          {!data.recentSignups.length && <p className="p-4 text-sm text-slate-400">No signups yet</p>}
        </Card>
        <Card title="Expiring soon" bodyClass="p-2" action={<Link to="/platform/renewals" className="text-xs font-semibold text-[#3FA34D]">Renewals</Link>}>
          {data.expiringSoon.map((r) => (
            <Link key={r.id} to={`/platform/restaurants/${r.id}`} className="flex items-center justify-between rounded-xl px-3 py-2 hover:bg-[#F6F7F4]">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{r.name}</p>
                <p className="text-xs text-slate-400">
                  {r.planName} · {fmtDate(r.planExpiresAt)}
                </p>
              </div>
              <Badge tone={r.daysLeft <= 3 ? "red" : "amber"}>{r.daysLeft}d left</Badge>
            </Link>
          ))}
          {!data.expiringSoon.length && <p className="p-4 text-sm text-slate-400">Nothing expiring in the next week 🎉</p>}
        </Card>
        <Card title="Recent payments" bodyClass="p-2" action={<Link to="/platform/payments" className="text-xs font-semibold text-[#3FA34D]">All</Link>}>
          {data.recentPayments.map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-xl px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{p.restaurant}</p>
                <p className="text-xs text-slate-400">
                  {p.planName} · {p.source} · {ago(p.createdAt)}
                </p>
              </div>
              <span className="text-sm font-bold text-emerald-600">{inr(p.amount)}</span>
            </div>
          ))}
          {!data.recentPayments.length && <p className="p-4 text-sm text-slate-400">No payments yet</p>}
        </Card>
      </div>

      {data.topRestaurants.length > 0 && (
        <Card title="Top restaurants by sales" subtitle="Last 30 days, all outlets" bodyClass="p-2">
          <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {data.topRestaurants.map((r, i) => (
              <Link key={r.id} to={`/platform/restaurants/${r.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-[#F6F7F4]">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F3F5EE] text-xs font-bold text-slate-500">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{r.name}</p>
                  <p className="text-xs text-slate-400">{num(r.orders)} orders</p>
                </div>
                <span className="text-sm font-semibold text-slate-800">{inr(r.sales, { compact: true })}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
