// client/src/platform/pages/Renewals.jsx — /platform/renewals
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiRefreshCw, FiBell, FiClock, FiCheckSquare, FiTrendingUp, FiAlertCircle, FiCalendar, FiSlash, FiLayers } from "react-icons/fi";
import { api } from "../api";
import { usePlatformAuth } from "../PlatformAuth";
import {
  Card,
  PageHeader,
  Tabs,
  Table,
  StatusBadge,
  Badge,
  Button,
  Stat,
  Loading,
  ErrorBox,
  Select,
  SearchInput,
  Pagination,
  Empty,
  inr,
  fmtDate,
  ago,
  titleCase,
  fmtDateTime,
  useApi,
} from "../ui";
import { RenewModal, ExtendModal, RemindModal, FollowUpModal } from "../components";

export default function Renewals() {
  const [sp, setSp] = useSearchParams();
  const view = sp.get("view") || "expiring";
  const windowDays = sp.get("window") || "30";
  const q = sp.get("q") || "";
  const page = Number(sp.get("page") || 1);
  const { can } = usePlatformAuth();
  const set = (patch) => {
    const next = { view, window: windowDays, q, ...patch };
    if (!("page" in patch)) delete next.page;
    setSp(Object.fromEntries(Object.entries(next).filter(([, v]) => v)));
  };
  const { data, error, loading, reload } = useApi(() => api.get("/renewals", { view, window: windowDays, q, page }), [view, windowDays, q, page]);
  const [modal, setModal] = useState(null);
  const [target, setTarget] = useState(null);
  const open = (m, r) => {
    setTarget(r);
    setModal(m);
  };

  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorBox error={error} onRetry={reload} />;
  const c = data.counts;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Renewals & plans"
        subtitle="Who is about to expire, who has lapsed — renew, upgrade, extend trials and chase payment from here."
        actions={
          <Link to="/platform/plans">
            <Button variant="secondary" icon={FiLayers}>Manage plans</Button>
          </Link>
        }
      />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label={`Paid plans expiring (${windowDays}d)`} value={c.expiring} icon={FiCalendar} tone="amber" />
        <Stat label={`Trials ending (${windowDays}d)`} value={c.trialsEnding} icon={FiClock} tone="blue" />
        <Stat label="Expired" value={c.expired} icon={FiAlertCircle} tone="red" />
        <Stat label="Suspended" value={c.suspended} icon={FiSlash} tone="slate" />
        <Stat label="Renewal revenue at stake" value={inr(data.expectedRevenue, { compact: true })} sub={`${data.renewedThisMonth} renewed this month`} icon={FiTrendingUp} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Card bodyClass="p-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0EA] p-3">
            <Tabs
              value={view}
              onChange={(v) => set({ view: v })}
              tabs={[
                { value: "expiring", label: "Expiring", count: c.expiring },
                { value: "trialsEnding", label: "Trials ending", count: c.trialsEnding },
                { value: "expired", label: "Expired", count: c.expired },
                { value: "suspended", label: "Suspended", count: c.suspended },
              ]}
            />
            <Select
              className="w-36"
              value={windowDays}
              onChange={(e) => set({ window: e.target.value })}
              options={["7", "15", "30", "60", "90"].map((v) => ({ value: v, label: `Next ${v} days` }))}
            />
            <SearchInput value={q} onChange={(v) => set({ q: v })} />
          </div>
          <Table
            rows={data.rows}
            empty={<Empty title="Nothing here" text="No restaurants match this view." />}
            columns={[
              {
                key: "name",
                label: "Restaurant",
                render: (r) => (
                  <Link to={`/platform/restaurants/${r.id}?tab=subscription`} className="block min-w-[160px]">
                    <p className="font-semibold text-slate-900 hover:text-[#3FA34D]">{r.name}</p>
                    <p className="text-xs text-slate-500">{r.owner?.fullName} · {r.owner?.phone}</p>
                  </Link>
                ),
              },
              { key: "plan", label: "Plan", render: (r) => <span className="text-sm">{r.planName} · {r.branchLimit} br</span> },
              {
                key: "exp",
                label: "Expiry",
                render: (r) => (
                  <div className="whitespace-nowrap">
                    <p className="text-sm">{fmtDate(r.planExpiresAt)}</p>
                    {r.daysLeft !== null && (
                      <Badge tone={r.daysLeft < 0 ? "red" : r.daysLeft <= 3 ? "red" : r.daysLeft <= 7 ? "amber" : "slate"}>
                        {r.daysLeft < 0 ? `${-r.daysLeft}d ago` : `${r.daysLeft}d left`}
                      </Badge>
                    )}
                  </div>
                ),
              },
              { key: "st", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
              { key: "act", label: "Last active", render: (r) => <span className="text-xs">{ago(r.lastActiveAt)}</span> },
              { key: "rev", label: "Paid so far", align: "right", render: (r) => inr(r.revenue) },
              {
                key: "fu",
                label: "Follow-up",
                render: (r) => (r.nextFollowUpAt ? <span className="text-xs text-violet-600">{fmtDate(r.nextFollowUpAt)}</span> : <span className="text-xs text-slate-300">none</span>),
              },
              {
                key: "a",
                label: "",
                render: (r) => (
                  <div className="flex justify-end gap-1">
                    {can("renewals.write") && (
                      <>
                        <Button size="sm" onClick={() => open("renew", r)} icon={FiRefreshCw}>Renew</Button>
                        <Button size="sm" variant="secondary" onClick={() => open("extend", r)} title="Extend" icon={FiClock} />
                        <Button size="sm" variant="secondary" onClick={() => open("remind", r)} title="Send reminder" icon={FiBell} />
                      </>
                    )}
                    {can("followups.write") && <Button size="sm" variant="secondary" onClick={() => open("fu", r)} title="Follow-up" icon={FiCheckSquare} />}
                  </div>
                ),
              },
            ]}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={(p) => set({ page: String(p) })} />
        </Card>

        <div className="space-y-5">
          <Card title="Active plans" bodyClass="p-2" action={<Link to="/platform/plans" className="text-xs font-semibold text-[#3FA34D]">Edit</Link>}>
            {data.plans.map((p) => (
              <div key={p.code} className="flex items-center justify-between rounded-xl px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.isTrial ? `${p.trialDays || 30}-day trial` : `${p.months} month(s) · ${titleCase(p.cycle)}`}</p>
                </div>
                <span className="text-sm font-semibold">{p.isTrial ? "Free" : `${inr(p.price)}/br/mo`}</span>
              </div>
            ))}
          </Card>
          <Card title="Recent plan activity" bodyClass="p-2">
            {data.recentEvents.map((e) => (
              <Link key={e.id} to={`/platform/restaurants/${e.organization?.id}?tab=subscription`} className="block rounded-xl px-3 py-2 hover:bg-[#F6F7F4]">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-800">{e.organization?.name}</p>
                  <Badge tone={e.type === "REMINDER_SENT" ? "slate" : "green"}>{titleCase(e.type)}</Badge>
                </div>
                <p className="text-xs text-slate-400">
                  {e.toExpiry ? `until ${fmtDate(e.toExpiry)} · ` : ""}
                  {e.amount ? `${inr(e.amount)} · ` : ""}
                  {fmtDateTime(e.createdAt)}
                </p>
              </Link>
            ))}
            {!data.recentEvents.length && <p className="p-3 text-sm text-slate-400">No renewals yet.</p>}
          </Card>
        </div>
      </div>

      <RenewModal open={modal === "renew"} onClose={() => setModal(null)} restaurant={target} onDone={() => reload({ silent: true })} />
      <ExtendModal open={modal === "extend"} onClose={() => setModal(null)} restaurant={target} onDone={() => reload({ silent: true })} />
      <RemindModal open={modal === "remind"} onClose={() => setModal(null)} restaurant={target} onDone={() => reload({ silent: true })} />
      <FollowUpModal
        open={modal === "fu"}
        onClose={() => setModal(null)}
        defaults={
          target
            ? {
                organizationId: target.id,
                organizationName: target.name,
                type: "RENEWAL",
                priority: "HIGH",
                title: `Renewal: ${target.name}`,
                notes: `${target.planName} expires ${fmtDate(target.planExpiresAt)}`,
              }
            : {}
        }
        onDone={() => reload({ silent: true })}
      />
    </div>
  );
}
