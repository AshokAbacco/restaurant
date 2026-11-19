// client/src/platform/pages/Health.jsx — /platform/health
import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { FiDatabase, FiServer, FiCpu, FiClock, FiAlertTriangle, FiCheckCircle, FiActivity, FiHardDrive, FiChevronRight } from "react-icons/fi";
import { api } from "../api";
import { usePlatformAuth } from "../PlatformAuth";
import { Card, PageHeader, Stat, Badge, StatusBadge, Button, Tabs, Table, Loading, ErrorBox, Drawer, Empty, ProgressBar, num, duration, fmtDateTime, ago, useApi, cx } from "../ui";

const t = (v) => new Date(v).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
const td = (v) => new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit" });

const SEV_STYLE = {
  critical: "border-rose-200 bg-rose-50",
  warning: "border-amber-200 bg-amber-50",
  info: "border-sky-200 bg-sky-50",
};

export default function Health() {
  const { can } = usePlatformAuth();
  const [range, setRange] = useState("24h");
  const { data, error, loading, reload } = useApi(() => api.get("/health", { range }), [range], { interval: 30000 });
  const [errView, setErrView] = useState(null);
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  const { server: s, database: db, live, services } = data;
  const memPct = Math.round((s.memory.heapUsedMb / Math.max(1, s.memory.heapTotalMb)) * 100);

  const resolve = async (id) => {
    try {
      if (id) await api.post(`/health/errors/${id}/resolve`);
      else await api.post("/health/errors/resolve-all");
      toast.success("Resolved");
      setErrView(null);
      reload({ silent: true });
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="System health"
        subtitle={`Server, database and process checks · refreshed ${ago(data.checkedAt)}`}
        actions={
          <>
            <div className={cx("flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-bold", data.status === "healthy" ? "bg-emerald-50 text-emerald-700" : data.status === "degraded" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700")}>
              <span className={cx("h-2.5 w-2.5 animate-pulse rounded-full", data.status === "healthy" ? "bg-emerald-500" : data.status === "degraded" ? "bg-amber-500" : "bg-rose-500")} />
              {data.status === "healthy" ? "All systems normal" : data.status === "degraded" ? "Degraded" : "Action needed"}
            </div>
            <Button variant="secondary" size="sm" onClick={() => reload()}>Refresh</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Database ping" value={db.ok ? `${db.latencyMs} ms` : "DOWN"} sub={db.sizeMb ? `${num(db.sizeMb)} MB on disk` : db.error || ""} icon={FiDatabase} tone={!db.ok ? "red" : db.latencyMs > data.thresholds.dbLatencyWarnMs ? "amber" : "green"} />
        <Stat label="API response (1h)" value={`${live.summary.avgMs} ms`} sub={`p95 ${live.summary.p95Ms} ms · p99 ${live.summary.p99Ms} ms`} icon={FiClock} tone={live.summary.p95Ms > data.thresholds.slowResponseMs ? "amber" : "blue"} />
        <Stat label="Requests (1h)" value={num(live.summary.requests)} sub={`${live.summary.rpm}/min · ${live.summary.errorRatePct}% 5xx`} icon={FiActivity} tone={live.summary.errorRatePct > data.thresholds.errorRateWarnPct ? "red" : "violet"} />
        <Stat label="Uptime" value={duration(s.uptimeSec)} sub={`since ${fmtDateTime(s.startedAt)}`} icon={FiServer} tone="slate" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Pending issues" subtitle={`${data.issues.length} open`} className="lg:col-span-2" bodyClass="p-3">
          {data.issues.length ? (
            <div className="space-y-2">
              {data.issues.map((i) => (
                <Link key={i.title} to={i.link || "#"} className={cx("flex items-center justify-between gap-3 rounded-xl border px-4 py-3", SEV_STYLE[i.severity])}>
                  <div className="flex items-start gap-3">
                    <FiAlertTriangle className={cx("mt-0.5 shrink-0", i.severity === "critical" ? "text-rose-600" : i.severity === "warning" ? "text-amber-600" : "text-sky-600")} />
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {i.title} {i.count > 1 && <span className="font-normal text-slate-500">({i.count})</span>}
                      </p>
                      <p className="text-xs text-slate-600">{i.detail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={i.severity} />
                    <FiChevronRight className="text-slate-400" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Empty icon={FiCheckCircle} title="No pending issues" text="Database, API, payments, messages and follow-ups all look fine." />
          )}
        </Card>
        <Card title="Server">
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex justify-between text-xs"><span className="flex items-center gap-1.5 text-slate-600"><FiCpu /> CPU load</span><b>{s.cpuLoadPct}%</b></div>
              <ProgressBar value={s.cpuLoadPct} tone={s.cpuLoadPct > 80 ? "red" : s.cpuLoadPct > 60 ? "amber" : "green"} />
              <p className="mt-1 text-[11px] text-slate-400">{s.cpuCount} cores · load {s.loadAvg.join(" / ")}</p>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs"><span className="flex items-center gap-1.5 text-slate-600"><FiHardDrive /> Heap</span><b>{s.memory.heapUsedMb} / {s.memory.heapTotalMb} MB</b></div>
              <ProgressBar value={memPct} tone={memPct > 85 ? "red" : memPct > 70 ? "amber" : "green"} />
              <p className="mt-1 text-[11px] text-slate-400">RSS {s.memory.rssMb} MB · system free {num(s.memory.systemFreeMb)} / {num(s.memory.systemTotalMb)} MB</p>
            </div>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Badge>Node {s.node}</Badge>
              <Badge>{s.env}</Badge>
              <Badge tone={services.email ? "green" : "red"}>Email</Badge>
              <Badge tone={services.razorpay ? "green" : "red"}>Razorpay</Badge>
              <Badge tone={services.webhookSecret ? "green" : "red"}>Webhook secret</Badge>
              <Badge tone={services.storage ? "green" : "slate"}>Storage</Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#F6F7F4] p-3 text-xs">
              {Object.entries(db.rows).map(([k, v]) => (
                <div key={k}><p className="text-slate-400">{k}</p><p className="font-bold text-slate-800">{v === null ? "—" : num(v)}</p></div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Live — response time" subtitle="Last 60 minutes, per minute">
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={live.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EA" vertical={false} />
                <XAxis dataKey="t" tickFormatter={t} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={9} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} unit="ms" />
                <Tooltip labelFormatter={t} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="avgMs" name="avg" stroke="#3FA34D" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="p95Ms" name="p95" stroke="#F59E0B" dot={false} strokeWidth={1.5} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Live — traffic & errors" subtitle="Requests per minute">
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={live.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EA" vertical={false} />
                <XAxis dataKey="t" tickFormatter={t} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={9} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={32} />
                <Tooltip labelFormatter={t} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="requests" name="requests" stackId="a" fill="#0EA5E9" />
                <Bar dataKey="errors" name="5xx" stackId="a" fill="#EF4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Database latency" subtitle="Ping every minute">
          <div className="h-48">
            <ResponsiveContainer>
              <AreaChart data={live.dbPings}>
                <XAxis dataKey="t" tickFormatter={t} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={9} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} unit="ms" />
                <Tooltip labelFormatter={t} />
                <Area dataKey="ms" name="DB ping" stroke="#8B5CF6" fill="#8B5CF622" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Status codes (1h)" bodyClass="p-5">
          <div className="grid grid-cols-4 gap-3 text-center">
            {Object.entries(live.statusMix).map(([k, v]) => (
              <div key={k} className="rounded-xl bg-[#F6F7F4] py-4">
                <p className={cx("text-2xl font-black", k === "5xx" ? "text-rose-600" : k === "4xx" ? "text-amber-600" : "text-slate-800")}>{num(v)}</p>
                <p className="text-xs text-slate-500">{k}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title="History"
        subtitle="Stored snapshots — survives restarts"
        action={<Tabs value={range} onChange={setRange} tabs={["6h", "24h", "7d", "30d"].map((v) => ({ value: v, label: v }))} />}
      >
        {data.history.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="h-56">
              <ResponsiveContainer>
                <LineChart data={data.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EA" vertical={false} />
                  <XAxis dataKey="t" tickFormatter={td} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} unit="ms" />
                  <Tooltip labelFormatter={td} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="avgMs" name="API avg" stroke="#3FA34D" dot={false} />
                  <Line dataKey="p95Ms" name="API p95" stroke="#F59E0B" dot={false} />
                  <Line dataKey="dbMs" name="DB ping" stroke="#8B5CF6" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="h-56">
              <ResponsiveContainer>
                <AreaChart data={data.history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EA" vertical={false} />
                  <XAxis dataKey="t" tickFormatter={td} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} minTickGap={40} />
                  <YAxis yAxisId="l" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} />
                  <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={40} unit="MB" />
                  <Tooltip labelFormatter={td} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area yAxisId="l" dataKey="requests" name="Requests" stroke="#0EA5E9" fill="#0EA5E922" />
                  <Area yAxisId="l" dataKey="errors" name="5xx" stroke="#EF4444" fill="#EF444422" />
                  <Area yAxisId="r" dataKey="memoryMb" name="Memory" stroke="#64748B" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">Snapshots are written every few minutes — check back shortly.</p>
        )}
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Slowest endpoints (1h)" bodyClass="p-0">
          <Table dense rows={live.slowest} rowKey="route" empty={<Empty title="No traffic yet" />} columns={[
            { key: "route", label: "Endpoint", render: (r) => <code className="text-[11px]">{r.route}</code> },
            { key: "count", label: "Calls", align: "right" },
            { key: "avg", label: "Avg", align: "right", render: (r) => <b className={r.avg > data.thresholds.slowResponseMs ? "text-rose-600" : ""}>{r.avg} ms</b> },
            { key: "max", label: "Max", align: "right", render: (r) => `${r.max} ms` },
          ]} />
        </Card>
        <Card title="Busiest endpoints (1h)" bodyClass="p-0">
          <Table dense rows={live.busiest} rowKey="route" empty={<Empty title="No traffic yet" />} columns={[
            { key: "route", label: "Endpoint", render: (r) => <code className="text-[11px]">{r.route}</code> },
            { key: "count", label: "Calls", align: "right" },
            { key: "avg", label: "Avg", align: "right", render: (r) => `${r.avg} ms` },
            { key: "errors", label: "5xx", align: "right", render: (r) => (r.errors ? <b className="text-rose-600">{r.errors}</b> : 0) },
          ]} />
        </Card>
      </div>

      <div id="errors">
        <Card
          title="Unresolved server errors"
          subtitle="5xx responses and unhandled exceptions"
          bodyClass="p-0"
          action={can("health.write") && data.recentErrors.length > 0 && <Button size="sm" variant="secondary" onClick={() => resolve(null)}>Resolve all</Button>}
        >
          <Table
            onRowClick={(e) => setErrView(e)}
            rows={data.recentErrors}
            empty={<Empty icon={FiCheckCircle} title="No unresolved errors" />}
            columns={[
              { key: "at", label: "When", render: (e) => <span className="whitespace-nowrap text-xs">{fmtDateTime(e.createdAt)}</span> },
              { key: "req", label: "Request", render: (e) => <code className="text-[11px]">{e.method} {e.path}</code> },
              { key: "st", label: "Status", render: (e) => <Badge tone="red">{e.statusCode}</Badge> },
              { key: "msg", label: "Message", render: (e) => <span className="line-clamp-1 max-w-md text-xs text-slate-600">{e.message}</span> },
            ]}
          />
        </Card>
      </div>

      {errView && (
        <Drawer
          open
          onClose={() => setErrView(null)}
          title="Server error"
          width="max-w-2xl"
          footer={can("health.write") && <Button onClick={() => resolve(errView.id)}>Mark resolved</Button>}
        >
          <p className="text-sm font-semibold text-slate-900">{errView.message}</p>
          <p className="mt-1 text-xs text-slate-500">
            {errView.method} {errView.path} · HTTP {errView.statusCode} · {fmtDateTime(errView.createdAt)}
            {errView.organizationId && (
              <>
                {" · "}
                <Link className="text-[#3FA34D]" to={`/platform/restaurants/${errView.organizationId}`}>restaurant</Link>
              </>
            )}
          </p>
          {errView.stack && <pre className="mt-4 max-h-[60vh] overflow-auto rounded-xl bg-slate-900 p-3 text-[11px] text-rose-200">{errView.stack}</pre>}
        </Drawer>
      )}
    </div>
  );
}
