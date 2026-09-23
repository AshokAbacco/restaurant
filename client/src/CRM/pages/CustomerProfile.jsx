// src/crm/pages/CustomerProfile.jsx
//
// One customer: who they are, what they buy, what they owe, and every
// conversation with them. Purchase numbers come straight from POS orders.
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FiArrowLeft, FiEdit2, FiPhone, FiMail, FiMessageCircle, FiTrash2, FiMapPin, FiGift, FiHeart,
  FiChevronDown, FiChevronUp, FiStar, FiCheck, FiPlus, FiBookmark,
} from "react-icons/fi";
import {
  getCustomer, getCustomerOrders, getCustomerTimeline, deleteCustomer,
  listNotes, addNote, updateNote, deleteNote,
  listCommunications, addCommunication,
  listCustomerFeedback, addFeedback, updateFeedback,
  listCustomerReminders, addReminder, updateReminder,
} from "../crmApi";
import { useAuth } from "../../auth/AuthContext";
import CustomerFormModal from "../components/CustomerFormModal";
import CustomerLoyaltyTab from "../components/CustomerLoyaltyTab";
import { useCrm } from "../CrmContext";
import {
  CRM_MANAGER_ROLES, CrmPage, SegmentBadge, StatusBadge, TagChip, Avatar, StatCard, ErrorNote, EmptyState,
  inr, fmtDate, fmtDateTime, fmtDay, relativeDays, ORDER_TYPE_LABEL,
  cardClass, inputClass, labelClass, btnPrimary, btnSecondary, chipClass,
} from "../components/crmUI";

const BASE_TABS = [
  ["overview", "Overview"],
  ["orders", "Purchase history"],
  ["loyalty", "Loyalty", "loyalty"], // shown only when the programme is on
  ["notes", "Notes"],
  ["communication", "Communication"],
  ["feedback", "Feedback"],
  ["followups", "Follow-ups"],
  ["history", "History"],
];

const CHANNELS = [
  ["CALL", "Phone call"],
  ["WHATSAPP", "WhatsApp"],
  ["SMS", "SMS"],
  ["EMAIL", "Email"],
  ["IN_PERSON", "In person"],
  ["OTHER", "Other"],
];

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") || "overview";
  const { user } = useAuth();
  const { loyalty: loyaltyProgramme } = useCrm();
  const canManage = CRM_MANAGER_ROLES.includes(user?.role);
  const TABS = BASE_TABS.filter(([, , needs]) => needs !== "loyalty" || loyaltyProgramme?.enabled);

  const [customer, setCustomer] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    setError("");
    try {
      setCustomer(await getCustomer(id));
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!window.confirm(`Delete ${customer.name}? This can't be undone.`)) return;
    try {
      await deleteCustomer(id);
      navigate("/crm/customers");
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !customer) {
    return (
      <CrmPage title="Customer">
        <ErrorNote>{error}</ErrorNote>
        <Link to="/crm/customers" className={`${btnSecondary} mt-4`}><FiArrowLeft /> Back to customers</Link>
      </CrmPage>
    );
  }
  if (!customer) return <CrmPage title="Customer"><p className="text-sm text-[#9CA3AF]">Loading…</p></CrmPage>;

  const c = customer;
  const phone = c.mobile?.replace(/[^\d+]/g, "");
  const waNumber = phone?.replace(/^\+/, "").replace(/^(\d{10})$/, "91$1");

  return (
    <CrmPage
      title={
        <span className="flex items-center gap-2">
          <Link to="/crm/customers" className="text-[#9CA3AF] hover:text-[#3FA34D]" aria-label="Back to customers"><FiArrowLeft /></Link>
          Customer profile
        </span>
      }
      actions={
        <>
          <a href={`tel:${phone}`} className={btnSecondary}><FiPhone /> Call</a>
          <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer" className={btnSecondary}><FiMessageCircle /> WhatsApp</a>
          {c.email && <a href={`mailto:${c.email}`} className={btnSecondary}><FiMail /> Email</a>}
          <button onClick={() => setEditing(true)} className={btnPrimary}><FiEdit2 /> Edit</button>
          {canManage && (
            <button onClick={handleDelete} className={`${btnSecondary} text-red-500`} title="Delete customer"><FiTrash2 /></button>
          )}
        </>
      }
    >
      <ErrorNote>{error}</ErrorNote>

      {/* Identity card */}
      <div className={`${cardClass} mb-4 p-5`}>
        <div className="flex flex-col gap-4 md:flex-row md:items-start">
          <Avatar name={c.name} size="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold text-[#1F2937] dark:text-white">{c.name}</h2>
              <SegmentBadge segment={c.segment} />
              <StatusBadge status={c.status} />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
              <span className="font-mono">{c.mobile}{c.alternateMobile ? ` / ${c.alternateMobile}` : ""}</span>
              {c.email && <span>{c.email}</span>}
              {(c.address || c.city) && (
                <span className="flex items-center gap-1"><FiMapPin size={13} />{[c.address, c.landmark, c.city, c.pincode].filter(Boolean).join(", ")}</span>
              )}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
              <span className="flex items-center gap-1"><FiGift size={13} /> Birthday: {fmtDay(c.birthday, true)}</span>
              <span className="flex items-center gap-1"><FiHeart size={13} /> Anniversary: {fmtDay(c.anniversary, true)}</span>
              <span>Customer since {fmtDate(c.createdAt)}</span>
              {!c.marketingOptIn && <span className="text-amber-600 dark:text-amber-400">Doesn't want offers</span>}
            </div>
            {c.tags?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">{c.tags.map((t) => <TagChip key={t.id} tag={t} />)}</div>
            )}
          </div>
        </div>

        {c.pinnedNotes?.length > 0 && (
          <div className="mt-4 space-y-1.5">
            {c.pinnedNotes.map((n) => (
              <p key={n.id} className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
                <FiBookmark className="mt-0.5 shrink-0" /> {n.note}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Key numbers */}
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Orders" value={c.totalOrders} hint={c.preferredOrderType ? `Mostly ${ORDER_TYPE_LABEL[c.preferredOrderType]?.toLowerCase()}` : undefined} />
        <StatCard label="Total spent" value={inr(c.totalSpent)} accent="text-[#3FA34D] dark:text-[#43B75A]" />
        <StatCard label="Average bill" value={inr(c.avgBill)} />
        <StatCard label="Last visit" value={c.lastVisitAt ? fmtDate(c.lastVisitAt, { day: "numeric", month: "short" }) : "—"} hint={c.lastVisitAt ? relativeDays(c.lastVisitAt) : "No orders yet"} />
        <StatCard label="Favourite" value={<span className="block truncate text-lg">{c.favoriteItems?.[0]?.name || "—"}</span>} hint={c.favoriteItems?.[0] ? `ordered ${c.favoriteItems[0].quantity}×` : undefined} />
        <StatCard
          label="Outstanding"
          value={inr(c.outstanding, 2)}
          hint={c.creditLimit != null ? `Credit limit ${inr(c.creditLimit)}` : undefined}
          accent={c.outstanding > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
        />
      </div>

      {/* Tabs */}
      <nav className="mb-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-[#E7EAE1] dark:border-[#262B24]">
        {TABS.map(([key, label]) => {
          const count = { notes: c.counts?.notes, communication: c.counts?.communications, feedback: c.counts?.openFeedback, followups: c.counts?.pendingReminders }[key];
          return (
            <button
              key={key}
              onClick={() => setParams(key === "overview" ? {} : { tab: key }, { replace: true })}
              className={`-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold ${
                tab === key
                  ? "border-[#3FA34D] text-[#3FA34D] dark:border-[#43B75A] dark:text-[#43B75A]"
                  : "border-transparent text-[#6B7280] hover:text-[#1F2937] dark:text-[#9CA8A0] dark:hover:text-white"
              }`}
            >
              {label}
              {count ? <span className="ml-1.5 rounded-full bg-[#F3F5EE] px-1.5 text-xs dark:bg-white/10">{count}</span> : null}
            </button>
          );
        })}
      </nav>

      {tab === "overview" && <OverviewTab c={c} />}
      {tab === "orders" && <OrdersTab customerId={id} />}
      {tab === "loyalty" && loyaltyProgramme?.enabled && <CustomerLoyaltyTab customer={c} onChange={load} />}
      {tab === "notes" && <NotesTab customerId={id} canManage={canManage} onChange={load} />}
      {tab === "communication" && <CommunicationTab customerId={id} onChange={load} />}
      {tab === "feedback" && <FeedbackTab customerId={id} onChange={load} />}
      {tab === "followups" && <FollowUpsTab customerId={id} onChange={load} />}
      {tab === "history" && <HistoryTab customerId={id} />}

      {editing && (
        <CustomerFormModal
          customer={c}
          onClose={() => setEditing(false)}
          onSaved={(updated) => {
            setEditing(false);
            setCustomer(updated);
          }}
        />
      )}
    </CrmPage>
  );
}

// ── Overview ────────────────────────────────────────────────────────────
function OverviewTab({ c }) {
  const max = Math.max(1, ...(c.monthlySpend || []).map((m) => m.spent));
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className={`${cardClass} p-5`}>
        <h3 className="mb-3 font-bold text-[#1F2937] dark:text-white">Frequently purchased</h3>
        {c.favoriteItems?.length ? (
          <ul className="space-y-2.5">
            {c.favoriteItems.map((f, i) => (
              <li key={f.menuItemId} className="flex items-center gap-3">
                <span className="w-5 text-right text-xs font-bold text-[#9CA3AF]">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{f.name}</span>
                    <span className="whitespace-nowrap text-[#6B7280] dark:text-[#9CA8A0]">{f.quantity}× · {inr(f.spent)}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-[#F3F5EE] dark:bg-white/5">
                    <div className="h-1.5 rounded-full bg-[#3FA34D] dark:bg-[#43B75A]" style={{ width: `${(f.quantity / c.favoriteItems[0].quantity) * 100}%` }} />
                  </div>
                  <p className="mt-0.5 text-xs text-[#9CA3AF] dark:text-[#6B7280]">in {f.orders} of {c.totalOrders} orders</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No purchases linked yet.</EmptyState>
        )}
      </div>

      <div className={`${cardClass} p-5`}>
        <h3 className="mb-3 font-bold text-[#1F2937] dark:text-white">Spend, last 6 months</h3>
        <div className="flex h-44 items-end gap-2">
          {(c.monthlySpend || []).map((m) => {
            const [y, mo] = m.month.split("-").map(Number);
            return (
              <div key={m.month} className="flex flex-1 flex-col items-center gap-1" title={`${inr(m.spent)} · ${m.orders} orders`}>
                <span className="text-[10px] text-[#9CA3AF]">{m.spent ? inr(m.spent) : ""}</span>
                <div className="w-full rounded-t-md bg-[#3FA34D]/80 dark:bg-[#43B75A]/80" style={{ height: `${Math.max(2, (m.spent / max) * 120)}px` }} />
                <span className="text-xs text-[#6B7280] dark:text-[#9CA8A0]">{new Date(y, mo - 1, 1).toLocaleDateString("en-IN", { month: "short" })}</span>
              </div>
            );
          })}
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div><dt className="text-xs text-[#9CA3AF]">First visit</dt><dd className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{fmtDate(c.firstVisitAt)}</dd></div>
          <div><dt className="text-xs text-[#9CA3AF]">Loyalty points</dt><dd className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{c.loyaltyPoints ?? 0}</dd></div>
        </dl>
      </div>

      <div className={`${cardClass} p-5 lg:col-span-2`}>
        <h3 className="mb-3 font-bold text-[#1F2937] dark:text-white">Outstanding payments / credit</h3>
        {c.duePayments?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase text-[#9CA3AF]">
                <tr><th className="py-2">Order</th><th>Date</th><th>Bill</th><th>Paid</th><th>Remaining</th><th></th></tr>
              </thead>
              <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
                {c.duePayments.map((d) => (
                  <tr key={d.id}>
                    <td className="py-2 font-mono text-[#1F2937] dark:text-[#E4E9E2]">{d.orderNumber}</td>
                    <td className="text-[#6B7280] dark:text-[#9CA8A0]">{fmtDate(d.createdAt)}</td>
                    <td>{inr(d.originalAmount, 2)}</td>
                    <td>{inr(d.amountPaid, 2)}</td>
                    <td className="font-bold text-amber-600 dark:text-amber-400">{inr(d.remaining, 2)}</td>
                    <td className="text-right"><Link to="/billing/due-payments" className="text-xs font-semibold text-[#3FA34D] hover:underline">Settle</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-[#9CA3AF] dark:text-[#6B7280]">Nothing outstanding.</p>
        )}
      </div>
    </div>
  );
}

// ── Purchase history ────────────────────────────────────────────────────
function OrdersTab({ customerId }) {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, limit: 10 });
  const [open, setOpen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    getCustomerOrders(customerId, { page, limit: 10 })
      .then(setResult)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [customerId, page]);

  const pages = Math.max(1, Math.ceil(result.total / (result.limit || 10)));

  return (
    <div className={`${cardClass} overflow-hidden`}>
      <ErrorNote>{error}</ErrorNote>
      {!loading && result.data.length === 0 ? (
        <div className="p-4"><EmptyState>No orders linked to this customer yet.</EmptyState></div>
      ) : (
        <ul className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
          {result.data.map((o) => {
            const isOpen = open === o.id;
            const cancelled = ["CANCELLED", "REFUNDED"].includes(o.status);
            return (
              <li key={o.id}>
                <button onClick={() => setOpen(isOpen ? null : o.id)} className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left hover:bg-[#F3F5EE]/60 dark:hover:bg-white/[0.03]">
                  <span className="font-mono font-semibold text-[#1F2937] dark:text-white">{o.orderNumber}</span>
                  <span className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{fmtDateTime(o.createdAt)}</span>
                  <span className="rounded-full bg-[#F3F5EE] px-2 py-0.5 text-xs text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]">
                    {ORDER_TYPE_LABEL[o.orderType] || o.orderType}{o.table?.name ? ` · ${o.table.name}` : ""}{o.onlinePlatform?.name ? ` · ${o.onlinePlatform.name}` : ""}
                  </span>
                  <span className={`text-xs font-semibold ${cancelled ? "text-red-500" : "text-[#6B7280] dark:text-[#9CA8A0]"}`}>{o.status.replace(/_/g, " ").toLowerCase()}</span>
                  {o.duePayment && o.duePayment.remaining > 0 && (
                    <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">{inr(o.duePayment.remaining, 2)} due</span>
                  )}
                  <span className={`ml-auto font-bold ${cancelled ? "text-[#9CA3AF] line-through" : "text-[#1F2937] dark:text-white"}`}>{inr(o.grandTotal, 2)}</span>
                  {isOpen ? <FiChevronUp /> : <FiChevronDown />}
                </button>
                {isOpen && (
                  <div className="bg-[#F3F5EE]/60 px-4 pb-4 pt-2 dark:bg-white/[0.03]">
                    <table className="w-full text-sm">
                      <tbody>
                        {o.items.map((i) => (
                          <tr key={i.id}>
                            <td className="py-1 text-[#1F2937] dark:text-[#E4E9E2]">
                              {i.quantity}× {i.name}
                              {i.notes && <span className="block text-xs italic text-[#9CA3AF]">{i.notes}</span>}
                            </td>
                            <td className="py-1 text-right font-mono text-[#6B7280] dark:text-[#9CA8A0]">{inr(i.totalPrice, 2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-2 space-y-0.5 border-t border-dashed border-[#D5DAD0] pt-2 text-right text-xs text-[#6B7280] dark:border-[#2E342C] dark:text-[#9CA8A0]">
                      <p>Subtotal {inr(o.subtotal, 2)}</p>
                      {o.discountAmount > 0 && <p>Discount −{inr(o.discountAmount, 2)}</p>}
                      <p>GST {inr(o.gstAmount, 2)}</p>
                      {o.payments?.length > 0 && <p>Paid by {o.payments.map((p) => `${p.method} ${inr(p.amount)}`).join(", ")}</p>}
                      {o.invoice && <p>Invoice {o.invoice.invoiceNumber}</p>}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex items-center justify-between border-t border-[#E7EAE1] px-4 py-3 text-sm text-[#6B7280] dark:border-[#262B24] dark:text-[#9CA8A0]">
        <span>{loading ? "Loading…" : `${result.total} orders`}</span>
        <div className="flex items-center gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className={`${btnSecondary} px-3 py-1`}>Previous</button>
          <span>{page} / {pages}</span>
          <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} className={`${btnSecondary} px-3 py-1`}>Next</button>
        </div>
      </div>
    </div>
  );
}

// ── Notes ───────────────────────────────────────────────────────────────
function NotesTab({ customerId, canManage, onChange }) {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState("");
  const [pin, setPin] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => listNotes(customerId).then(setNotes).catch((e) => setError(e.message)), [customerId]);
  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    try {
      await addNote(customerId, { note: text, isPinned: pin });
      setText("");
      setPin(false);
      await load();
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePin(n) {
    await updateNote(customerId, n.id, { isPinned: !n.isPinned }).catch((e) => setError(e.message));
    load();
    onChange();
  }

  async function remove(n) {
    if (!window.confirm("Delete this note?")) return;
    await deleteNote(customerId, n.id).catch((e) => setError(e.message));
    load();
    onChange();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className={`${cardClass} p-4`}>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Preferences, allergies, seating, anything the team should know…" className={`${inputClass} resize-none`} />
        <div className="mt-2 flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
            <input type="checkbox" checked={pin} onChange={(e) => setPin(e.target.checked)} className="h-4 w-4 accent-[#3FA34D]" />
            Pin to top of profile and POS
          </label>
          <button disabled={saving || !text.trim()} className={btnPrimary}>{saving ? "Saving…" : "Add note"}</button>
        </div>
      </form>
      <ErrorNote>{error}</ErrorNote>
      {notes.length === 0 ? (
        <EmptyState>No notes yet.</EmptyState>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className={`${cardClass} p-4 ${n.isPinned ? "border-amber-200 dark:border-amber-500/30" : ""}`}>
              <p className="whitespace-pre-wrap text-sm text-[#1F2937] dark:text-[#E4E9E2]">{n.note}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                <span>{n.createdByName || "Staff"} · {fmtDateTime(n.createdAt)}</span>
                <span className="flex gap-3">
                  <button onClick={() => togglePin(n)} className="font-semibold text-[#3FA34D] hover:underline dark:text-[#43B75A]">{n.isPinned ? "Unpin" : "Pin"}</button>
                  {canManage && <button onClick={() => remove(n)} className="font-semibold text-red-500 hover:underline">Delete</button>}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Communication history ───────────────────────────────────────────────
function CommunicationTab({ customerId, onChange }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ channel: "CALL", direction: "OUTBOUND", subject: "", message: "", outcome: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => listCommunications(customerId).then(setItems).catch((e) => setError(e.message)), [customerId]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addCommunication(customerId, form);
      setForm((f) => ({ ...f, subject: "", message: "", outcome: "" }));
      await load();
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className={`${cardClass} h-fit space-y-3 p-4`}>
        <h3 className="font-bold text-[#1F2937] dark:text-white">Log a conversation</h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={labelClass}>Channel</label>
            <select value={form.channel} onChange={set("channel")} className={inputClass}>{CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
          <div>
            <label className={labelClass}>Direction</label>
            <select value={form.direction} onChange={set("direction")} className={inputClass}>
              <option value="OUTBOUND">We contacted them</option>
              <option value="INBOUND">They contacted us</option>
            </select>
          </div>
        </div>
        <div><label className={labelClass}>Subject</label><input value={form.subject} onChange={set("subject")} className={inputClass} placeholder="e.g. Weekend offer" /></div>
        <div><label className={labelClass}>What was said *</label><textarea rows={3} value={form.message} onChange={set("message")} className={`${inputClass} resize-none`} /></div>
        <div><label className={labelClass}>Outcome</label><input value={form.outcome} onChange={set("outcome")} className={inputClass} placeholder="e.g. Booked table for Saturday" /></div>
        <ErrorNote>{error}</ErrorNote>
        <button disabled={saving || !form.message.trim()} className={`${btnPrimary} w-full`}>{saving ? "Saving…" : "Save to history"}</button>
      </form>

      <div>
        {items.length === 0 ? (
          <EmptyState>No conversations logged yet.</EmptyState>
        ) : (
          <ul className="space-y-2">
            {items.map((m) => (
              <li key={m.id} className={`${cardClass} p-4`}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full bg-[#F3F5EE] px-2 py-0.5 font-semibold text-[#1F2937] dark:bg-white/5 dark:text-[#E4E9E2]">
                    {CHANNELS.find(([v]) => v === m.channel)?.[1]}
                  </span>
                  <span className="text-[#9CA3AF]">{m.direction === "INBOUND" ? "From customer" : "To customer"} · {fmtDateTime(m.createdAt)} · {m.createdByName || "Staff"}</span>
                </div>
                {m.subject && <p className="mt-2 font-semibold text-[#1F2937] dark:text-white">{m.subject}</p>}
                <p className="mt-1 whitespace-pre-wrap text-sm text-[#1F2937] dark:text-[#E4E9E2]">{m.message}</p>
                {m.outcome && <p className="mt-1 text-sm text-[#3FA34D] dark:text-[#43B75A]">Outcome: {m.outcome}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Feedback & complaints ───────────────────────────────────────────────
const FEEDBACK_STATUS_STYLE = {
  OPEN: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  IN_PROGRESS: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  RESOLVED: "bg-[#EAF6EC] text-[#2F7D3A] dark:bg-[#43B75A]/10 dark:text-[#43B75A]",
  CLOSED: "bg-[#F3F5EE] text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]",
};

export function FeedbackCard({ f, onUpdate, showCustomer }) {
  const [resolution, setResolution] = useState(f.resolution || "");
  const [openResolve, setOpenResolve] = useState(false);
  const active = ["OPEN", "IN_PROGRESS"].includes(f.status);
  return (
    <li className={`${cardClass} p-4`}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={`rounded-full px-2 py-0.5 font-semibold ${f.type === "COMPLAINT" ? "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400" : "bg-[#F3F5EE] text-[#1F2937] dark:bg-white/5 dark:text-[#E4E9E2]"}`}>
          {f.type.charAt(0) + f.type.slice(1).toLowerCase()}
        </span>
        <span className={`rounded-full px-2 py-0.5 font-semibold ${FEEDBACK_STATUS_STYLE[f.status]}`}>{f.status.replace("_", " ").toLowerCase()}</span>
        {f.rating && (
          <span className="flex items-center gap-0.5 text-amber-500">
            {Array.from({ length: 5 }, (_, i) => <FiStar key={i} size={12} className={i < f.rating ? "fill-current" : "opacity-30"} />)}
          </span>
        )}
        <span className="text-[#9CA3AF]">
          {showCustomer && f.customer ? <Link to={`/crm/customers/${f.customer.id}`} className="font-semibold hover:underline">{f.customer.name}</Link> : null}
          {showCustomer && f.customer ? " · " : ""}
          {fmtDateTime(f.createdAt)}{f.order ? ` · ${f.order.orderNumber}` : ""}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-[#1F2937] dark:text-[#E4E9E2]">{f.message}</p>
      {f.resolution && !openResolve && <p className="mt-1 text-sm text-[#3FA34D] dark:text-[#43B75A]">Resolution: {f.resolution}</p>}
      {active && (
        <div className="mt-3">
          {openResolve ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input value={resolution} onChange={(e) => setResolution(e.target.value)} placeholder="How was it resolved?" className={inputClass} />
              <button onClick={() => onUpdate(f, { status: "RESOLVED", resolution })} className={btnPrimary}>Mark resolved</button>
            </div>
          ) : (
            <div className="flex gap-2">
              {f.status === "OPEN" && <button onClick={() => onUpdate(f, { status: "IN_PROGRESS" })} className={`${btnSecondary} py-1 text-xs`}>Working on it</button>}
              <button onClick={() => setOpenResolve(true)} className={`${btnSecondary} py-1 text-xs`}><FiCheck /> Resolve</button>
              <button onClick={() => onUpdate(f, { status: "CLOSED" })} className={`${btnSecondary} py-1 text-xs`}>Close</button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function FeedbackTab({ customerId, onChange }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ type: "FEEDBACK", rating: "", message: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => listCustomerFeedback(customerId).then((r) => setItems(r.data)).catch((e) => setError(e.message)), [customerId]);
  useEffect(() => { load(); }, [load]);

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addFeedback(customerId, { ...form, rating: form.rating || null });
      setForm({ type: "FEEDBACK", rating: "", message: "" });
      await load();
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function update(f, payload) {
    try {
      await updateFeedback(f.id, payload);
      await load();
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className={`${cardClass} h-fit space-y-3 p-4`}>
        <h3 className="font-bold text-[#1F2937] dark:text-white">Record feedback</h3>
        <div className="flex flex-wrap gap-1.5">
          {["FEEDBACK", "COMPLAINT", "SUGGESTION", "COMPLIMENT"].map((t) => (
            <button type="button" key={t} onClick={() => setForm((f) => ({ ...f, type: t }))} className={chipClass(form.type === t)}>
              {t.charAt(0) + t.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <div>
          <label className={labelClass}>Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button type="button" key={n} onClick={() => setForm((f) => ({ ...f, rating: f.rating === n ? "" : n }))} className="text-amber-500" aria-label={`${n} stars`}>
                <FiStar size={22} className={form.rating && n <= form.rating ? "fill-current" : "opacity-30"} />
              </button>
            ))}
          </div>
        </div>
        <div><label className={labelClass}>What did they say? *</label><textarea rows={3} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className={`${inputClass} resize-none`} /></div>
        <ErrorNote>{error}</ErrorNote>
        <button disabled={saving || !form.message.trim()} className={`${btnPrimary} w-full`}>{saving ? "Saving…" : "Save feedback"}</button>
      </form>
      <div>
        {items.length === 0 ? <EmptyState>No feedback recorded.</EmptyState> : (
          <ul className="space-y-2">{items.map((f) => <FeedbackCard key={f.id} f={f} onUpdate={update} />)}</ul>
        )}
      </div>
    </div>
  );
}

// ── Follow-up reminders ─────────────────────────────────────────────────
function defaultDue() {
  const d = new Date(Date.now() + 86_400_000);
  d.setHours(11, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ReminderRow({ r, onUpdate, showCustomer }) {
  const overdue = r.status === "PENDING" && new Date(r.dueAt) < new Date();
  return (
    <li className={`${cardClass} flex flex-wrap items-center gap-3 p-4 ${r.status !== "PENDING" ? "opacity-60" : ""}`}>
      <div className="min-w-0 flex-1">
        <p className={`font-semibold text-[#1F2937] dark:text-white ${r.status === "DONE" ? "line-through" : ""}`}>{r.title}</p>
        <p className={`text-xs ${overdue ? "font-semibold text-red-500" : "text-[#9CA3AF] dark:text-[#6B7280]"}`}>
          {showCustomer && r.customer ? <><Link to={`/crm/customers/${r.customer.id}`} className="font-semibold hover:underline">{r.customer.name}</Link> · {r.customer.mobile} · </> : null}
          {overdue ? "Overdue · " : ""}{fmtDateTime(r.dueAt)}{r.channel ? ` · ${CHANNELS.find(([v]) => v === r.channel)?.[1]}` : ""}
          {r.status !== "PENDING" ? ` · ${r.status.toLowerCase()}` : ""}
        </p>
        {r.notes && <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA8A0]">{r.notes}</p>}
      </div>
      {r.status === "PENDING" ? (
        <div className="flex gap-2">
          <button onClick={() => onUpdate(r, { status: "DONE" })} className={`${btnPrimary} py-1 text-xs`}><FiCheck /> Done</button>
          <button onClick={() => onUpdate(r, { status: "CANCELLED" })} className={`${btnSecondary} py-1 text-xs`}>Cancel</button>
        </div>
      ) : (
        <button onClick={() => onUpdate(r, { status: "PENDING" })} className={`${btnSecondary} py-1 text-xs`}>Reopen</button>
      )}
    </li>
  );
}

function FollowUpsTab({ customerId, onChange }) {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({ title: "", dueAt: defaultDue(), channel: "CALL", notes: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => listCustomerReminders(customerId).then(setItems).catch((e) => setError(e.message)), [customerId]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await addReminder(customerId, { ...form, dueAt: new Date(form.dueAt).toISOString() });
      setForm({ title: "", dueAt: defaultDue(), channel: "CALL", notes: "" });
      await load();
      onChange();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function update(r, payload) {
    try {
      await updateReminder(r.id, payload);
      await load();
      onChange();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className={`${cardClass} h-fit space-y-3 p-4`}>
        <h3 className="font-bold text-[#1F2937] dark:text-white">Schedule a follow-up</h3>
        <div><label className={labelClass}>What for? *</label><input value={form.title} onChange={set("title")} className={inputClass} placeholder="e.g. Call about anniversary dinner" /></div>
        <div className="grid grid-cols-2 gap-2">
          <div><label className={labelClass}>When *</label><input type="datetime-local" value={form.dueAt} onChange={set("dueAt")} className={inputClass} /></div>
          <div>
            <label className={labelClass}>How</label>
            <select value={form.channel} onChange={set("channel")} className={inputClass}>{CHANNELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </div>
        </div>
        <div><label className={labelClass}>Notes</label><textarea rows={2} value={form.notes} onChange={set("notes")} className={`${inputClass} resize-none`} /></div>
        <ErrorNote>{error}</ErrorNote>
        <button disabled={saving || !form.title.trim()} className={`${btnPrimary} w-full`}><FiPlus /> {saving ? "Saving…" : "Add follow-up"}</button>
      </form>
      <div>
        {items.length === 0 ? <EmptyState>No follow-ups scheduled.</EmptyState> : (
          <ul className="space-y-2">{items.map((r) => <ReminderRow key={r.id} r={r} onUpdate={update} />)}</ul>
        )}
      </div>
    </div>
  );
}

// ── History / timeline ──────────────────────────────────────────────────
const EVENT_DOT = {
  ORDER: "bg-[#3FA34D]",
  NOTE: "bg-amber-400",
  COMMUNICATION: "bg-[#4AA8E0]",
  FEEDBACK: "bg-[#8B5CF6]",
  COMPLAINT: "bg-red-500",
  REMINDER: "bg-[#EA580C]",
  HISTORY: "bg-[#9CA3AF]",
};

function HistoryTab({ customerId }) {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    getCustomerTimeline(customerId).then(setEvents).catch((e) => setError(e.message));
  }, [customerId]);

  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!events) return <p className="text-sm text-[#9CA3AF]">Loading…</p>;
  if (!events.length) return <EmptyState>No activity yet.</EmptyState>;

  return (
    <ol className={`${cardClass} relative p-5`}>
      {events.map((e) => (
        <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
          <span className="absolute left-[5px] top-4 h-full w-px bg-[#E7EAE1] dark:bg-[#262B24]" aria-hidden />
          <span className={`relative mt-1.5 h-[11px] w-[11px] shrink-0 rounded-full ring-4 ring-white dark:ring-[#171C17] ${EVENT_DOT[e.type]}`} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold text-[#1F2937] dark:text-white">{e.title}</p>
              {e.amount != null && <span className="font-bold text-[#1F2937] dark:text-white">{inr(e.amount, 2)}</span>}
            </div>
            {e.detail && <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{e.detail}</p>}
            <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">{fmtDateTime(e.at)}{e.by ? ` · ${e.by}` : ""}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}