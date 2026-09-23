// src/crm/components/CustomerLoyaltyTab.jsx
//
// The Loyalty tab on a customer's CRM profile: points balance and what
// it's worth, membership tier, what expires when, vouchers, the referral
// code, the full points ledger, and one-tap messages to the customer.
import { useCallback, useEffect, useState } from "react";
import {
  FiAward, FiGift, FiShare2, FiPlus, FiMessageCircle, FiCopy, FiSlash, FiClock,
} from "react-icons/fi";
import {
  getCustomerLoyalty, adjustPoints, issueVoucher, cancelVoucher,
} from "../loyaltyApi";
import { useRestaurantProfile } from "../../context/RestaurantProfileContext";
import {
  CRM_MANAGER_ROLES, Modal, StatCard, ErrorNote, EmptyState,
  inr, fmtDate, fmtDateTime, cardClass, inputClass, labelClass, btnPrimary, btnSecondary,
} from "./crmUI";
import { useAuth } from "../../auth/AuthContext";

const TYPE_LABEL = {
  EARN: "Earned",
  REDEEM: "Redeemed",
  WELCOME: "Welcome bonus",
  BIRTHDAY: "Birthday reward",
  ANNIVERSARY: "Anniversary reward",
  REFERRAL: "Referral reward",
  BONUS: "Bonus",
  ADJUST: "Manual adjustment",
  EXPIRE: "Expired",
  REVERSAL: "Reversed",
  VOUCHER: "Converted to voucher",
};

// Fills {name}, {points}, {value} etc. in the message templates from Settings.
function fillTemplate(text, vars) {
  return String(text || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? ""));
}

