// ==============================================
// client/src/profile/SupportMessages.jsx — /help/messages
// Restaurant side of platform messaging: read messages from the platform
// team (renewal reminders, announcements, support replies), reply, and
// start new conversations. Polls every 15s for new replies.
// Owner / Admin / Manager only (enforced by /api/support).
// ==============================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiSend, FiPlus, FiMessageSquare, FiCheck, FiCheckCircle, FiX } from "react-icons/fi";
import { apiRequest } from "../api/apiClient";

const fmt = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

const STATUS = {
  OPEN: ["Open", "bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"],
  PENDING: ["Awaiting you", "bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"],
  RESOLVED: ["Resolved", "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"],
  CLOSED: ["Closed", "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400"],
};

const card = "rounded-2xl border border-[#E7EAE1] bg-white dark:border-[#262B24] dark:bg-[#171C17]";
const input =
  "w-full rounded-xl border border-[#E7EAE1] bg-white px-3 py-2 text-sm text-[#1F2937] outline-none focus:border-[#3FA34D] dark:border-[#262B24] dark:bg-[#11150F] dark:text-white";

function NewConversation({ onClose, onCreated }) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("support");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setError("");
    const r = await apiRequest("/support/conversations", { method: "POST", body: JSON.stringify({ subject, category, body }) });
    setBusy(false);
    if (!r.ok) return setError(r.data?.message || "Couldn't send.");
    onCreated(r.data.conversation.id);
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className={`${card} w-full max-w-lg p-5`} onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[#1F2937] dark:text-white">Message the support team</h3>
          <button onClick={onClose} className="text-[#6B7280]"><FiX /></button>
        </div>
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="space-y-3">
          <input className={input} placeholder="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <select className={input} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="support">Technical support</option>
            <option value="billing">Billing & payments</option>
            <option value="renewal">Plan / renewal</option>
            <option value="onboarding">Setup & onboarding</option>
            <option value="feedback">Feedback / feature request</option>
            <option value="other">Other</option>
          </select>
          <textarea className={`${input} min-h-[140px]`} placeholder="How can we help?" value={body} onChange={(e) => setBody(e.target.value)} />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-[#E7EAE1] px-4 py-2 text-sm font-medium dark:border-[#262B24] dark:text-white">Cancel</button>
          <button
            onClick={submit}
            disabled={busy || !subject.trim() || !body.trim()}
            className="flex items-center gap-2 rounded-xl bg-[#3FA34D] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <FiSend /> {busy ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SupportMessages() {
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [active, setActive] = useState(null);
  const [thread, setThread] = useState(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const endRef = useRef(null);

  const loadList = useCallback(async () => {
    const r = await apiRequest("/support/conversations");
    if (!r.ok) return setError(r.data?.message || "Couldn't load messages.");
    setList(r.data.conversations);
    setError("");
  }, []);

  const loadThread = useCallback(async (id) => {
    const r = await apiRequest(`/support/conversations/${id}`);
    if (r.ok) setThread(r.data);
  }, []);

  useEffect(() => {
    loadList();
    const t = setInterval(loadList, 15000);
    return () => clearInterval(t);
  }, [loadList]);

  useEffect(() => {
    if (!active) return undefined;
    loadThread(active).then(loadList);
    const t = setInterval(() => loadThread(active), 15000);
    return () => clearInterval(t);
  }, [active, loadThread, loadList]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [thread?.messages?.length]);

  const send = async () => {
    if (!reply.trim()) return;
    setSending(true);
    const r = await apiRequest(`/support/conversations/${active}/messages`, { method: "POST", body: JSON.stringify({ body: reply }) });
    setSending(false);
    if (!r.ok) return setError(r.data?.message || "Couldn't send.");
    setReply("");
    loadThread(active);
    loadList();
  };

  const setStatus = async (status) => {
    await apiRequest(`/support/conversations/${active}`, { method: "PATCH", body: JSON.stringify({ status }) });
    loadThread(active);
    loadList();
  };

  const c = thread?.conversation;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white">Messages</h1>
          <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA8A0]">Conversations with our support & billing team.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/help" className="flex items-center gap-2 rounded-xl border border-[#E7EAE1] px-4 py-2 text-sm font-medium text-[#1F2937] hover:bg-[#F3F5EE] dark:border-[#262B24] dark:text-white dark:hover:bg-[#1E241E]">
            <FiArrowLeft /> Help
          </Link>
          <button onClick={() => setNewOpen(true)} className="flex items-center gap-2 rounded-xl bg-[#3FA34D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#368F42]">
            <FiPlus /> New message
          </button>
        </div>
      </div>

      {error && <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className={`${card} p-2 ${active ? "hidden lg:block" : ""}`}>
          {list === null ? (
            <p className="p-6 text-center text-sm text-[#6B7280]">Loading…</p>
          ) : list.length === 0 ? (
            <div className="p-8 text-center">
              <FiMessageSquare className="mx-auto mb-2 h-8 w-8 text-[#9CA3AF]" />
              <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">No messages yet. Questions about your plan or the app? Send us a message.</p>
            </div>
          ) : (
            list.map((cv) => (
              <button
                key={cv.id}
                onClick={() => setActive(cv.id)}
                className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left transition ${active === cv.id ? "bg-[#3FA34D]/10" : "hover:bg-[#F3F5EE] dark:hover:bg-[#1E241E]"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-sm ${cv.unreadForRestaurant ? "font-bold" : "font-medium"} text-[#1F2937] dark:text-white`}>{cv.subject}</p>
                  {cv.unreadForRestaurant > 0 && <span className="rounded-full bg-[#3FA34D] px-1.5 text-[10px] font-bold text-white">{cv.unreadForRestaurant}</span>}
                </div>
                <p className="truncate text-xs text-[#6B7280] dark:text-[#9CA8A0]">{cv.lastMessagePreview}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[cv.status]?.[1]}`}>{STATUS[cv.status]?.[0]}</span>
                  <span className="text-[10px] text-[#9CA3AF]">{fmt(cv.lastMessageAt)}</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className={`${card} flex h-[calc(100vh-14rem)] min-h-[420px] flex-col ${!active ? "hidden lg:flex" : ""}`}>
          {!c ? (
            <div className="flex flex-1 items-center justify-center text-sm text-[#6B7280]">Select a conversation</div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b border-[#E7EAE1] px-4 py-3 dark:border-[#262B24]">
                <div className="min-w-0">
                  <button className="mb-1 text-xs font-semibold text-[#3FA34D] lg:hidden" onClick={() => { setActive(null); setThread(null); }}>
                    ← Back
                  </button>
                  <p className="truncate font-semibold text-[#1F2937] dark:text-white">{c.subject}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS[c.status]?.[1]}`}>{STATUS[c.status]?.[0]}</span>
                </div>
                {c.status !== "CLOSED" &&
                  (c.status === "RESOLVED" ? (
                    <button onClick={() => setStatus("OPEN")} className="rounded-lg border border-[#E7EAE1] px-3 py-1.5 text-xs font-medium dark:border-[#262B24] dark:text-white">Reopen</button>
                  ) : (
                    <button onClick={() => setStatus("RESOLVED")} className="rounded-lg border border-[#E7EAE1] px-3 py-1.5 text-xs font-medium dark:border-[#262B24] dark:text-white">Mark resolved</button>
                  ))}
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto bg-[#F8FAF5] px-4 py-4 dark:bg-[#11150F]">
                {thread.messages.map((m) => {
                  const mine = m.senderType === "RESTAURANT";
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm ${mine ? "rounded-br-md bg-[#3FA34D] text-white" : "rounded-bl-md border border-[#E7EAE1] bg-white text-[#1F2937] dark:border-[#262B24] dark:bg-[#171C17] dark:text-white"}`}>
                        <p className={`mb-0.5 text-[11px] font-semibold ${mine ? "text-white/75" : "text-[#3FA34D]"}`}>{m.senderName}</p>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{m.body}</p>
                        <p className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-white/70" : "text-[#9CA3AF]"}`}>
                          {fmt(m.createdAt)}
                          {mine && (m.readByAdminAt ? <FiCheckCircle title="Seen by support" /> : <FiCheck title="Sent" />)}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>
              {c.status === "CLOSED" ? (
                <p className="border-t border-[#E7EAE1] p-3 text-center text-xs text-[#6B7280] dark:border-[#262B24]">This conversation is closed. Start a new message if you need more help.</p>
              ) : (
                <div className="flex gap-2 border-t border-[#E7EAE1] p-3 dark:border-[#262B24]">
                  <textarea
                    className={`${input} min-h-[48px] resize-none`}
                    rows={2}
                    placeholder="Type your reply… (Ctrl+Enter to send)"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) send();
                    }}
                  />
                  <button
                    onClick={send}
                    disabled={sending || !reply.trim()}
                    className="flex items-center gap-2 self-end rounded-xl bg-[#3FA34D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <FiSend />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {newOpen && (
        <NewConversation
          onClose={() => setNewOpen(false)}
          onCreated={(id) => {
            setNewOpen(false);
            loadList();
            setActive(id);
          }}
        />
      )}
    </div>
  );
}
