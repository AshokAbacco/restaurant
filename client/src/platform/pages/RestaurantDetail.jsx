// client/src/platform/pages/RestaurantDetail.jsx — /platform/restaurants/:id
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  FiRefreshCw,
  FiClock,
  FiBell,
  FiMessageSquare,
  FiCheckSquare,
  FiSlash,
  FiPlay,
  FiShoppingBag,
  FiDollarSign,
  FiUsers,
  FiMapPin,
  FiBookOpen,
  FiGrid,
} from "react-icons/fi";
import { api } from "../api";
import { usePlatformAuth } from "../PlatformAuth";
import {
  Card,
  PageHeader,
  Tabs,
  Table,
  KeyValue,
  StatusBadge,
  Badge,
  Button,
  Stat,
  Loading,
  ErrorBox,
  Textarea,
  Input,
  Empty,
  ProgressBar,
  inr,
  num,
  fmtDate,
  fmtDateTime,
  ago,
  minutes,
  titleCase,
  useApi,
  Select,
} from "../ui";
import { RenewModal, ExtendModal, RemindModal, FollowUpModal, NewConversationModal, ConfirmModal } from "../components";
import Thread from "../Thread";

const shortDay = (d) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

function Overview({ d, reload }) {
  const { can } = usePlatformAuth();
  const r = d.restaurant;
  const [notes, setNotes] = useState(r.platformNotes || "");
  const [limit, setLimit] = useState(r.branchLimit);
  const save = async (data) => {
    try {
      await api.patch(`/restaurants/${r.id}`, data);
      toast.success("Saved");
      reload({ silent: true });
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Sales (30 days)" value={inr(d.stats.sales30, { compact: true })} sub={`${num(d.stats.orders30)} orders · AOV ${inr(d.stats.avgOrderValue30)}`} icon={FiShoppingBag} />
        <Stat label="Lifetime sales" value={inr(d.stats.salesTotal, { compact: true })} sub={`${num(d.stats.ordersTotal)} orders · last ${ago(d.stats.lastOrderAt)}`} icon={FiDollarSign} tone="blue" />
        <Stat label="Paid to platform" value={inr(r.revenue)} sub={`${r.paymentsCount} payments · MRR ${inr(r.mrr)}`} icon={FiDollarSign} tone="violet" />
        <Stat label="Last active" value={ago(r.lastActiveAt)} sub={`last login ${ago(r.lastLoginAt)}`} icon={FiClock} tone={r.inactiveDays >= 7 ? "red" : "amber"} />
        <Stat label="Outlets" value={`${r.outlets} / ${r.branchLimit}`} sub="used / allowed" icon={FiMapPin} tone="slate" />
        <Stat label="Users" value={num(r.users)} sub={`${r.activeUsers} active`} icon={FiUsers} tone="slate" />
        <Stat label="Menu items" value={num(d.stats.menuItems)} sub={`${num(d.stats.tables)} tables`} icon={FiBookOpen} tone="slate" />
        <Stat label="Customers" value={num(d.stats.customers)} sub={`${num(d.stats.employees)} employees`} icon={FiGrid} tone="slate" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Sales — last 30 days" className="lg:col-span-2">
          <div className="h-56">
            <ResponsiveContainer>
              <AreaChart data={d.salesSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF0EA" vertical={false} />
                <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={4} />
                <YAxis tickFormatter={(v) => inr(v, { compact: true })} tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={60} />
                <Tooltip formatter={(v, n) => (n === "Sales" ? inr(v) : v)} labelFormatter={shortDay} />
                <Area dataKey="sales" name="Sales" stroke="#3FA34D" fill="#3FA34D22" strokeWidth={2} />
                <Area dataKey="orders" name="Orders" stroke="#0EA5E9" fill="transparent" strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Owner & account">
          <KeyValue
            cols={1}
            items={[
              ["Owner", r.ownerDetails?.fullName],
              ["Email", r.ownerDetails?.email || r.ownerEmail],
              ["Phone", r.ownerDetails?.phone],
              ["Address", r.ownerDetails?.address],
              ["Signed up", fmtDateTime(r.createdAt)],
              ["Organization ID", <code key="id" className="text-[11px]">{r.id}</code>],
              r.suspendedAt && ["Suspended", `${fmtDateTime(r.suspendedAt)} — ${r.suspendedReason || "no reason"}`],
            ]}
          />
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Private platform notes" subtitle="Only the platform team sees these.">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} disabled={!can("restaurants.write")} placeholder="Context, agreements, special pricing…" />
          {can("restaurants.write") && (
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={() => save({ platformNotes: notes })}>Save notes</Button>
            </div>
          )}
        </Card>
        <Card title="Branch limit" subtitle="How many outlets this restaurant may create.">
          <div className="flex items-center gap-2">
            <Input type="number" min={1} value={limit} onChange={(e) => setLimit(e.target.value)} className="max-w-[120px]" disabled={!can("restaurants.write")} />
            {can("restaurants.write") && (
              <Button size="sm" variant="secondary" onClick={() => save({ branchLimit: Number(limit) })}>Update limit</Button>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-500">Changing the limit here doesn't charge anything — use Renew to bill for extra branches.</p>
        </Card>
      </div>
    </div>
  );
}

function Outlets({ d }) {
  return (
    <Card bodyClass="p-0">
      <Table
        rows={d.outlets}
        columns={[
          { key: "name", label: "Outlet", render: (o) => <div><p className="font-semibold text-slate-900">{o.name}</p><p className="text-xs text-slate-500">{o.address || "—"}</p></div> },
          { key: "contact", label: "Contact", render: (o) => <div className="text-xs">{o.phone || "—"}<br />{o.email || ""}</div> },
          { key: "gst", label: "GSTIN / FSSAI", render: (o) => <div className="text-xs">{o.gstin || "—"}<br />{o.fssai || ""}</div> },
          { key: "type", label: "Type", render: (o) => titleCase(o.restaurantType) || "—" },
          { key: "orders", label: "Orders", align: "right", render: (o) => num(o.counts.orders) },
          { key: "menu", label: "Menu", align: "right", render: (o) => num(o.counts.menuItems) },
          { key: "emp", label: "Staff", align: "right", render: (o) => num(o.counts.employees) },
          { key: "tables", label: "Tables", align: "right", render: (o) => num(o.counts.restaurantTables) },
          { key: "st", label: "", render: (o) => <Badge tone={o.isActive ? "green" : "slate"}>{o.isActive ? "Active" : "Inactive"}</Badge> },
        ]}
      />
    </Card>
  );
}

function Users({ d, reload }) {
  const { can } = usePlatformAuth();
  const toggle = async (u) => {
    try {
      await api.post(`/restaurants/${d.restaurant.id}/users/${u.id}/toggle`, { isActive: !u.isActive });
      toast.success(u.isActive ? "User deactivated" : "User activated");
      reload({ silent: true });
    } catch (e) {
      toast.error(e.message);
    }
  };
  return (
    <Card bodyClass="p-0">
      <Table
        rows={d.users}
        columns={[
          { key: "name", label: "User", render: (u) => <div><p className="font-semibold text-slate-900">{u.employee?.fullName || u.username}</p><p className="text-xs text-slate-500">{u.email || u.username}</p></div> },
          { key: "role", label: "Role", render: (u) => <Badge tone={u.role === "OWNER" ? "violet" : "slate"}>{u.role}</Badge> },
          { key: "outlet", label: "Outlet", render: (u) => u.outlet?.name || "All" },
          { key: "phone", label: "Mobile", render: (u) => u.employee?.mobile || "—" },
          { key: "login", label: "Last login", render: (u) => <span className="text-xs">{ago(u.lastLoginAt)}</span> },
          { key: "st", label: "Status", render: (u) => <Badge tone={u.isActive ? "green" : "slate"}>{u.isActive ? "Active" : "Disabled"}</Badge> },
          {
            key: "a",
            label: "",
            render: (u) =>
              can("restaurants.write") && u.role !== "OWNER" ? (
                <Button size="sm" variant={u.isActive ? "dangerSoft" : "secondary"} onClick={() => toggle(u)}>
                  {u.isActive ? "Disable" : "Enable"}
                </Button>
              ) : null,
          },
        ]}
      />
    </Card>
  );
}

function Subscription({ d }) {
  return (
    <div className="space-y-5">
      <Card title="Payments" bodyClass="p-0">
        <Table
          rows={d.payments}
          empty={<Empty title="No payments yet" />}
          columns={[
            { key: "date", label: "Date", render: (p) => <span className="text-xs">{fmtDateTime(p.createdAt)}</span> },
            { key: "plan", label: "Plan", render: (p) => `${p.planId} · ${p.branches} br` },
            { key: "src", label: "Source", render: (p) => <Badge>{p.source}</Badge> },
            { key: "method", label: "Method / ref", render: (p) => <span className="text-xs">{p.paymentMethod || "razorpay"} {p.reference || p.razorpayPaymentId || ""}</span> },
            { key: "inv", label: "Invoice", render: (p) => p.invoiceNumber || "—" },
            { key: "st", label: "Status", render: (p) => <StatusBadge status={p.status} /> },
            { key: "amt", label: "Amount", align: "right", render: (p) => <b>{inr(p.amount)}</b> },
          ]}
        />
      </Card>
      <Card title="Subscription history" bodyClass="p-0">
        <Table
          rows={d.events}
          empty={<Empty title="No changes recorded yet" text="Renewals, extensions, plan changes and suspensions appear here." />}
          columns={[
            { key: "date", label: "When", render: (e) => <span className="text-xs">{fmtDateTime(e.createdAt)}</span> },
            { key: "type", label: "Event", render: (e) => <Badge tone={e.type === "SUSPENDED" ? "red" : e.type === "REMINDER_SENT" ? "slate" : "green"}>{titleCase(e.type)}</Badge> },
            { key: "plan", label: "Plan", render: (e) => (e.fromPlanId !== e.toPlanId && e.toPlanId ? `${e.fromPlanId || "—"} → ${e.toPlanId}` : e.toPlanId || "—") },
            { key: "exp", label: "Expiry", render: (e) => (e.toExpiry ? <span className="text-xs">{fmtDate(e.fromExpiry)} → {fmtDate(e.toExpiry)}</span> : "—") },
            { key: "amt", label: "Amount", render: (e) => (e.amount ? inr(e.amount) : "—") },
            { key: "note", label: "Note", render: (e) => <span className="text-xs text-slate-500">{e.note || ""}</span> },
          ]}
        />
      </Card>
    </div>
  );
}

function Usage({ id }) {
  const [days, setDays] = useState(30);
  const { data, loading } = useApi(() => api.get(`/restaurants/${id}/usage`, { days }), [id, days]);
  if (loading && !data) return <Loading />;
  const maxReq = Math.max(1, ...data.modules.map((m) => m.requests));
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-4 text-sm">
          <span><b>{minutes(data.totals.activeMinutes)}</b> <span className="text-slate-500">active time</span></span>
          <span><b>{data.totals.activeDays}</b> <span className="text-slate-500">active days</span></span>
          <span><b>{minutes(data.totals.avgMinutesPerActiveDay)}</b> <span className="text-slate-500">per active day</span></span>
        </div>
        <Select className="w-36" value={days} onChange={(e) => setDays(Number(e.target.value))} options={[7, 30, 90, 180].map((v) => ({ value: v, label: `Last ${v} days` }))} />
      </div>
      <Card title="Daily active minutes">
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={data.series}>
              <XAxis dataKey="day" tickFormatter={shortDay} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} interval={Math.ceil(days / 10)} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={30} />
              <Tooltip labelFormatter={shortDay} />
              <Bar dataKey="activeMinutes" name="Active minutes" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Features used" subtitle="Tracked from in-app activity">
          <div className="space-y-3">
            {data.modules.map((m) => (
              <div key={m.key}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className={m.requests ? "font-medium text-slate-700" : "text-slate-400"}>{m.label}</span>
                  <span className="text-slate-500">
                    {m.requests ? `${num(m.requests)} actions · ${minutes(m.activeMinutes)} · ${m.daysUsed}d · ${ago(m.lastSeenAt)}` : "not used"}
                  </span>
                </div>
                <ProgressBar value={m.requests} max={maxReq} tone={m.requests ? "green" : "red"} />
              </div>
            ))}
          </div>
        </Card>
        <Card title="Data created in this period" subtitle="Counted from records — includes history before tracking began">
          <Table
            dense
            rows={data.dataUsage.map((x, i) => ({ ...x, id: i }))}
            columns={[
              { key: "label", label: "Record" },
              { key: "recent", label: `Last ${days}d`, align: "right", render: (x) => (x.recent === null ? "—" : <b className={x.recent ? "text-slate-900" : "text-slate-300"}>{num(x.recent)}</b>) },
              { key: "total", label: "All time", align: "right", render: (x) => (x.total === null ? "—" : num(x.total)) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

function Messages({ d, reload }) {
  const [active, setActive] = useState(d.conversations[0]?.id || null);
  const [newOpen, setNewOpen] = useState(false);
  const { can } = usePlatformAuth();
  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      <Card bodyClass="p-2" title="Conversations" action={can("messages.write") && <Button size="sm" onClick={() => setNewOpen(true)}>New</Button>}>
        {d.conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`mb-1 w-full rounded-xl px-3 py-2 text-left ${active === c.id ? "bg-[#EEF5EC]" : "hover:bg-[#F6F7F4]"}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-slate-800">{c.subject}</p>
              {c.unreadForAdmin > 0 && <span className="rounded-full bg-[#3FA34D] px-1.5 text-[10px] font-bold text-white">{c.unreadForAdmin}</span>}
            </div>
            <p className="truncate text-xs text-slate-500">{c.lastMessagePreview}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <StatusBadge status={c.status} />
              <span className="text-[10px] text-slate-400">{ago(c.lastMessageAt)}</span>
            </div>
          </button>
        ))}
        {!d.conversations.length && <Empty title="No conversations" text="Start one to message this restaurant in-app." />}
      </Card>
      <Card bodyClass="p-0 h-[600px]">
        {active ? <Thread conversationId={active} onChanged={() => reload({ silent: true })} /> : <Empty title="Select a conversation" icon={FiMessageSquare} />}
      </Card>
      <NewConversationModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        organizationId={d.restaurant.id}
        organizationName={d.restaurant.name}
        onDone={(c) => {
          reload({ silent: true });
          setActive(c.id);
        }}
      />
    </div>
  );
}

function FollowUps({ d, reload }) {
  const [open, setOpen] = useState(false);
  const { can } = usePlatformAuth();
  return (
    <Card
      bodyClass="p-0"
      title="Follow-ups"
      action={can("followups.write") && <Button size="sm" icon={FiCheckSquare} onClick={() => setOpen(true)}>New follow-up</Button>}
    >
      <Table
        rows={d.followUps}
        empty={<Empty title="No follow-ups" />}
        columns={[
          { key: "title", label: "Follow-up", render: (f) => <Link to={`/platform/follow-ups?open=${f.id}`} className="font-semibold text-slate-900 hover:text-[#3FA34D]">{f.title}</Link> },
          { key: "type", label: "Type", render: (f) => <Badge>{titleCase(f.type)}</Badge> },
          { key: "due", label: "Due", render: (f) => <span className={`text-xs ${new Date(f.dueAt) < new Date() && !["DONE", "CANCELLED"].includes(f.status) ? "font-semibold text-rose-600" : ""}`}>{fmtDateTime(f.dueAt)}</span> },
          { key: "who", label: "Assigned", render: (f) => f.assignedTo?.name || "—" },
          { key: "st", label: "Status", render: (f) => <StatusBadge status={f.status} /> },
          { key: "out", label: "Outcome", render: (f) => <span className="text-xs text-slate-500">{f.outcome || ""}</span> },
        ]}
      />
      <FollowUpModal
        open={open}
        onClose={() => setOpen(false)}
        defaults={{ organizationId: d.restaurant.id, organizationName: d.restaurant.name }}
        onDone={() => reload({ silent: true })}
      />
    </Card>
  );
}

function Activity({ d }) {
  return (
    <Card title="Recent audit events in this restaurant" bodyClass="p-0">
      <Table
        rows={d.recentAudit}
        empty={<Empty title="No audit events" />}
        columns={[
          { key: "at", label: "When", render: (a) => <span className="text-xs">{fmtDateTime(a.createdAt)}</span> },
          { key: "action", label: "Action", render: (a) => <Badge>{a.action}</Badge> },
          { key: "entity", label: "Entity", render: (a) => `${a.entityType || ""} ${a.entityId ? `#${String(a.entityId).slice(0, 8)}` : ""}` },
          { key: "by", label: "By (role)", render: (a) => a.performedByRole || "system" },
          { key: "meta", label: "Details", render: (a) => <span className="text-xs text-slate-500">{a.metadata ? JSON.stringify(a.metadata).slice(0, 120) : ""}</span> },
        ]}
      />
    </Card>
  );
}

export default function RestaurantDetail() {
  const { id } = useParams();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") || "overview";
  const { can } = usePlatformAuth();
  const { data: d, error, loading, reload } = useApi(() => api.get(`/restaurants/${id}`), [id]);
  const [modal, setModal] = useState(null);

  if (loading && !d) return <Loading />;
  if (error && !d) return <ErrorBox error={error} onRetry={reload} />;
  const r = d.restaurant;

  const suspendToggle = async (reason) => {
    if (r.isActive) await api.post(`/restaurants/${r.id}/suspend`, { reason });
    else await api.post(`/restaurants/${r.id}/reactivate`, {});
    toast.success(r.isActive ? "Restaurant suspended — all sessions ended" : "Restaurant reactivated");
    reload({ silent: true });
  };

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "outlets", label: "Outlets", count: d.outlets.length },
    { value: "users", label: "Users", count: d.users.length },
    { value: "subscription", label: "Subscription & payments" },
    { value: "usage", label: "Feature usage" },
    can("messages.read") && { value: "messages", label: "Messages", count: r.unreadMessages || undefined },
    can("followups.read") && { value: "followups", label: "Follow-ups", count: d.followUps.filter((f) => ["PENDING", "IN_PROGRESS"].includes(f.status)).length || undefined },
    { value: "activity", label: "Audit log" },
  ].filter(Boolean);

  return (
    <div>
      <PageHeader
        back="/platform/restaurants"
        title={
          <span className="flex flex-wrap items-center gap-2">
            {r.name} <StatusBadge status={r.status} />
          </span>
        }
        subtitle={`${r.planName} · ${r.branchLimit} branch(es) · expires ${fmtDate(r.planExpiresAt)}${r.daysLeft !== null ? ` (${r.daysLeft >= 0 ? `${r.daysLeft} days left` : `${-r.daysLeft} days ago`})` : ""}`}
        actions={
          <>
            {can("renewals.write") && (
              <>
                <Button icon={FiRefreshCw} onClick={() => setModal("renew")}>Renew / change plan</Button>
                <Button variant="secondary" icon={FiClock} onClick={() => setModal("extend")}>Extend</Button>
                <Button variant="secondary" icon={FiBell} onClick={() => setModal("remind")}>Remind</Button>
              </>
            )}
            {can("restaurants.write") && (
              <Button variant={r.isActive ? "dangerSoft" : "secondary"} icon={r.isActive ? FiSlash : FiPlay} onClick={() => setModal("suspend")}>
                {r.isActive ? "Suspend" : "Reactivate"}
              </Button>
            )}
          </>
        }
      />
      <Tabs className="mb-5" value={tab} onChange={(v) => setSp(v === "overview" ? {} : { tab: v })} tabs={tabs} />

      {tab === "overview" && <Overview d={d} reload={reload} />}
      {tab === "outlets" && <Outlets d={d} />}
      {tab === "users" && <Users d={d} reload={reload} />}
      {tab === "subscription" && <Subscription d={d} />}
      {tab === "usage" && <Usage id={id} />}
      {tab === "messages" && <Messages d={d} reload={reload} />}
      {tab === "followups" && <FollowUps d={d} reload={reload} />}
      {tab === "activity" && <Activity d={d} />}

      <RenewModal open={modal === "renew"} onClose={() => setModal(null)} restaurant={r} onDone={() => reload({ silent: true })} />
      <ExtendModal open={modal === "extend"} onClose={() => setModal(null)} restaurant={r} onDone={() => reload({ silent: true })} />
      <RemindModal open={modal === "remind"} onClose={() => setModal(null)} restaurant={r} onDone={() => reload({ silent: true })} />
      <ConfirmModal
        open={modal === "suspend"}
        onClose={() => setModal(null)}
        title={r.isActive ? `Suspend ${r.name}?` : `Reactivate ${r.name}?`}
        text={
          r.isActive
            ? "All users of this restaurant are signed out immediately and can't sign in until you reactivate it. Their data is kept."
            : "Users will be able to sign in again."
        }
        danger={r.isActive}
        withReason={r.isActive}
        confirmLabel={r.isActive ? "Suspend" : "Reactivate"}
        onConfirm={suspendToggle}
      />
    </div>
  );
}