export default function CustomerLoyaltyTab({ customer, onChange }) {
  const { user } = useAuth();
  const { restaurantName } = useRestaurantProfile();
  const canManage = CRM_MANAGER_ROLES.includes(user?.role);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(null); // "adjust" | "voucher"

  const load = useCallback(async () => {
    try {
      setData(await getCustomerLoyalty(customer.id));
    } catch (err) {
      setError(err.message);
    }
  }, [customer.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(v) {
    if (!window.confirm(`Cancel voucher ${v.code}?`)) return;
    try {
      await cancelVoucher(v.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !data) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <p className="text-sm text-[#9CA3AF]">Loading…</p>;

  const waNumber = customer.mobile?.replace(/[^\d]/g, "").replace(/^(\d{10})$/, "91$1");
  const vars = {
    name: customer.name,
    points: data.points,
    value: inr(data.pointsValue),
    restaurant: restaurantName || "us",
    expiring: data.expiringIn30Days,
    date: data.nextExpiry ? fmtDate(data.nextExpiry.date) : "",
  };
  const message = (key, extra = {}) =>
    `https://wa.me/${waNumber}?text=${encodeURIComponent(fillTemplate(data.templates?.[key], { ...vars, ...extra }))}`;

  return (
    <div className="space-y-4">
      <ErrorNote>{error}</ErrorNote>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard label="Points balance" value={data.points} hint={`worth ${inr(data.pointsValue)}`} accent="text-[#3FA34D] dark:text-[#43B75A]" />
        <StatCard
          label="Membership"
          value={data.tier ? <span style={{ color: data.tier.color }}>{data.tier.name}</span> : "—"}
          hint={data.tier?.multiplier > 1 ? `${data.tier.multiplier}× points` : `Lifetime spend ${inr(data.totalSpent)}`}
        />
        <StatCard label="Lifetime earned" value={data.lifetimeEarned} />
        <StatCard label="Lifetime redeemed" value={data.lifetimeRedeemed} hint={data.lifetimeExpired ? `${data.lifetimeExpired} expired` : undefined} />
        <StatCard
          label="Expiring in 30 days"
          value={data.expiringIn30Days}
          hint={data.nextExpiry ? `${data.nextExpiry.points} pts on ${fmtDate(data.nextExpiry.date)}` : data.rules.pointsExpire ? "Nothing soon" : "Points don't expire"}
          accent={data.expiringIn30Days > 0 ? "text-amber-600 dark:text-amber-400" : undefined}
        />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <a href={message("balance")} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
          <FiMessageCircle /> Send balance on WhatsApp
        </a>
        {data.expiringIn30Days > 0 && (
          <a href={message("expiry")} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
            <FiClock /> Send expiry reminder
          </a>
        )}
        {canManage && (
          <>
            <button onClick={() => setModal("voucher")} className={btnSecondary}><FiGift /> Issue voucher</button>
            <button onClick={() => setModal("adjust")} className={btnPrimary}><FiPlus /> Adjust points</button>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Vouchers */}
        <section className={`${cardClass} p-5`}>
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1F2937] dark:text-white"><FiGift /> Reward vouchers</h3>
          {data.vouchers?.length ? (
            <ul className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {data.vouchers.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{v.title}</p>
                    <p className="text-xs text-[#9CA3AF]">
                      <span className="font-mono">{v.code}</span> · {v.type === "PERCENTAGE" ? `${v.value}% off` : `${inr(v.value)} off`}
                      {v.expiresAt ? ` · expires ${fmtDate(v.expiresAt)}` : ""}
                      {v.status !== "ACTIVE" ? ` · ${v.status.toLowerCase()}` : ""}
                    </p>
                  </div>
                  {v.status === "ACTIVE" && (
                    <div className="flex gap-1">
                      <a href={message("voucher", { title: v.title, code: v.code, expiry: v.expiresAt ? ` before ${fmtDate(v.expiresAt)}` : "" })} target="_blank" rel="noopener noreferrer" className={`${btnSecondary} px-2 py-1 text-xs`}>
                        <FiMessageCircle size={12} /> Send
                      </a>
                      {canManage && (
                        <button onClick={() => cancel(v)} className={`${btnSecondary} px-2 py-1 text-xs text-red-500`} title="Cancel voucher"><FiSlash size={12} /></button>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>No vouchers yet.</EmptyState>
          )}
        </section>

        {/* Referrals */}
        <section className={`${cardClass} p-5`}>
          <h3 className="mb-3 flex items-center gap-2 font-bold text-[#1F2937] dark:text-white"><FiShare2 /> Referrals</h3>
          <div className="flex items-center gap-2">
            <code className="rounded-lg bg-[#F3F5EE] px-3 py-2 font-mono text-lg font-bold tracking-wider text-[#1F2937] dark:bg-white/5 dark:text-white">
              {data.referralCode}
            </code>
            <button onClick={() => navigator.clipboard?.writeText(data.referralCode)} className={`${btnSecondary} px-2.5 py-2`} title="Copy code"><FiCopy /></button>
          </div>
          <p className="mt-2 text-xs text-[#6B7280] dark:text-[#9CA8A0]">
            New customers who use this code get {data.rules.refereePoints} points; {customer.name} gets {data.rules.referrerPoints}.
          </p>
          {data.referredBy && (
            <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA8A0]">Referred by {data.referredBy.name}</p>
          )}
          <p className="mt-3 text-sm font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
            {data.referrals?.length || 0} customer{data.referrals?.length === 1 ? "" : "s"} referred
          </p>
          {data.referrals?.length > 0 && (
            <ul className="mt-1 space-y-1 text-xs text-[#6B7280] dark:text-[#9CA8A0]">
              {data.referrals.map((x) => <li key={x.id}>{x.name} · {x.mobile}</li>)}
            </ul>
          )}
        </section>
      </div>

      {/* Ledger */}
      <section className={`${cardClass} overflow-hidden`}>
        <h3 className="flex items-center gap-2 border-b border-[#E7EAE1] px-5 py-4 font-bold text-[#1F2937] dark:border-[#262B24] dark:text-white">
          <FiAward /> Points history
        </h3>
        {data.transactions?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-[#F3F5EE] text-xs uppercase text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]">
                <tr>
                  <th className="px-4 py-2">When</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Details</th>
                  <th className="px-4 py-2 text-right">Points</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                  <th className="px-4 py-2">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
                {data.transactions.map((t) => (
                  <tr key={t.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-[#6B7280] dark:text-[#9CA8A0]">{fmtDateTime(t.createdAt)}</td>
                    <td className="whitespace-nowrap px-4 py-2 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{TYPE_LABEL[t.type] || t.type}</td>
                    <td className="px-4 py-2 text-[#6B7280] dark:text-[#9CA8A0]">{t.reason || "—"}</td>
                    <td className={`whitespace-nowrap px-4 py-2 text-right font-bold ${t.points >= 0 ? "text-[#3FA34D] dark:text-[#43B75A]" : "text-red-500"}`}>
                      {t.points >= 0 ? "+" : ""}{t.points}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-[#1F2937] dark:text-[#E4E9E2]">{t.balanceAfter ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-[#9CA3AF]">
                      {t.expiresAt ? `${fmtDate(t.expiresAt)}${t.remainingPoints ? ` (${t.remainingPoints} left)` : ""}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4"><EmptyState>No points activity yet.</EmptyState></div>
        )}
      </section>

      {modal === "adjust" && (
        <AdjustModal
          customer={customer}
          balance={data.points}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
            onChange?.();
          }}
        />
      )}
      {modal === "voucher" && (
        <VoucherModal
          customer={customer}
          balance={data.points}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
            onChange?.();
          }}
        />
      )}
    </div>
  );
}

function AdjustModal({ customer, balance, onClose, onSaved }) {
  const [points, setPoints] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await adjustPoints(customer.id, { points: Number(points), reason });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Adjust points"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button form="adjust-form" disabled={saving || !points || !reason.trim()} className={btnPrimary}>{saving ? "Saving…" : "Apply"}</button>
        </>
      }
    >
      <form id="adjust-form" onSubmit={save} className="space-y-3">
        <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{customer.name} has {balance} points.</p>
        <div>
          <label className={labelClass}>Points (use a minus sign to deduct)</label>
          <input autoFocus type="number" value={points} onChange={(e) => setPoints(e.target.value)} className={inputClass} placeholder="e.g. 100 or -50" />
        </div>
        <div>
          <label className={labelClass}>Reason *</label>
          <input value={reason} onChange={(e) => setReason(e.target.value)} className={inputClass} placeholder="e.g. Goodwill for the delayed order" />
        </div>
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Modal>
  );
}

function VoucherModal({ customer, balance, onClose, onSaved }) {
  const [form, setForm] = useState({ title: "", type: "FIXED_AMOUNT", value: "", minBillAmount: "", validDays: 30, pointsCost: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      await issueVoucher(customer.id, {
        ...form,
        value: Number(form.value),
        minBillAmount: form.minBillAmount === "" ? null : Number(form.minBillAmount),
        pointsCost: form.pointsCost === "" ? null : Number(form.pointsCost),
        validDays: Number(form.validDays),
      });
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Issue a reward voucher"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={btnSecondary}>Cancel</button>
          <button form="voucher-form" disabled={saving || !form.title.trim() || !form.value} className={btnPrimary}>{saving ? "Saving…" : "Issue voucher"}</button>
        </>
      }
    >
      <form id="voucher-form" onSubmit={save} className="space-y-3">
        <div>
          <label className={labelClass}>Title *</label>
          <input autoFocus value={form.title} onChange={set("title")} className={inputClass} placeholder="e.g. ₹200 off your next visit" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Type</label>
            <select value={form.type} onChange={set("type")} className={inputClass}>
              <option value="FIXED_AMOUNT">Flat amount off</option>
              <option value="PERCENTAGE">Percentage off</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>{form.type === "PERCENTAGE" ? "Percent *" : "Amount (₹) *"}</label>
            <input type="number" min="1" value={form.value} onChange={set("value")} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Minimum bill (₹)</label>
            <input type="number" min="0" value={form.minBillAmount} onChange={set("minBillAmount")} className={inputClass} placeholder="Any" />
          </div>
          <div>
            <label className={labelClass}>Valid for (days)</label>
            <input type="number" min="1" value={form.validDays} onChange={set("validDays")} className={inputClass} />
          </div>
          <div className="col-span-2">
            <label className={labelClass}>Deduct points for this voucher</label>
            <input type="number" min="0" value={form.pointsCost} onChange={set("pointsCost")} className={inputClass} placeholder={`Leave empty for a free reward · balance ${balance}`} />
          </div>
        </div>
        <ErrorNote>{error}</ErrorNote>
      </form>
    </Modal>
  );
}