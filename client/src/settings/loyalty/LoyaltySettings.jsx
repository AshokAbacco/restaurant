// ==============================================
// src/settings/loyalty/LoyaltySettings.jsx
// Settings -> Loyalty. Earning rate, redemption value, expiry, automatic
// rewards, membership levels and the customer message templates.
// Loyalty rides on CRM: it only works while Settings -> CRM is on, because
// points belong to a customer and orders get their customer from the POS.
// ==============================================

import React from "react";
import { Link } from "react-router-dom";
import { FiAward, FiSave, FiRefreshCw, FiExternalLink, FiPlus, FiTrash2 } from "react-icons/fi";
import useModuleSettings from "../useModuleSettings";
import SaveToast from "../SaveToast";
import { useCrm } from "../../crm/CrmContext";

const DEFAULT_TIERS = [
  { name: "Silver", minSpend: 0, multiplier: 1, color: "#9CA3AF" },
  { name: "Gold", minSpend: 10000, multiplier: 1.25, color: "#D97706" },
  { name: "Platinum", minSpend: 50000, multiplier: 1.5, color: "#7C3AED" },
];

const DEFAULTS = {
  earnSpendAmount: 100,
  earnPoints: 1,
  minBillForEarning: 0,
  redeemPoints: 100,
  redeemValue: 100,
  minRedeemPoints: 100,
  maxRedeemPercent: 50,
  minBillForRedemption: 0,
  pointsExpire: true,
  expiryDays: 365,
  welcomeBonusPoints: 50,
  birthdayRewardType: "POINTS",
  birthdayPoints: 100,
  birthdayVoucherValue: 200,
  anniversaryRewardType: "POINTS",
  anniversaryPoints: 100,
  anniversaryVoucherValue: 200,
  occasionVoucherValidDays: 30,
  referrerPoints: 100,
  refereePoints: 50,
  voucherValidDays: 30,
  tiersEnabled: true,
  tiers: DEFAULT_TIERS,
  templates: {},
};

const inputClass =
  "w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors";

const Card = ({ title, subtitle, children }) => (
  <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
    <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">{title}</h2>
    {subtitle && <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA8A0]">{subtitle}</p>}
    <div className="mt-8">{children}</div>
  </div>
);

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">{label}</label>
    {children}
    {hint && <p className="mt-1.5 text-xs text-[#6B7280] dark:text-[#9CA8A0]">{hint}</p>}
  </div>
);

const ToggleRow = ({ title, description, checked, onChange, disabled }) => (
  <label className={`flex items-center justify-between gap-4 border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
    <div>
      <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{title}</h3>
      <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{description}</p>
    </div>
    <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="w-5 h-5 shrink-0 accent-[#3FA34D] dark:accent-[#43B75A]" />
  </label>
);

const LoyaltySettings = () => {
  const { settings, setSettings, meta, loading, saving, message, save, reset } = useModuleSettings("loyalty", DEFAULTS);
  const { enabled: crmEnabled, refresh } = useCrm();
  const enabled = Boolean(meta.enabled);

  const setNum = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.value === "" ? "" : Number(e.target.value) }));
  const setVal = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.value }));
  const setBool = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.checked }));

  const tiers = Array.isArray(settings.tiers) ? settings.tiers : DEFAULT_TIERS;
  const setTier = (i, key, value) =>
    setSettings((s) => {
      const next = [...(Array.isArray(s.tiers) ? s.tiers : DEFAULT_TIERS)];
      next[i] = { ...next[i], [key]: key === "name" || key === "color" ? value : Number(value) };
      return { ...s, tiers: next };
    });
  const addTier = () =>
    setSettings((s) => ({ ...s, tiers: [...(s.tiers || []), { name: "New level", minSpend: 0, multiplier: 1, color: "#3FA34D" }] }));
  const removeTier = (i) => setSettings((s) => ({ ...s, tiers: (s.tiers || []).filter((_, idx) => idx !== i) }));

  const toggleEnabled = async () => {
    const saved = await save({ enabled: !enabled });
    if (saved) refresh();
  };
  const handleSave = async () => {
    const saved = await save();
    if (saved) refresh();
  };
  const handleReset = async () => {
    const saved = await reset();
    if (saved) refresh();
  };

  // Worked example, so the owner can see what the numbers mean.
  const example = (() => {
    const spend = 2000;
    const pts = settings.earnSpendAmount > 0 ? Math.floor((spend / settings.earnSpendAmount) * (settings.earnPoints || 0)) : 0;
    const worth = settings.redeemPoints > 0 ? (pts / settings.redeemPoints) * (settings.redeemValue || 0) : 0;
    return { spend, pts, worth: Math.round(worth) };
  })();

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* HEADER */}
      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#D97706] dark:bg-[#F59E0B] text-white flex items-center justify-center">
              <FiAward size={30} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">Loyalty</h1>
              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
                Reward repeat customers with points, vouchers and membership levels.
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <button onClick={handleReset} disabled={saving || loading} className="h-12 px-6 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#1F2937] dark:text-[#E4E9E2] hover:bg-[#F3F5EE] dark:hover:bg-[#1D231C] flex items-center gap-2 disabled:opacity-50">
              <FiRefreshCw /> Reset
            </button>
            <button onClick={handleSave} disabled={saving || loading} className="h-12 px-8 rounded-xl bg-[#2563EB] dark:bg-[#60A5FA] hover:bg-[#1D4ED8] dark:hover:bg-[#3B82F6] text-white flex items-center gap-2 disabled:opacity-50">
              <FiSave /> {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 pb-16">
        {/* ENABLE */}
        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">Loyalty programme</h2>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${enabled ? "bg-[#EAF6EC] text-[#2F7D3A] dark:bg-[#43B75A]/10 dark:text-[#43B75A]" : "bg-[#F3F5EE] text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]"}`}>
                  {loading ? "…" : enabled ? "On" : "Off"}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280] dark:text-[#9CA8A0]">
                Points are added automatically when a bill with a customer on it is completed, and can be redeemed at billing.
              </p>
              {!crmEnabled && (
                <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                  CRM is off, so loyalty stays inactive even when switched on here. Turn on <Link to="/settings/crm" className="underline">Settings → CRM</Link> first.
                </p>
              )}
            </div>
            <button
              onClick={toggleEnabled}
              disabled={saving || loading}
              role="switch"
              aria-checked={enabled}
              className={`relative h-9 w-16 shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-[#3FA34D] dark:bg-[#43B75A]" : "bg-[#D5DAD0] dark:bg-[#2E342C]"}`}
            >
              <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${enabled ? "left-8" : "left-1"}`} />
              <span className="sr-only">{enabled ? "Turn loyalty off" : "Turn loyalty on"}</span>
            </button>
          </div>
          {enabled && crmEnabled && (
            <Link to="/crm/loyalty" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
              Open the loyalty programme <FiExternalLink />
            </Link>
          )}
        </div>

        {/* EARNING */}
        <Card title="Earning points" subtitle="How customers collect points when they pay.">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Field label="Spend amount (₹)" hint="The rupees a customer must spend…"><input type="number" min="1" value={settings.earnSpendAmount} onChange={setNum("earnSpendAmount")} className={inputClass} /></Field>
            <Field label="…earns this many points" hint="e.g. ₹100 spent = 1 point"><input type="number" min="1" value={settings.earnPoints} onChange={setNum("earnPoints")} className={inputClass} /></Field>
            <Field label="Minimum bill to earn (₹)" hint="Smaller bills earn nothing. 0 = every bill earns."><input type="number" min="0" value={settings.minBillForEarning} onChange={setNum("minBillForEarning")} className={inputClass} /></Field>
          </div>
          <p className="mt-6 rounded-xl bg-[#F3F5EE] dark:bg-white/5 p-4 text-sm text-[#1F2937] dark:text-[#E4E9E2]">
            <strong>Example:</strong> a customer spends ₹{example.spend.toLocaleString("en-IN")} and earns{" "}
            <strong>{example.pts} points</strong>, worth about <strong>₹{example.worth}</strong> on a future bill.
            Membership levels and bonus campaigns can multiply this.
          </p>
        </Card>

        {/* REDEMPTION */}
        <Card title="Redeeming points" subtitle="How points turn into a discount at billing.">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Field label="Points" hint="e.g. 100 points…"><input type="number" min="1" value={settings.redeemPoints} onChange={setNum("redeemPoints")} className={inputClass} /></Field>
            <Field label="…are worth (₹)" hint="…= ₹100 off the bill"><input type="number" min="1" value={settings.redeemValue} onChange={setNum("redeemValue")} className={inputClass} /></Field>
            <Field label="Minimum points to redeem" hint="Stops tiny redemptions."><input type="number" min="1" value={settings.minRedeemPoints} onChange={setNum("minRedeemPoints")} className={inputClass} /></Field>
            <Field label="Maximum % of a bill" hint="At most this share of a bill can be paid with points."><input type="number" min="1" max="100" value={settings.maxRedeemPercent} onChange={setNum("maxRedeemPercent")} className={inputClass} /></Field>
            <Field label="Minimum bill to redeem (₹)" hint="0 = any bill."><input type="number" min="0" value={settings.minBillForRedemption} onChange={setNum("minBillForRedemption")} className={inputClass} /></Field>
            <Field label="Voucher validity (days)" hint="How long a voucher bought with points stays usable."><input type="number" min="1" value={settings.voucherValidDays} onChange={setNum("voucherValidDays")} className={inputClass} /></Field>
          </div>
        </Card>

        {/* EXPIRY */}
        <Card title="Points expiry" subtitle="Unused points can lapse so old balances don't pile up.">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <ToggleRow
              title="Points expire"
              description="Oldest points are used first, and anything unused past its date lapses."
              checked={Boolean(settings.pointsExpire)}
              onChange={setBool("pointsExpire")}
            />
            <Field label="Valid for (days after earning)" hint="365 = a year from the visit that earned them.">
              <input type="number" min="1" value={settings.expiryDays} onChange={setNum("expiryDays")} className={inputClass} disabled={!settings.pointsExpire} />
            </Field>
          </div>
        </Card>

        {/* AUTOMATIC REWARDS */}
        <Card title="Automatic rewards" subtitle="Given without anyone having to remember.">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Field label="Welcome bonus (points)" hint="Added on a new customer's first bill. 0 = off."><input type="number" min="0" value={settings.welcomeBonusPoints} onChange={setNum("welcomeBonusPoints")} className={inputClass} /></Field>

            <Field label="Birthday reward">
              <select value={settings.birthdayRewardType} onChange={setVal("birthdayRewardType")} className={inputClass}>
                <option value="POINTS">Bonus points</option>
                <option value="VOUCHER">Discount voucher</option>
                <option value="NONE">None</option>
              </select>
            </Field>
            <Field label={settings.birthdayRewardType === "VOUCHER" ? "Birthday voucher value (₹)" : "Birthday points"}>
              <input
                type="number"
                min="0"
                value={settings.birthdayRewardType === "VOUCHER" ? settings.birthdayVoucherValue : settings.birthdayPoints}
                onChange={setNum(settings.birthdayRewardType === "VOUCHER" ? "birthdayVoucherValue" : "birthdayPoints")}
                className={inputClass}
                disabled={settings.birthdayRewardType === "NONE"}
              />
            </Field>

            <Field label="Anniversary reward">
              <select value={settings.anniversaryRewardType} onChange={setVal("anniversaryRewardType")} className={inputClass}>
                <option value="POINTS">Bonus points</option>
                <option value="VOUCHER">Discount voucher</option>
                <option value="NONE">None</option>
              </select>
            </Field>
            <Field label={settings.anniversaryRewardType === "VOUCHER" ? "Anniversary voucher value (₹)" : "Anniversary points"}>
              <input
                type="number"
                min="0"
                value={settings.anniversaryRewardType === "VOUCHER" ? settings.anniversaryVoucherValue : settings.anniversaryPoints}
                onChange={setNum(settings.anniversaryRewardType === "VOUCHER" ? "anniversaryVoucherValue" : "anniversaryPoints")}
                className={inputClass}
                disabled={settings.anniversaryRewardType === "NONE"}
              />
            </Field>
            <Field label="Occasion voucher validity (days)"><input type="number" min="1" value={settings.occasionVoucherValidDays} onChange={setNum("occasionVoucherValidDays")} className={inputClass} /></Field>

            <Field label="Referral: points for the referrer" hint="The existing customer who shared their code."><input type="number" min="0" value={settings.referrerPoints} onChange={setNum("referrerPoints")} className={inputClass} /></Field>
            <Field label="Referral: points for the new customer" hint="Given on their first bill."><input type="number" min="0" value={settings.refereePoints} onChange={setNum("refereePoints")} className={inputClass} /></Field>
          </div>
        </Card>

        {/* TIERS */}
        <Card title="Membership levels" subtitle="Silver, Gold, Platinum — based on lifetime spend, each with its own points multiplier.">
          <ToggleRow
            title="Use membership levels"
            description="Off means everyone earns at the base rate."
            checked={Boolean(settings.tiersEnabled)}
            onChange={setBool("tiersEnabled")}
          />
          {settings.tiersEnabled && (
            <div className="mt-6 space-y-3">
              {tiers.map((t, i) => (
                <div key={i} className="grid grid-cols-2 items-end gap-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-4 md:grid-cols-5">
                  <Field label="Name"><input value={t.name} onChange={(e) => setTier(i, "name", e.target.value)} className={inputClass} /></Field>
                  <Field label="From lifetime spend (₹)"><input type="number" min="0" value={t.minSpend} onChange={(e) => setTier(i, "minSpend", e.target.value)} className={inputClass} /></Field>
                  <Field label="Points multiplier"><input type="number" step="0.05" min="1" value={t.multiplier} onChange={(e) => setTier(i, "multiplier", e.target.value)} className={inputClass} /></Field>
                  <Field label="Colour"><input type="color" value={t.color} onChange={(e) => setTier(i, "color", e.target.value)} className="h-12 w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C]" /></Field>
                  <button onClick={() => removeTier(i)} className="h-12 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center justify-center gap-2">
                    <FiTrash2 /> Remove
                  </button>
                </div>
              ))}
              <button onClick={addTier} className="h-12 px-5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#1F2937] dark:text-[#E4E9E2] hover:bg-[#F3F5EE] dark:hover:bg-[#1D231C] flex items-center gap-2">
                <FiPlus /> Add level
              </button>
            </div>
          )}
        </Card>

        <div className="mt-10 flex justify-end">
          <button onClick={handleSave} disabled={saving || loading} className="h-14 px-10 rounded-2xl bg-[#2563EB] dark:bg-[#60A5FA] hover:bg-[#1D4ED8] dark:hover:bg-[#3B82F6] text-white font-semibold flex items-center gap-3 disabled:opacity-50">
            <FiSave /> {saving ? "Saving…" : "Save Loyalty Settings"}
          </button>
        </div>
      </div>

      <SaveToast message={message} />
    </div>
  );
};

export default LoyaltySettings;