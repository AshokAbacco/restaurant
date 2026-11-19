// client/src/platform/pages/Restaurants.jsx — /platform/restaurants
import { useNavigate, useSearchParams } from "react-router-dom";
import { FiDownload } from "react-icons/fi";
import toast from "react-hot-toast";
import { api, downloadCsv } from "../api";
import {
  Card,
  PageHeader,
  Table,
  Tabs,
  SearchInput,
  Select,
  StatusBadge,
  Pagination,
  Loading,
  ErrorBox,
  Button,
  Badge,
  inr,
  fmtDate,
  ago,
  useApi,
} from "../ui";

const STATUS_TABS = [
  ["ALL", "All"],
  ["ACTIVE", "Active"],
  ["TRIAL", "Trial"],
  ["EXPIRING", "Expiring"],
  ["EXPIRED", "Expired"],
  ["TRIAL_EXPIRED", "Trial expired"],
  ["SUSPENDED", "Suspended"],
];

export default function Restaurants() {
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const params = {
    status: sp.get("status") || "ALL",
    q: sp.get("q") || "",
    sort: sp.get("sort") || "newest",
    page: Number(sp.get("page") || 1),
    plan: sp.get("plan") || "",
  };
  const update = (patch) => {
    const next = { ...params, page: 1, ...patch };
    const s = new URLSearchParams();
    Object.entries(next).forEach(([k, v]) => v && v !== "ALL" && !(k === "page" && v === 1) && s.set(k, v));
    setSp(s);
  };
  const { data, error, loading, reload } = useApi(() => api.get("/restaurants", { ...params, pageSize: 25 }), [sp.toString()]);
  const plans = useApi(() => api.get("/plans").catch(() => ({ plans: [] })), []);

  return (
    <div>
      <PageHeader
        title="Restaurants"
        subtitle="Every restaurant on the platform. Click one for its complete profile."
        actions={
          <Button
            variant="secondary"
            icon={FiDownload}
            onClick={() => downloadCsv("/restaurants/export", params).catch((e) => toast.error(e.message))}
          >
            Export CSV
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs
          value={params.status}
          onChange={(v) => update({ status: v })}
          tabs={STATUS_TABS.map(([v, l]) => ({ value: v, label: l, count: data?.counts?.[v] }))}
        />
      </div>
      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0EA] p-3">
          <SearchInput value={params.q} onChange={(q) => update({ q })} placeholder="Search name, owner, email, phone…" />
          <Select
            className="w-44"
            value={params.plan}
            onChange={(e) => update({ plan: e.target.value })}
            placeholder="All plans"
            options={(plans.data?.plans || []).map((p) => ({ value: p.code, label: p.name }))}
          />
          <Select
            className="w-48"
            value={params.sort}
            onChange={(e) => update({ sort: e.target.value })}
            options={[
              { value: "newest", label: "Newest first" },
              { value: "oldest", label: "Oldest first" },
              { value: "name", label: "Name A–Z" },
              { value: "expiry", label: "Expiry soonest" },
              { value: "lastActive", label: "Recently active" },
              { value: "inactive", label: "Most inactive" },
              { value: "revenue", label: "Highest revenue" },
            ]}
          />
        </div>
        {error && <div className="p-3"><ErrorBox error={error} onRetry={reload} /></div>}
        {loading && !data ? (
          <Loading />
        ) : (
          <>
            <Table
              onRowClick={(r) => navigate(`/platform/restaurants/${r.id}`)}
              rows={data?.restaurants}
              columns={[
                {
                  key: "name",
                  label: "Restaurant",
                  render: (r) => (
                    <div className="min-w-[180px]">
                      <p className="font-semibold text-slate-900">{r.name}</p>
                      <p className="text-xs text-slate-500">
                        {r.owner?.fullName} · {r.ownerEmail}
                      </p>
                    </div>
                  ),
                },
                { key: "phone", label: "Phone", render: (r) => <span className="whitespace-nowrap text-xs">{r.owner?.phone || "—"}</span> },
                {
                  key: "plan",
                  label: "Plan",
                  render: (r) => (
                    <div>
                      <p className="text-sm">{r.planName}</p>
                      <p className="text-[11px] text-slate-400">{r.branchLimit} branch{r.branchLimit > 1 ? "es" : ""}</p>
                    </div>
                  ),
                },
                { key: "status", label: "Status", render: (r) => <StatusBadge status={r.status} /> },
                {
                  key: "exp",
                  label: "Expires",
                  render: (r) => (
                    <div className="whitespace-nowrap text-xs">
                      {fmtDate(r.planExpiresAt)}
                      {r.daysLeft !== null && r.daysLeft >= 0 && r.daysLeft <= 14 && <p className="text-amber-600">{r.daysLeft}d left</p>}
                    </div>
                  ),
                },
                { key: "outlets", label: "Outlets", align: "right" },
                { key: "users", label: "Users", align: "right" },
                {
                  key: "active",
                  label: "Last active",
                  render: (r) => (
                    <span className={`whitespace-nowrap text-xs ${r.inactiveDays >= 14 ? "text-rose-600" : r.inactiveDays >= 7 ? "text-amber-600" : "text-slate-600"}`}>
                      {ago(r.lastActiveAt)}
                    </span>
                  ),
                },
                { key: "revenue", label: "Revenue", align: "right", render: (r) => <span className="font-semibold">{inr(r.revenue)}</span> },
                {
                  key: "flags",
                  label: "",
                  render: (r) => (
                    <div className="flex gap-1">
                      {r.unreadMessages > 0 && <Badge tone="blue">{r.unreadMessages} msg</Badge>}
                      {r.openFollowUps > 0 && <Badge tone="violet">{r.openFollowUps} FU</Badge>}
                    </div>
                  ),
                },
              ]}
            />
            <Pagination page={data?.page || 1} pageSize={data?.pageSize || 25} total={data?.total || 0} onChange={(p) => update({ page: p })} />
          </>
        )}
      </Card>
    </div>
  );
}
