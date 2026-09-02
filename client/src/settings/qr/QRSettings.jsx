// ==============================================
// src/settings/qr/QRSettings.jsx
// Updated with dark/light mode support, matching SettingsDashboard
// ==============================================

import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/apiClient";
import BillCodes, { buildUpiLink } from "../../billing/BillCodes";
import { FiSave, FiRefreshCw, FiDownload } from "react-icons/fi";
import { FaQrcode } from "react-icons/fa";

const inputClass =
  "w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] dark:[color-scheme:dark] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors";

const billInputClass =
  "w-full h-14 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] px-4 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors";

const Card = ({ title, right, subtitle, children }) => (
  <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
    <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
      <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">{title}</h2>
      {right}
    </div>
    {subtitle && (
      <p className="mb-8 text-[#6B7280] dark:text-[#9CA8A0]">{subtitle}</p>
    )}
    {!subtitle && <div className="mb-8" />}
    {children}
  </div>
);

const ToggleRow = ({ title, description, checked, onChange, name, defaultChecked }) => (
  <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
    <div>
      <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">{title}</h3>
      <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{description}</p>
    </div>
    <input
      type="checkbox"
      name={name}
      checked={checked}
      defaultChecked={defaultChecked}
      onChange={onChange}
      className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
    />
  </label>
);

const StatBox = ({ label, value }) => (
  <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
    <h3 className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">{label}</h3>
    <p className="text-3xl font-bold mt-3 text-[#1F2937] dark:text-[#E4E9E2]">{value}</p>
  </div>
);

