// ==============================================
// src/settings/crm/CrmSettings.jsx
// Settings -> CRM. The on/off switch here controls CRM everywhere: the CRM
// pages, the sidebar link, and the customer panel on the POS order screen.
// ==============================================

import React from "react";
import { Link } from "react-router-dom";
import { FiUsers, FiSave, FiRefreshCw, FiExternalLink } from "react-icons/fi";
import useModuleSettings from "../useModuleSettings";
import SaveToast from "../SaveToast";
import { useCrm } from "../../crm/CrmContext";

const DEFAULTS = {
  vipSpendThreshold: 10000,
  vipOrderThreshold: 15,
  regularOrderThreshold: 3,
  inactiveDays: 45,
  occasionLookaheadDays: 7,
  requireCustomerForTakeaway: false,
  requireCustomerForDelivery: false,
  showInsightsOnPos: true,
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

const ToggleRow = ({ title, description, checked, onChange, disabled }) => (
  <label className={`flex items-center justify-between gap-4 border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5 ${disabled ? "opacity-50" : "cursor-pointer"}`}>
    <div>
      <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{title}</h3>
      <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{description}</p>
    </div>
    <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} className="w-5 h-5 shrink-0 accent-[#3FA34D] dark:accent-[#43B75A]" />
  </label>
);

const NumberField = ({ label, hint, value, onChange, min = 0, prefix }) => (
  <div>
    <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">{label}</label>
    <div className="relative">
      {prefix && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF]">{prefix}</span>}
      <input type="number" min={min} value={value} onChange={onChange} className={`${inputClass} ${prefix ? "pl-8" : ""}`} />
    </div>
    {hint && <p className="mt-1.5 text-xs text-[#6B7280] dark:text-[#9CA8A0]">{hint}</p>}
  </div>
);

const CrmSettings = () => {
  const { settings, setSettings, meta, loading, saving, message, save, reset } = useModuleSettings("crm", DEFAULTS);
  const { refresh } = useCrm();
  const enabled = Boolean(meta.enabled);

  const setNum = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.value === "" ? "" : Number(e.target.value) }));
  const setBool = (key) => (e) => setSettings((s) => ({ ...s, [key]: e.target.checked }));

  // The switch saves immediately — it's the one setting people expect to
  // take effect the moment they flip it.
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

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* HEADER */}
      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#7C3AED] dark:bg-[#A78BFA] text-white flex items-center justify-center">
              <FiUsers size={30} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">CRM</h1>
              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
                Customer profiles, purchase history, follow-ups — and customer selection on the POS.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleReset}
              disabled={saving || loading}
              className="h-12 px-6 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#1F2937] dark:text-[#E4E9E2] hover:bg-[#F3F5EE] dark:hover:bg-[#1D231C] flex items-center gap-2 disabled:opacity-50"
            >
              <FiRefreshCw />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="h-12 px-8 rounded-xl bg-[#2563EB] dark:bg-[#60A5FA] hover:bg-[#1D4ED8] dark:hover:bg-[#3B82F6] text-white flex items-center gap-2 disabled:opacity-50"
            >
              <FiSave />
              {saving ? "Saving…" : "Save"}
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
                <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">Customer Relationship Management</h2>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    enabled
                      ? "bg-[#EAF6EC] text-[#2F7D3A] dark:bg-[#43B75A]/10 dark:text-[#43B75A]"
                      : "bg-[#F3F5EE] text-[#6B7280] dark:bg-white/5 dark:text-[#9CA8A0]"
                  }`}
                >
                  {loading ? "…" : enabled ? "On" : "Off"}
                </span>
              </div>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6B7280] dark:text-[#9CA8A0]">
                When on, staff can search, select or add a customer while taking an order on the POS. The order is linked to the
                customer, and their visits, spend and favourite items update automatically. When off, no customer fields appear on
                the POS and the CRM pages are closed.
              </p>
            </div>
            <button
              onClick={toggleEnabled}
              disabled={saving || loading}
              role="switch"
              aria-checked={enabled}
              className={`relative h-9 w-16 shrink-0 rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-[#3FA34D] dark:bg-[#43B75A]" : "bg-[#D5DAD0] dark:bg-[#2E342C]"}`}
            >
              <span className={`absolute top-1 h-7 w-7 rounded-full bg-white shadow transition-all ${enabled ? "left-8" : "left-1"}`} />
              <span className="sr-only">{enabled ? "Turn CRM off" : "Turn CRM on"}</span>
            </button>
          </div>
          {enabled && (
            <Link to="/crm" className="mt-6 inline-flex items-center gap-2 font-semibold text-[#2563EB] dark:text-[#60A5FA] hover:underline">
              Open CRM <FiExternalLink />
            </Link>
          )}
        </div>

        {/* POS */}
        <Card title="Point of sale" subtitle="How CRM shows up while taking orders.">
          <div className="grid grid-cols-1 gap-4">
            <ToggleRow
              title="Show customer insights on POS"
              description="Show orders, spend, average bill, last visit, favourite dish and pinned notes when a customer is selected."
              checked={Boolean(settings.showInsightsOnPos)}
              onChange={setBool("showInsightsOnPos")}
              disabled={!enabled}
            />
            <ToggleRow
              title="Require a customer for takeaway orders"
              description="Staff must pick or add a customer before a takeaway order can go to billing."
              checked={Boolean(settings.requireCustomerForTakeaway)}
              onChange={setBool("requireCustomerForTakeaway")}
              disabled={!enabled}
            />
            <ToggleRow
              title="Require a customer for delivery orders"
              description="Staff must pick or add a customer before a delivery order is placed."
              checked={Boolean(settings.requireCustomerForDelivery)}
              onChange={setBool("requireCustomerForDelivery")}
              disabled={!enabled}
            />
          </div>
        </Card>

        {/* SEGMENTS */}
        <Card title="Customer segments" subtitle="How customers are grouped on the CRM pages. Changes apply straight away to every customer.">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <NumberField label="VIP after spending" prefix="₹" value={settings.vipSpendThreshold} onChange={setNum("vipSpendThreshold")} hint="Lifetime spend that makes a customer VIP." />
            <NumberField label="…or after this many orders" min={1} value={settings.vipOrderThreshold} onChange={setNum("vipOrderThreshold")} hint="Either condition makes them VIP." />
            <NumberField label="Regular after this many orders" min={2} value={settings.regularOrderThreshold} onChange={setNum("regularOrderThreshold")} hint="Fewer orders than this counts as New." />
            <NumberField label="At risk after no visit for (days)" min={1} value={settings.inactiveDays} onChange={setNum("inactiveDays")} hint="Customers to win back." />
            <NumberField label="Show birthdays & anniversaries coming up within (days)" min={1} value={settings.occasionLookaheadDays} onChange={setNum("occasionLookaheadDays")} hint="Used on the CRM overview. Maximum 60." />
          </div>
        </Card>

        <div className="mt-10 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="h-14 px-10 rounded-2xl bg-[#2563EB] dark:bg-[#60A5FA] hover:bg-[#1D4ED8] dark:hover:bg-[#3B82F6] text-white font-semibold flex items-center gap-3 disabled:opacity-50"
          >
            <FiSave />
            {saving ? "Saving…" : "Save CRM Settings"}
          </button>
        </div>
      </div>

      <SaveToast message={message} />
    </div>
  );
};

export default CrmSettings;