// client/src/platform/pages/FollowUps.jsx — /platform/follow-ups
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiPlus, FiPhone, FiMail, FiMessageSquare, FiFileText, FiCheck, FiClock, FiEdit2, FiTrash2, FiSend, FiCalendar } from "react-icons/fi";
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
  Select,
  SearchInput,
  Drawer,
  Loading,
  Empty,
  Field,
  Input,
  Textarea,
  KeyValue,
  Modal,
  Pagination,
  fmtDateTime,
  ago,
  titleCase,
  cx,
  useApi,
} from "../ui";
import { FollowUpModal, FOLLOWUP_TYPES, ConfirmModal } from "../components";
import { MessageBubble } from "../Thread";

const ACT_ICON = { CALL: FiPhone, EMAIL: FiMail, MESSAGE: FiMessageSquare, NOTE: FiFileText, STATUS: FiCheck, RESCHEDULED: FiCalendar, CREATED: FiPlus, WHATSAPP: FiMessageSquare, MEETING: FiCalendar };

function CompleteModal({ open, onClose, followUp, onDone }) {
  const [outcome, setOutcome] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try {
      await api.post(`/follow-ups/${followUp.id}/complete`, { outcome, nextDueAt: next ? new Date(next).toISOString() : undefined });
      toast.success(next ? "Done — next follow-up scheduled" : "Marked done");
      onDone();
      onClose();
      setOutcome("");
      setNext("");
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Complete follow-up"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Mark done</Button>
        </>
      }
    >
      <Field label="Outcome">
        <Textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="What happened? e.g. Agreed to renew yearly next week" />
      </Field>
      <Field label="Schedule the next follow-up (optional)" className="mt-3" hint="Creates a new follow-up that carries over the restaurant and conversation.">
        <Input type="datetime-local" value={next} onChange={(e) => setNext(e.target.value)} />
      </Field>
    </Modal>
  );
}

function Detail({ id, onChanged, onClose }) {
  const { can } = usePlatformAuth();
  const { data, loading, reload } = useApi(() => api.get(`/follow-ups/${id}`), [id], { interval: 15000 });
  const [actType, setActType] = useState("CALL");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [modal, setModal] = useState(null);
  const [reschedule, setReschedule] = useState("");
  if (loading && !data) return <Loading />;
  const f = data.followUp;
  const open = ["PENDING", "IN_PROGRESS"].includes(f.status);
  const refresh = () => {
    reload({ silent: true });
    onChanged();
  };
  const run = async (key, fn, success) => {
    setBusy(key);
    try {
      await fn();
      if (success) toast.success(success);
      refresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={f.status} />
          <StatusBadge status={f.priority} />
          <Badge>{titleCase(f.type)}</Badge>
          {f.channel && <Badge tone="violet">{f.channel}</Badge>}
        </div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">{f.title}</h2>
        {f.notes && <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{f.notes}</p>}
      </div>
      <KeyValue
        items={[
          ["Due", <span key="d" className={open && new Date(f.dueAt) < new Date() ? "font-semibold text-rose-600" : ""}>{fmtDateTime(f.dueAt)} ({ago(f.dueAt)})</span>],
          ["Assigned to", f.assignedTo?.name || "Unassigned"],
          ["Restaurant", f.organization ? <Link key="o" to={`/platform/restaurants/${f.organization.id}`} className="font-medium text-[#3FA34D]">{f.organization.name}</Link> : "—"],
          ["Contact", [f.contactName, f.contactPhone, f.contactEmail].filter(Boolean).join(" · ") || f.organization?.ownerEmail || "—"],
          f.enquiry && ["Enquiry", `${f.enquiry.restaurantName} (${f.enquiry.status})`],
          ["Created by", `${f.createdBy?.name || "System"} · ${fmtDateTime(f.createdAt)}`],
          f.outcome && ["Outcome", f.outcome],
        ]}
      />

      {can("followups.write") && (
        <div className="flex flex-wrap gap-2">
          {open && <Button icon={FiCheck} onClick={() => setModal("complete")}>Complete</Button>}
          {open && f.status === "PENDING" && (
            <Button variant="secondary" loading={busy === "start"} onClick={() => run("start", () => api.patch(`/follow-ups/${f.id}`, { status: "IN_PROGRESS" }), "Started")}>
              Start
            </Button>
          )}
          {!open && (
            <Button variant="secondary" loading={busy === "reopen"} onClick={() => run("reopen", () => api.patch(`/follow-ups/${f.id}`, { status: "PENDING" }), "Reopened")}>
              Reopen
            </Button>
          )}
          <Button variant="secondary" icon={FiEdit2} onClick={() => setModal("edit")}>Edit</Button>
          {open && (
            <Button variant="ghost" loading={busy === "cancel"} onClick={() => run("cancel", () => api.patch(`/follow-ups/${f.id}`, { status: "CANCELLED" }), "Cancelled")}>
              Cancel
            </Button>
          )}
          <Button variant="dangerSoft" icon={FiTrash2} onClick={() => setModal("delete")} />
        </div>
      )}

      {can("followups.write") && open && (
        <Card title="Reschedule" bodyClass="p-4">
          <div className="flex flex-wrap gap-2">
            {[
              ["+1h", 1 / 24],
              ["Tomorrow", 1],
              ["+3 days", 3],
              ["Next week", 7],
            ].map(([l, d]) => (
              <Button
                key={l}
                size="sm"
                variant="secondary"
                onClick={() => run("res", () => api.patch(`/follow-ups/${f.id}`, { dueAt: new Date(Date.now() + d * 86400000).toISOString() }), "Rescheduled")}
              >
                {l}
              </Button>
            ))}
            <Input type="datetime-local" className="!w-auto" value={reschedule} onChange={(e) => setReschedule(e.target.value)} />
            <Button size="sm" disabled={!reschedule} onClick={() => run("res", () => api.patch(`/follow-ups/${f.id}`, { dueAt: new Date(reschedule).toISOString() }), "Rescheduled")}>
              Set
            </Button>
          </div>
        </Card>
      )}

      {can("followups.write") && (
        <Card title={f.organization ? "Message the restaurant (two-way)" : "Email the contact"} subtitle={f.organization ? "Posts into their in-app inbox — their replies appear below." : "Sent by email; logged as activity."} bodyClass="p-4">
          {f.conversation?.messages?.length > 0 && (
            <div className="mb-3 max-h-72 space-y-2 overflow-y-auto rounded-xl bg-[#F8FAF5] p-3">
              {f.conversation.messages.map((m) => (
                <MessageBubble key={m.id} m={m} />
              ))}
            </div>
          )}
          <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a message…" />
          <div className="mt-2 flex items-center justify-between">
            {f.conversation ? (
              <Link to={`/platform/messages?c=${f.conversation.id}`} className="text-xs font-medium text-[#3FA34D]">Open full conversation →</Link>
            ) : (
              <span />
            )}
            <Button
              size="sm"
              icon={FiSend}
              disabled={!msg.trim()}
              loading={busy === "msg"}
              onClick={() =>
                run(
                  "msg",
                  async () => {
                    const r = await api.post(`/follow-ups/${f.id}/message`, { body: msg });
                    setMsg("");
                    if (r.skipped) toast("Email isn't configured — logged only.");
                  },
                  "Sent",
                )
              }
            >
              Send
            </Button>
          </div>
        </Card>
      )}

      <Card title="Activity" bodyClass="p-4">
        {can("followups.write") && (
          <div className="mb-4 space-y-2">
            <div className="flex gap-2">
              <Select className="!w-36" value={actType} onChange={(e) => setActType(e.target.value)} options={["CALL", "EMAIL", "WHATSAPP", "MEETING", "NOTE"]} />
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Log what happened…" />
              <Button
                disabled={!note.trim()}
                loading={busy === "act"}
                onClick={() =>
                  run("act", async () => {
                    await api.post(`/follow-ups/${f.id}/activities`, { type: actType, note });
                    setNote("");
                  })
                }
              >
                Log
              </Button>
            </div>
          </div>
        )}
        <ol className="relative space-y-4 border-l border-[#E7EAE1] pl-5">
          {f.activities.map((a) => {
            const Icon = ACT_ICON[a.type] || FiFileText;
            return (
              <li key={a.id} className="relative">
                <span className="absolute -left-[29px] flex h-6 w-6 items-center justify-center rounded-full border border-[#E7EAE1] bg-white text-slate-500">
                  <Icon className="h-3 w-3" />
                </span>
                <p className="text-xs text-slate-400">
                  <b className="text-slate-600">{titleCase(a.type)}</b> · {a.admin?.name || "System"} · {fmtDateTime(a.createdAt)}
                </p>
                {a.note && <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{a.note}</p>}
              </li>
            );
          })}
        </ol>
      </Card>

      <CompleteModal open={modal === "complete"} onClose={() => setModal(null)} followUp={f} onDone={refresh} />
      <FollowUpModal open={modal === "edit"} onClose={() => setModal(null)} followUp={f} onDone={refresh} />
      <ConfirmModal
        open={modal === "delete"}
        onClose={() => setModal(null)}
        title="Delete follow-up?"
        text="This removes the follow-up and its activity log."
        danger
        confirmLabel="Delete"
        onConfirm={async () => {
          await api.del(`/follow-ups/${f.id}`);
          onChanged();
          onClose();
        }}
      />
    </div>
  );
}

export default function FollowUps() {
  const [sp, setSp] = useSearchParams();
  const { can } = usePlatformAuth();
  const tab = sp.get("tab") || "open";
  const q = sp.get("q") || "";
  const assigned = sp.get("assigned") || "all";
  const type = sp.get("type") || "";
  const page = Number(sp.get("page") || 1);
  const openId = sp.get("open");
  const [createOpen, setCreateOpen] = useState(false);
  const set = (patch) =>
    setSp(Object.fromEntries(Object.entries({ tab, q, assigned, type, open: openId, ...patch }).filter(([, v]) => v && v !== "all")));
  const { data, loading, reload } = useApi(() => api.get("/follow-ups", { tab, q, assigned, type, page }), [tab, q, assigned, type, page], { interval: 30000 });
  const c = data?.counts || {};

  return (
    <div>
      <PageHeader
        title="Follow-ups"
        subtitle="Scheduled calls, renewals and check-ins — with a full activity trail and two-way messaging."
        actions={can("followups.write") && <Button icon={FiPlus} onClick={() => setCreateOpen(true)}>New follow-up</Button>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs
          value={tab}
          onChange={(v) => set({ tab: v, page: "" })}
          tabs={[
            { value: "open", label: "All open", count: c.open },
            { value: "overdue", label: "Overdue", count: c.overdue },
            { value: "today", label: "Today", count: c.today },
            { value: "upcoming", label: "Upcoming", count: c.upcoming },
            { value: "completed", label: "Completed", count: c.completed },
            { value: "all", label: "Everything" },
          ]}
        />
      </div>
      <Card bodyClass="p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0EA] p-3">
          <SearchInput value={q} onChange={(v) => set({ q: v, page: "" })} />
          <Select className="!w-40" value={assigned} onChange={(e) => set({ assigned: e.target.value, page: "" })} options={[{ value: "all", label: "Everyone" }, { value: "me", label: "Assigned to me" }]} />
          <Select className="!w-40" value={type} onChange={(e) => set({ type: e.target.value, page: "" })} placeholder="All types" options={FOLLOWUP_TYPES} />
        </div>
        {loading && !data ? (
          <Loading />
        ) : (
          <>
            <Table
              onRowClick={(f) => set({ open: f.id })}
              rows={data?.followUps}
              empty={<Empty title="No follow-ups here" text="Create one, or let renewals create them automatically." />}
              columns={[
                {
                  key: "title",
                  label: "Follow-up",
                  render: (f) => (
                    <div className="min-w-[200px]">
                      <p className="font-semibold text-slate-900">{f.title}</p>
                      <p className="text-xs text-slate-500">{f.organization?.name || f.contactName || f.enquiry?.restaurantName || "—"}</p>
                    </div>
                  ),
                },
                { key: "type", label: "Type", render: (f) => <Badge>{titleCase(f.type)}</Badge> },
                { key: "pri", label: "Priority", render: (f) => <StatusBadge status={f.priority} /> },
                {
                  key: "due",
                  label: "Due",
                  render: (f) => {
                    const overdue = ["PENDING", "IN_PROGRESS"].includes(f.status) && new Date(f.dueAt) < new Date();
                    return (
                      <div className={cx("whitespace-nowrap text-xs", overdue && "font-semibold text-rose-600")}>
                        {fmtDateTime(f.dueAt)}
                        <p className={overdue ? "text-rose-500" : "text-slate-400"}>
                          <FiClock className="mr-0.5 inline" />
                          {ago(f.dueAt)}
                        </p>
                      </div>
                    );
                  },
                },
                { key: "who", label: "Assigned", render: (f) => f.assignedTo?.name || "—" },
                { key: "acts", label: "Activity", align: "right", render: (f) => f._count?.activities || 0 },
                { key: "st", label: "Status", render: (f) => <StatusBadge status={f.status} /> },
              ]}
            />
            <Pagination page={data?.page || 1} pageSize={data?.pageSize || 50} total={data?.total || 0} onChange={(p) => set({ page: String(p) })} />
          </>
        )}
      </Card>
      <Drawer open={Boolean(openId)} onClose={() => set({ open: "" })} title="Follow-up" width="max-w-2xl">
        {openId && <Detail id={openId} onChanged={() => reload({ silent: true })} onClose={() => set({ open: "" })} />}
      </Drawer>
      <FollowUpModal open={createOpen} onClose={() => setCreateOpen(false)} onDone={() => reload({ silent: true })} />
    </div>
  );
}
