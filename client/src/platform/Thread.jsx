// ==============================================
// client/src/platform/Thread.jsx
// A conversation thread with composer — the platform side of two-way
// messaging. Polls every 10s so restaurant replies appear without reload.
// ==============================================

import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FiSend, FiLock, FiCheck, FiCheckCircle } from "react-icons/fi";
import { api } from "./api";
import { usePlatformAuth } from "./PlatformAuth";
import { Button, Select, StatusBadge, Badge, Loading, fmtDateTime, cx, useApi, titleCase } from "./ui";
import { TeamSelect } from "./components";

export function MessageBubble({ m }) {
  const mine = m.senderType === "ADMIN";
  const system = m.senderType === "SYSTEM";
  if (system && m.isInternal) {
    return <p className="my-2 text-center text-[11px] text-slate-400">{m.body} · {fmtDateTime(m.createdAt)}</p>;
  }
  return (
    <div className={cx("flex", mine || system ? "justify-end" : "justify-start")}>
      <div
        className={cx(
          "max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
          m.isInternal
            ? "border border-dashed border-amber-300 bg-amber-50 text-amber-900"
            : mine
              ? "rounded-br-md bg-[#3FA34D] text-white"
              : system
                ? "rounded-br-md bg-slate-700 text-white"
                : "rounded-bl-md border border-[#E7EAE1] bg-white text-slate-800",
        )}
      >
        <p className={cx("mb-0.5 text-[11px] font-semibold", mine || system ? "text-white/75" : "text-slate-500", m.isInternal && "text-amber-700")}>
          {m.isInternal && <FiLock className="mr-1 inline" />}
          {m.senderName}
        </p>
        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
        <p className={cx("mt-1 flex items-center justify-end gap-1 text-[10px]", mine || system ? "text-white/70" : "text-slate-400", m.isInternal && "text-amber-600")}>
          {fmtDateTime(m.createdAt)}
          {(mine || system) && !m.isInternal && (m.readByRestaurantAt ? <FiCheckCircle title="Read by restaurant" /> : <FiCheck title="Sent" />)}
        </p>
      </div>
    </div>
  );
}

export default function Thread({ conversationId, onChanged, compact }) {
  const { can } = usePlatformAuth();
  const { data, loading, reload } = useApi(() => api.get(`/messages/${conversationId}`), [conversationId], { interval: 10000 });
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef(null);
  const c = data?.conversation;
  const count = c?.messages?.length || 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [count, conversationId]);

  if (loading && !c) return <Loading />;
  if (!c) return null;

  const send = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await api.post(`/messages/${c.id}/messages`, { body, isInternal: internal });
      setBody("");
      await reload({ silent: true });
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (data) => {
    try {
      await api.patch(`/messages/${c.id}`, data);
      await reload({ silent: true });
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0EA] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{c.subject}</p>
          <p className="text-xs text-slate-500">
            <Link to={`/platform/restaurants/${c.organization.id}`} className="font-medium text-[#3FA34D] hover:underline">
              {c.organization.name}
            </Link>{" "}
            · {c.organization.ownerEmail} · {titleCase(c.category)} · started by {c.startedBy === "RESTAURANT" ? "restaurant" : "platform"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={c.status} />
          {c.priority !== "NORMAL" && <StatusBadge status={c.priority} />}
          {!compact && can("messages.write") && (
            <>
              <div className="w-36">
                <TeamSelect value={c.assignedTo?.id || ""} onChange={(v) => patch({ assignedToId: v || null })} placeholder="Unassigned" />
              </div>
              <Select
                className="!w-32"
                value={c.priority}
                onChange={(e) => patch({ priority: e.target.value })}
                options={["LOW", "NORMAL", "HIGH", "URGENT"]}
              />
              {c.status === "RESOLVED" || c.status === "CLOSED" ? (
                <Button size="sm" variant="secondary" onClick={() => patch({ status: "OPEN" })}>Reopen</Button>
              ) : (
                <>
                  <Button size="sm" variant="secondary" onClick={() => patch({ status: "RESOLVED" })}>Resolve</Button>
                  <Button size="sm" variant="ghost" onClick={() => patch({ status: "CLOSED" })}>Close</Button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#F8FAF5] px-4 py-4">
        {c.messages.map((m) => (
          <MessageBubble key={m.id} m={m} />
        ))}
        {c.followUps?.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 pt-2">
            {c.followUps.map((f) => (
              <Link key={f.id} to={`/platform/follow-ups?open=${f.id}`}>
                <Badge tone="violet">Follow-up: {f.title} · {f.status}</Badge>
              </Link>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {can("messages.write") && c.status !== "CLOSED" && (
        <div className={cx("border-t border-[#EEF0EA] p-3", internal && "bg-amber-50/60")}>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
            }}
            placeholder={internal ? "Internal note — only the platform team sees this" : "Write a reply… (Ctrl+Enter to send)"}
            className="min-h-[70px] w-full resize-none rounded-xl border border-[#E2E6DC] bg-white px-3 py-2 text-sm outline-none focus:border-[#3FA34D]"
          />
          <div className="mt-2 flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
              Internal note
            </label>
            <Button size="sm" onClick={send} loading={busy} icon={FiSend} disabled={!body.trim()}>
              {internal ? "Add note" : "Send"}
            </Button>
          </div>
        </div>
      )}
      {c.status === "CLOSED" && <p className="border-t border-[#EEF0EA] p-3 text-center text-xs text-slate-400">Conversation closed. Reopen to reply.</p>}
    </div>
  );
}
