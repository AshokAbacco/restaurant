// client/src/platform/pages/Messages.jsx — /platform/messages
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FiEdit, FiSend, FiMessageSquare } from "react-icons/fi";
import { api } from "../api";
import { usePlatformAuth } from "../PlatformAuth";
import {
  Card,
  PageHeader,
  Tabs,
  Button,
  Select,
  SearchInput,
  StatusBadge,
  Empty,
  Loading,
  Modal,
  Field,
  Input,
  Textarea,
  ago,
  cx,
  useApi,
  titleCase,
} from "../ui";
import { NewConversationModal, CATEGORIES } from "../components";
import Thread from "../Thread";

function BroadcastModal({ open, onClose }) {
  const [form, setForm] = useState({ audience: "ALL", subject: "", body: "", category: "announcement" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const send = async () => {
    setBusy(true);
    try {
      const r = await api.post("/messages/broadcast", form);
      toast.success(`Sent to ${r.sent} restaurant(s)`);
      onClose();
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
      title="Broadcast to restaurants"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={send} loading={busy} icon={FiSend}>Send broadcast</Button>
        </>
      }
    >
      <p className="mb-4 rounded-xl bg-[#F6F7F4] px-3 py-2 text-xs text-slate-600">
        Each restaurant gets its own conversation, so every reply lands in a separate thread in your inbox.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Audience">
          <Select
            value={form.audience}
            onChange={set("audience")}
            options={[
              { value: "ALL", label: "All restaurants" },
              { value: "ACTIVE", label: "Active (paid)" },
              { value: "TRIAL", label: "On trial" },
              { value: "EXPIRING", label: "Expiring soon" },
              { value: "EXPIRED", label: "Expired" },
              { value: "SUSPENDED", label: "Suspended" },
            ]}
          />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={set("category")} options={CATEGORIES} />
        </Field>
        <Field label="Subject" className="sm:col-span-2">
          <Input value={form.subject} onChange={set("subject")} placeholder="e.g. New feature: QR ordering" />
        </Field>
        <Field label="Message" className="sm:col-span-2">
          <Textarea value={form.body} onChange={set("body")} className="min-h-[160px]" />
        </Field>
      </div>
    </Modal>
  );
}

export default function Messages() {
  const [sp, setSp] = useSearchParams();
  const { can } = usePlatformAuth();
  const status = sp.get("status") || "active";
  const q = sp.get("q") || "";
  const assigned = sp.get("assigned") || "all";
  const unread = sp.get("unread") || "";
  const category = sp.get("category") || "";
  const [active, setActive] = useState(sp.get("c") || null);
  const [newOpen, setNewOpen] = useState(false);
  const [bcOpen, setBcOpen] = useState(false);
  const set = (patch) => setSp(Object.fromEntries(Object.entries({ status, q, assigned, unread, category, ...patch }).filter(([, v]) => v && v !== "all")));

  const { data, loading, reload } = useApi(() => api.get("/messages", { status, q, assigned, unread, category, pageSize: 100 }), [status, q, assigned, unread, category], { interval: 15000 });

  useEffect(() => {
    if (!active && data?.conversations?.length && window.innerWidth >= 1024) setActive(data.conversations[0].id);
  }, [data, active]);

  const counts = data?.counts || {};
  return (
    <div className="flex h-[calc(100vh-7.5rem)] flex-col">
      <PageHeader
        title="Messages"
        subtitle="Two-way conversations with restaurants. They reply from Help & Support → Messages in their app."
        actions={
          can("messages.write") && (
            <>
              <Button variant="secondary" onClick={() => setBcOpen(true)}>Broadcast</Button>
              <Button icon={FiEdit} onClick={() => setNewOpen(true)}>New message</Button>
            </>
          )
        }
      />
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_1fr]">
        <Card className={cx("flex min-h-0 flex-col", active && "hidden lg:flex")} bodyClass="flex min-h-0 flex-1 flex-col p-0">
          <div className="space-y-2 border-b border-[#EEF0EA] p-3">
            <Tabs
              value={status}
              onChange={(v) => set({ status: v })}
              tabs={[
                { value: "active", label: "Active", count: (counts.OPEN || 0) + (counts.PENDING || 0) },
                { value: "OPEN", label: "Open", count: counts.OPEN },
                { value: "PENDING", label: "Waiting", count: counts.PENDING },
                { value: "RESOLVED", label: "Resolved" },
                { value: "CLOSED", label: "Closed" },
              ]}
            />
            <div className="flex gap-2">
              <SearchInput value={q} onChange={(v) => set({ q: v })} className="!max-w-none" />
            </div>
            <div className="flex gap-2">
              <Select value={assigned} onChange={(e) => set({ assigned: e.target.value })} options={[{ value: "all", label: "Everyone" }, { value: "me", label: "Assigned to me" }, { value: "unassigned", label: "Unassigned" }]} />
              <Select value={category} onChange={(e) => set({ category: e.target.value })} placeholder="All categories" options={CATEGORIES} />
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={Boolean(unread)} onChange={(e) => set({ unread: e.target.checked ? "true" : "" })} /> Unread only ({counts.unread || 0})
            </label>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loading && !data ? (
              <Loading />
            ) : data?.conversations?.length ? (
              data.conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActive(c.id)}
                  className={cx("mb-1 w-full rounded-xl px-3 py-2.5 text-left transition", active === c.id ? "bg-[#EEF5EC]" : "hover:bg-[#F6F7F4]")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={cx("truncate text-sm", c.unreadForAdmin ? "font-bold text-slate-900" : "font-semibold text-slate-700")}>{c.organization.name}</p>
                    <span className="shrink-0 text-[10px] text-slate-400">{ago(c.lastMessageAt)}</span>
                  </div>
                  <p className="truncate text-xs font-medium text-slate-600">{c.subject}</p>
                  <p className="truncate text-xs text-slate-400">
                    {c.lastSenderType === "RESTAURANT" ? "↩ " : "You: "}
                    {c.lastMessagePreview}
                  </p>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <StatusBadge status={c.status} />
                    {c.priority !== "NORMAL" && <StatusBadge status={c.priority} />}
                    <span className="text-[10px] text-slate-400">{titleCase(c.category)}</span>
                    {c.assignedTo && <span className="text-[10px] text-slate-400">· {c.assignedTo.name}</span>}
                    {c.unreadForAdmin > 0 && <span className="ml-auto rounded-full bg-[#3FA34D] px-1.5 text-[10px] font-bold text-white">{c.unreadForAdmin}</span>}
                  </div>
                </button>
              ))
            ) : (
              <Empty title="No conversations" text="Start one, or wait for a restaurant to write in." />
            )}
          </div>
        </Card>
        <Card className={cx("min-h-0", !active && "hidden lg:block")} bodyClass="h-full p-0">
          {active ? (
            <div className="flex h-full flex-col">
              <button className="border-b border-[#EEF0EA] px-4 py-2 text-left text-xs font-semibold text-[#3FA34D] lg:hidden" onClick={() => setActive(null)}>
                ← All conversations
              </button>
              <div className="min-h-0 flex-1">
                <Thread conversationId={active} onChanged={() => reload({ silent: true })} />
              </div>
            </div>
          ) : (
            <Empty title="Select a conversation" icon={FiMessageSquare} />
          )}
        </Card>
      </div>
      <NewConversationModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onDone={(c) => {
          reload({ silent: true });
          setActive(c.id);
        }}
      />
      <BroadcastModal open={bcOpen} onClose={() => { setBcOpen(false); reload({ silent: true }); }} />
    </div>
  );
}