const QRSettings = () => {
  const [settings, setSettings] = useState({
    qrOrdering: true,
    qrType: "Table QR",
    domain: "https://restaurant.com/menu",
    tablePrefix: "TBL",
    totalTables: 20,
  });

  // ==========================================

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ==========================================

  // ── Bill QR & Barcode ──────────────────────────────────────────────────
  // These live on the outlet (see Outlet.upiId etc. in schema.prisma) and are
  // read back by the invoice, so what's configured here is exactly what
  // prints. Kept in their own state object because the QR-ORDERING settings
  // above are a separate, still-unsaved feature — this section persists, that
  // one doesn't yet.
  const EMPTY_BILL = {
    upiId: "",
    upiPayeeName: "",
    showBillQr: true,
    showBillBarcode: true,
    billFooterNote: "",
    name: "",
  };

  const [bill, setBill] = useState(EMPTY_BILL);
  const [savedBill, setSavedBill] = useState(EMPTY_BILL);
  const [loadingBill, setLoadingBill] = useState(true);
  const [savingBill, setSavingBill] = useState(false);
  const [billError, setBillError] = useState("");
  const [billNotice, setBillNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { ok, data } = await apiRequest("/settings/restaurant-profile");
      if (cancelled) return;
      if (ok) {
        const next = {
          upiId: data.upiId || "",
          upiPayeeName: data.upiPayeeName || "",
          showBillQr: data.showBillQr !== false,
          showBillBarcode: data.showBillBarcode !== false,
          billFooterNote: data.billFooterNote || "",
          name: data.name || "",
        };
        setBill(next);
        setSavedBill(next);
      } else {
        setBillError(data?.error || data?.message || "Couldn't load bill settings.");
      }
      setLoadingBill(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // A malformed VPA produces a QR that scans but fails inside the payment
  // app, which is worse than no QR at all — so it's checked before saving.
  const UPI_PATTERN = /^[\w.\-]{2,256}@[a-zA-Z]{2,64}$/;

  function handleBillChange(e) {
    const { name, value, type, checked } = e.target;
    setBill((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  }

  async function handleSaveBill() {
    setBillError("");
    setBillNotice("");
    const upiId = bill.upiId.trim();
    if (upiId && !UPI_PATTERN.test(upiId)) {
      setBillError("That doesn't look like a UPI ID. Expected something like royalspice@ybl.");
      return;
    }
    setSavingBill(true);
    const { ok, data } = await apiRequest("/settings/restaurant-profile", {
      method: "PUT",
      body: JSON.stringify({
        upiId,
        upiPayeeName: bill.upiPayeeName.trim(),
        showBillQr: bill.showBillQr,
        showBillBarcode: bill.showBillBarcode,
        billFooterNote: bill.billFooterNote.trim(),
      }),
    });
    setSavingBill(false);
    if (!ok) {
      setBillError(data?.error || data?.message || "Couldn't save bill settings.");
      return;
    }
    setSavedBill({ ...bill, upiId });
    setBill((prev) => ({ ...prev, upiId }));
    setBillNotice("Saved. New bills will carry these codes.");
  }

  const handleSave = () => {
    console.log(settings);

    // API Later
  };

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#0891B2] dark:bg-[#06B6D4] text-white flex items-center justify-center">
              <FaQrcode size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                QR Ordering Settings
              </h1>

              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
                Configure QR menu ordering for your restaurant.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <button
              className="
                h-12
                px-6
                rounded-xl
                border
                border-[#E7EAE1]
                dark:border-[#262B24]
                text-[#1F2937]
                dark:text-[#E4E9E2]
                hover:bg-[#F3F5EE]
                dark:hover:bg-white/5
                flex
                items-center
                gap-2
                transition-colors
              "
            >
              <FiRefreshCw />
              Reset
            </button>

            <button
              onClick={handleSave}
              className="
                h-12
                px-8
                rounded-xl
                bg-[#3FA34D]
                dark:bg-[#43B75A]
                hover:bg-[#358F42]
                dark:hover:bg-[#3AA34E]
                text-white
                flex
                items-center
                gap-2
                shadow-lg
                transition-all
              "
            >
              <FiSave />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* ======================================
          CONTENT
      ====================================== */}

      <div className="max-w-6xl mx-auto p-8">
        {/* ======================================
            GENERAL SETTINGS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
            General Settings
          </h2>

          <div className="space-y-6">
            <ToggleRow
              title="Enable QR Ordering"
              description="Allow customers to scan QR codes and order."
              name="qrOrdering"
              checked={settings.qrOrdering}
              onChange={handleChange}
            />

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                  QR Type
                </label>

                <select
                  name="qrType"
                  value={settings.qrType}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option>Table QR</option>

                  <option>Restaurant QR</option>

                  <option>Takeaway QR</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                  Menu URL
                </label>

                <input
                  type="text"
                  name="domain"
                  value={settings.domain}
                  onChange={handleChange}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================
            TABLE QR SETTINGS
        ====================================== */}

        <Card title="Table QR Configuration">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Table Prefix
              </label>

              <input
                name="tablePrefix"
                value={settings.tablePrefix}
                onChange={handleChange}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Total Tables
              </label>

              <input
                type="number"
                name="totalTables"
                value={settings.totalTables}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>
        </Card>

        {/* ======================================
            QR DESIGN
        ====================================== */}

        <Card title="QR Design">
          <div className="grid md:grid-cols-2 gap-6">
            {/* QR Color */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                QR Color
              </label>

              <input
                type="color"
                defaultValue="#000000"
                className="w-20 h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg bg-white dark:bg-[#1D231C]"
              />
            </div>

            {/* Background */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Background Color
              </label>

              <input
                type="color"
                defaultValue="#FFFFFF"
                className="w-20 h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg bg-white dark:bg-[#1D231C]"
              />
            </div>

            {/* Logo */}

            <div className="md:col-span-2">
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Restaurant Logo (Center of QR)
              </label>

              <input
                type="file"
                accept="image/*"
                className="w-full border border-[#E7EAE1] dark:border-[#262B24] rounded-lg p-3 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#F3F5EE] dark:file:bg-white/5 file:text-[#1F2937] dark:file:text-[#E4E9E2] transition-colors"
              />

              <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mt-2">
                Optional logo displayed in the center of generated QR codes.
              </p>
            </div>
          </div>
        </Card>

        {/* ======================================
            CUSTOMER ORDER OPTIONS
        ====================================== */}

        <Card title="Customer Order Options">
          <div className="grid md:grid-cols-2 gap-6">
            <ToggleRow
              title="Customer Name Required"
              description="Ask customer name before placing order."
              defaultChecked
            />

            <ToggleRow
              title="Mobile Number Required"
              description="Ask customer mobile number."
            />

            <ToggleRow
              title="Allow Special Instructions"
              description="Customers can add cooking instructions."
              defaultChecked
            />

            <ToggleRow
              title="Allow Online Payment"
              description="Enable payment directly from QR ordering."
              defaultChecked
            />
          </div>
        </Card>

        {/* ======================================
            QR ACTIONS
        ====================================== */}

        <Card title="QR Code Actions">
          <div className="flex flex-wrap gap-4">
            <button
              className="
                h-12
                px-6
                rounded-xl
                bg-[#2563EB]
                dark:bg-[#60A5FA]
                hover:bg-[#1D4ED8]
                dark:hover:bg-[#3B82F6]
                text-white
                transition-colors
              "
            >
              Generate QR Codes
            </button>

            <button
              className="
                h-12
                px-6
                rounded-xl
                bg-[#3FA34D]
                dark:bg-[#43B75A]
                hover:bg-[#358F42]
                dark:hover:bg-[#3AA34E]
                text-white
                flex
                items-center
                gap-2
                transition-colors
              "
            >
              <FiDownload />
              Download All QR Codes
            </button>

            <button
              className="
                h-12
                px-6
                rounded-xl
                border
                border-[#E7EAE1]
                dark:border-[#262B24]
                text-[#1F2937]
                dark:text-[#E4E9E2]
                hover:bg-[#F3F5EE]
                dark:hover:bg-white/5
                transition-colors
              "
            >
              Print QR Codes
            </button>
          </div>
        </Card>

        {/* ======================================
            QR STATISTICS
        ====================================== */}

        <Card
          title="QR Statistics"
          right={
            <span className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
              Live Overview
            </span>
          }
        >
          <div className="grid md:grid-cols-4 gap-6">
            <StatBox label="Total QR Codes" value={settings.totalTables} />
            <StatBox label="Total Scans" value="2,458" />
            <StatBox label="Orders via QR" value="812" />
            <StatBox label="Active Tables" value="18" />
          </div>
        </Card>

        {/* ======================================
            BILL QR & BARCODE
        ====================================== */}

        <Card
          title="Bill QR & Barcode"
          subtitle="Printed at the foot of every invoice. The barcode carries the bill number for staff lookup; the QR is a UPI payment link that opens with the exact bill amount already filled in."
        >
          {billError && (
            <div className="mb-6 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-5 py-4 text-sm font-medium text-red-700 dark:text-red-300">
              {billError}
            </div>
          )}
          {billNotice && (
            <div className="mb-6 rounded-xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-5 py-4 text-sm font-medium text-emerald-800 dark:text-emerald-300">
              {billNotice}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                UPI ID (VPA)
              </label>
              <input
                name="upiId"
                value={bill.upiId}
                onChange={handleBillChange}
                placeholder="e.g. royalspice@ybl"
                className={`font-mono ${billInputClass}`}
              />
              <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                Leave blank to print no payment QR. Nothing else is needed —
                the QR is built from this.
              </p>
            </div>

            <div>
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Payee name shown in the UPI app
              </label>
              <input
                name="upiPayeeName"
                value={bill.upiPayeeName}
                onChange={handleBillChange}
                placeholder={bill.name || "Restaurant name"}
                className={billInputClass}
              />
              <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                Defaults to the restaurant name when left blank.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Footer note (optional)
              </label>
              <input
                name="billFooterNote"
                value={bill.billFooterNote}
                onChange={handleBillChange}
                placeholder="e.g. Thank you! Free Wi-Fi: RoyalSpiceGuest"
                className={billInputClass}
              />
            </div>

            <label className="flex items-center gap-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
              <input
                type="checkbox"
                name="showBillBarcode"
                checked={bill.showBillBarcode}
                onChange={handleBillChange}
                className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
              />
              Print barcode on bills
            </label>

            <label className="flex items-center gap-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
              <input
                type="checkbox"
                name="showBillQr"
                checked={bill.showBillQr}
                onChange={handleBillChange}
                className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
              />
              Print UPI payment QR on bills
            </label>
          </div>

          {/* Live preview — the SAME component the invoice uses, fed sample
              values, so this can't drift from what actually prints. */}
          <div className="mt-8 border-t border-[#E7EAE1] dark:border-[#262B24] pt-8">
            <h3 className="mb-4 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
              Preview on a sample bill
            </h3>
            <div className="inline-block rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white p-5 font-mono text-[11px] text-black">
              <BillCodes
                outlet={{
                  ...bill,
                  name: bill.name,
                }}
                reference="INV-000011"
                tableName="T-3"
                amount={1444.8}
              />
              {!bill.upiId && !bill.showBillBarcode && (
                <p className="text-gray-400">
                  Nothing to print — add a UPI ID or enable the barcode.
                </p>
              )}
            </div>
            {bill.upiId && (
              <p className="mt-3 break-all text-xs text-[#6B7280] dark:text-[#9CA8A0]">
                QR encodes:{" "}
                <span className="font-mono">
                  {buildUpiLink({
                    upiId: bill.upiId,
                    payeeName: bill.upiPayeeName || bill.name,
                    amount: 1444.8,
                    reference: "INV-000011",
                  })}
                </span>
              </p>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-4">
            <button
              type="button"
              onClick={() => {
                setBill(savedBill);
                setBillError("");
                setBillNotice("");
              }}
              disabled={savingBill || loadingBill}
              className="h-12 px-6 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#1F2937] dark:text-[#E4E9E2] hover:bg-[#F3F5EE] dark:hover:bg-white/5 font-semibold disabled:opacity-50 transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveBill}
              disabled={savingBill || loadingBill}
              className="h-12 px-8 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white font-semibold flex items-center gap-2 disabled:opacity-60 shadow-lg transition-all"
            >
              <FiSave />
              {savingBill ? "Saving…" : "Save Bill Codes"}
            </button>
          </div>
        </Card>

        {/* ======================================
            QR PREVIEW
        ====================================== */}

        <Card title="QR Preview">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-center bg-[#F9FAFB] dark:bg-[#12160F]">
              <FaQrcode size={120} className="text-[#9CA3AF] dark:text-[#6B7280]" />
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                Preview Information
              </h3>

              <p className="text-[#6B7280] dark:text-[#9CA8A0]">
                Type :
                <span className="font-semibold ml-2 text-[#1F2937] dark:text-[#E4E9E2]">
                  {settings.qrType}
                </span>
              </p>

              <p className="text-[#6B7280] dark:text-[#9CA8A0]">
                URL :
                <span className="font-semibold ml-2 break-all text-[#1F2937] dark:text-[#E4E9E2]">
                  {settings.domain}
                </span>
              </p>

              <p className="text-[#6B7280] dark:text-[#9CA8A0]">
                Table Prefix :
                <span className="font-semibold ml-2 text-[#1F2937] dark:text-[#E4E9E2]">
                  {settings.tablePrefix}
                </span>
              </p>
            </div>
          </div>
        </Card>

        {/* ======================================
            FOOTER
        ====================================== */}

        <div className="flex justify-end gap-4 mt-8 pb-10">
          <button
            className="
              h-12
              px-6
              rounded-xl
              border
              border-[#E7EAE1]
              dark:border-[#262B24]
              text-[#1F2937]
              dark:text-[#E4E9E2]
              hover:bg-[#F3F5EE]
              dark:hover:bg-white/5
              transition-colors
            "
          >
            Reset Settings
          </button>

          <button
            onClick={handleSave}
            className="
              h-12
              px-8
              rounded-xl
              bg-[#3FA34D]
              dark:bg-[#43B75A]
              hover:bg-[#358F42]
              dark:hover:bg-[#3AA34E]
              text-white
              flex
              items-center
              gap-2
              shadow-lg
              transition-all
            "
          >
            <FiSave />
            Save QR Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRSettings;