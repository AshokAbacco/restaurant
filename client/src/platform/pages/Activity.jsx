// client/src/platform/pages/Activity.jsx — /platform/activity
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { FiActivity, FiMoon, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { api } from "../api";
import {
  Card,
  PageHeader,
  Tabs,
  Table,
  StatusBadge,
  Badge,
  Stat,
  Select,
  SearchInput,
  Pagination,
  Loading,
  ProgressBar,
  Empty,
  num,
  ago,
  minutes,
  fmtDateTime,
  titleCase,
  useApi,
  cx,
} from "../ui";

const shortDay = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function Usage() {
  const [sp, setSp] = useSearchParams();
  const days = sp.get("days") || "30";
  const health = sp.get("health") || "";
  const q = sp.get("q") || "";
  const sort = sp.get("sort") || "inactive";
  const module = sp.get("module") || "";
  const notUsing = sp.get("notUsing") || "";
  const page = Number(sp.get("page") || 1);
  const set = (patch) =>
    setSp(Object.fromEntries(Object.entries({ tab: "usage", days, health, q, sort, module, notUsing, ...patch }).filter(([, v]) => v)));
  const { data, loading } = useApi(() => api.get("/activity/usage", { days, health, q, sort, module, notUsing, page }), [days, health, q, sort, module, notUsing, page]);
  if (loading && !data) return <Loading />;
  const hc = data.healthCounts;
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Restaurants tracked" value={num(hc.ACTIVE + hc.INACTIVE + hc.CHURN_RISK)} icon={FiActivity} tone="slate" />
        <Stat label={`Active (< ${data.thresholds.inactiveAfter}d)`} value={num(hc.ACTIVE)} icon={FiCheckCircle} to="?tab=usage&health=ACTIVE" />
        <Stat label={`Inactive (${data.thresholds.inactiveAfter}+ days)`} value={num(hc.INACTIVE)} icon={FiMoon} tone="amber" to="?tab=usage&health=INACTIVE" />
        <Stat label={`Churn risk (${data.thresholds.churnAfter}+ days)`} value={num(hc.CHURN_RISK)} icon={FiAlertTriangle} tone="red" to="?tab=usage&health=CHURN_RISK" />
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Feature adoption" subtitle={`% of active restaurants using each module (last ${days} days)`}>
          <div className="space-y-2.5">
            {data.adoption.map((m) => (
              <button key={m.key} className="block w-full text-left" onClick={() => set({ module: m.key, notUsing: "" })}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className="font-medium text-slate-700">{m.label}</span>
                  <span className="text-slate-500">{m.restaurants} · {m.pct}% · {minutes(m.minutes)}</span>
                </div>
                <ProgressBar value={m.pct} tone={m.pct >= 50 ? "green" : m.pct >= 20 ? "amber" : "red"} />
              </button>
            ))}
          </div>
        </Card>
        <Card title="Active restaurants per day">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={data.dailyActive}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EA" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={Math.ceil(Number(days) / 10)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip labelFormatter={shortDay} />
                <Bar dataKey="restaurants" name="Restaurants" fill="#3FA34D" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0EA] p-3">
          <Select className="!w-36" value={days} onChange={(e) => set({ days: e.target.value })} options={["7", "30", "90", "180"].map((v) => ({ value: v, label: `Last ${v} days` }))} />
          <Select className="!w-40" value={health} onChange={(e) => set({ health: e.target.value })} placeholder="Any activity" options={[{ value: "ACTIVE", label: "Active" }, { value: "INACTIVE", label: "Inactive" }, { value: "CHURN_RISK", label: "Churn risk" }]} />
          <Select className="!w-44" value={module} onChange={(e) => set({ module: e.target.value })} placeholder="Any feature" options={data.modules.map((m) => ({ value: m.key, label: m.label }))} />
          {module && (
            <Select className="!w-36" value={notUsing} onChange={(e) => set({ notUsing: e.target.value })} options={[{ value: "", label: "Using it" }, { value: "1", label: "NOT using it" }]} />
          )}
          <Select className="!w-44" value={sort} onChange={(e) => set({ sort: e.target.value })} options={[{ value: "inactive", label: "Most inactive" }, { value: "lastActive", label: "Recently active" }, { value: "minutes", label: "Most time spent" }, { value: "name", label: "Name" }]} />
          <SearchInput value={q} onChange={(v) => set({ q: v })} />
        </div>
        <Table
          rows={data.rows}
          columns={[
            { key: "name", label: "Restaurant", render: (r) => <Link to={`/platform/restaurants/${r.id}?tab=usage`} className="font-semibold text-slate-900 hover:text-[#3FA34D]">{r.name}<p className="text-xs font-normal text-slate-500">{r.planName}</p></Link> },
            { key: "h", label: "Activity", render: (r) => <StatusBadge status={r.health} /> },
            { key: "last", label: "Last active", render: (r) => <span className="text-xs">{ago(r.lastActiveAt)}</span> },
            { key: "inact", label: "Inactive", render: (r) => <span className={cx("text-sm font-semibold", r.inactiveDays >= data.thresholds.churnAfter ? "text-rose-600" : r.inactiveDays >= data.thresholds.inactiveAfter ? "text-amber-600" : "text-slate-600")}>{r.inactiveDays}d</span> },
            { key: "time", label: "Time in app", render: (r) => <span className="text-xs">{minutes(r.activeMinutes)} · {r.activeDays}d</span> },
            {
              key: "used",
              label: "Using",
              render: (r) => (
                <div className="flex max-w-[280px] flex-wrap gap-1">
                  {r.used.length ? r.used.map((k) => <Badge key={k} tone="green">{k}</Badge>) : <span className="text-xs text-slate-400">nothing tracked</span>}
                </div>
              ),
            },
            {
              key: "unused",
              label: "Not using",
              render: (r) => (
                <div className="flex max-w-[280px] flex-wrap gap-1">
                  {r.unused.slice(0, 6).map((k) => <Badge key={k}>{k}</Badge>)}
                  {r.unused.length > 6 && <span className="text-[11px] text-slate-400">+{r.unused.length - 6}</span>}
                </div>
              ),
            },
          ]}
        />
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(p) => set({ page: String(p) })} />
      </Card>
    </div>
  );
}

function Feed({ source }) {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [action, setAction] = useState("");
  const { data, loading } = useApi(() => api.get("/activity/feed", { source, page, q, action }), [source, page, q, action]);
  if (loading && !data) return <Loading />;
  const columns =
    source === "platform"
      ? [
          { key: "at", label: "When", render: (a) => <span className="whitespace-nowrap text-xs">{fmtDateTime(a.createdAt)}</span> },
          { key: "who", label: "Team member", render: (a) => a.admin?.name || "System" },
          { key: "action", label: "Action", render: (a) => <Badge tone={a.action.includes("FAILED") ? "red" : a.action.includes("DELETED") || a.action.includes("SUSPENDED") ? "amber" : "slate"}>{titleCase(a.action)}</Badge> },
          { key: "entity", label: "Entity", render: (a) => <span className="text-xs">{a.entityType || "—"} {a.entityId ? `#${a.entityId.slice(0, 8)}` : ""}</span> },
          { key: "meta", label: "Details", render: (a) => <span className="block max-w-md truncate text-xs text-slate-500">{a.metadata ? JSON.stringify(a.metadata) : ""}</span> },
          { key: "ip", label: "IP", render: (a) => <span className="text-xs text-slate-400">{a.ip || ""}</span> },
        ]
      : source === "logins"
        ? [
            { key: "at", label: "Last login", render: (u) => <span className="whitespace-nowrap text-xs">{fmtDateTime(u.lastLoginAt)} · {ago(u.lastLoginAt)}</span> },
            { key: "who", label: "User", render: (u) => <div><p className="font-medium">{u.employee?.fullName || u.username}</p><p className="text-xs text-slate-500">{u.email}</p></div> },
            { key: "role", label: "Role", render: (u) => <Badge>{u.role}</Badge> },
            { key: "org", label: "Restaurant", render: (u) => <Link className="text-[#3FA34D]" to={`/platform/restaurants/${u.organization?.id}`}>{u.organization?.name}</Link> },
            { key: "outlet", label: "Outlet", render: (u) => u.outlet?.name || "—" },
          ]
        : [
            { key: "at", label: "When", render: (a) => <span className="whitespace-nowrap text-xs">{fmtDateTime(a.createdAt)}</span> },
            { key: "org", label: "Restaurant", render: (a) => <Link className="text-[#3FA34D]" to={`/platform/restaurants/${a.outlet?.organization?.id}`}>{a.outlet?.organization?.name}</Link> },
            { key: "outlet", label: "Outlet", render: (a) => a.outlet?.name },
            { key: "action", label: "Action", render: (a) => <Badge>{titleCase(a.action)}</Badge> },
            { key: "by", label: "By", render: (a) => a.performedByRole || "system" },
            { key: "meta", label: "Details", render: (a) => <span className="block max-w-md truncate text-xs text-slate-500">{a.metadata ? JSON.stringify(a.metadata) : ""}</span> },
          ];
  return (
    <Card bodyClass="p-0">
      {source !== "logins" && (
        <div className="flex flex-wrap gap-2 border-b border-[#EEF0EA] p-3">
          <SearchInput value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search action / entity…" />
          {data.actions && (
            <Select className="!w-56" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="All actions" options={data.actions.map((a) => ({ value: a, label: titleCase(a) }))} />
          )}
        </div>
      )}
      <Table rows={data.items} columns={columns} empty={<Empty title="No activity yet" />} />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
    </Card>
  );
}

export default function Activity() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "usage";
  return (
    <div>
      <PageHeader title="Activity log" subtitle="Which features restaurants use, who has gone quiet, and every action taken on the platform." />
      <Tabs
        className="mb-5"
        value={tab}
        onChange={(v) => setSp({ tab: v })}
        tabs={[
          { value: "usage", label: "Feature usage & inactivity" },
          { value: "logins", label: "Restaurant logins" },
          { value: "restaurants", label: "Restaurant audit trail" },
          { value: "platform", label: "Platform team actions" },
        ]}
      />
      {tab === "usage" ? <Usage /> : <Feed key={tab} source={tab} />}
    </div>
  );
}
