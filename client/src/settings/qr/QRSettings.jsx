// ==============================================
// src/settings/qr/QRSettings.jsx
// ==============================================

import React, { useEffect, useState } from "react";
import { apiRequest } from "../../api/apiClient";
import BillCodes, { buildUpiLink } from "../../billing/BillCodes";
import { FiSave, FiRefreshCw, FiDownload } from "react-icons/fi";
import { FaQrcode } from "react-icons/fa";
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
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-green-600 text-white flex items-center justify-center">
              <FaQrcode size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold">QR Ordering Settings</h1>

              <p className="mt-2 text-gray-500">
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
                hover:bg-gray-100
                flex
                items-center
                gap-2
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
                bg-blue-600
                hover:bg-blue-700
                text-white
                flex
                items-center
                gap-2
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

        <div className="bg-white rounded-2xl border p-8">
          <h2 className="text-2xl font-bold mb-8">General Settings</h2>

          <div className="space-y-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable QR Ordering</h3>

                <p className="text-sm text-gray-500">
                  Allow customers to scan QR codes and order.
                </p>
              </div>

              <input
                type="checkbox"
                name="qrOrdering"
                checked={settings.qrOrdering}
                onChange={handleChange}
                className="w-5 h-5"
              />
            </label>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block mb-2 font-medium">QR Type</label>

                <select
                  name="qrType"
                  value={settings.qrType}
                  onChange={handleChange}
                  className="w-full h-12 border rounded-lg px-4"
                >
                  <option>Table QR</option>

                  <option>Restaurant QR</option>

                  <option>Takeaway QR</option>
                </select>
              </div>

              <div>
                <label className="block mb-2 font-medium">Menu URL</label>

                <input
                  type="text"
                  name="domain"
                  value={settings.domain}
                  onChange={handleChange}
                  className="w-full h-12 border rounded-lg px-4"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================
            TABLE QR SETTINGS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Table QR Configuration</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">Table Prefix</label>

              <input
                name="tablePrefix"
                value={settings.tablePrefix}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Total Tables</label>

              <input
                type="number"
                name="totalTables"
                value={settings.totalTables}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
              />
            </div>
          </div>
        </div>
        {/* ======================================
            QR DESIGN
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">QR Design</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* QR Color */}

            <div>
              <label className="block mb-2 font-medium">QR Color</label>

              <input
                type="color"
                defaultValue="#000000"
                className="w-20 h-12 border rounded-lg"
              />
            </div>

            {/* Background */}

            <div>
              <label className="block mb-2 font-medium">Background Color</label>

              <input
                type="color"
                defaultValue="#FFFFFF"
                className="w-20 h-12 border rounded-lg"
              />
            </div>

            {/* Logo */}

            <div className="md:col-span-2">
              <label className="block mb-2 font-medium">
                Restaurant Logo (Center of QR)
              </label>

              <input
                type="file"
                accept="image/*"
                className="w-full border rounded-lg p-3"
              />

              <p className="text-sm text-gray-500 mt-2">
                Optional logo displayed in the center of generated QR codes.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================
            CUSTOMER ORDER OPTIONS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Customer Order Options</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Customer Name Required</h3>

                <p className="text-sm text-gray-500">
                  Ask customer name before placing order.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Mobile Number Required</h3>

                <p className="text-sm text-gray-500">
                  Ask customer mobile number.
                </p>
              </div>

              <input type="checkbox" className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Allow Special Instructions</h3>

                <p className="text-sm text-gray-500">
                  Customers can add cooking instructions.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>

            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Allow Online Payment</h3>

                <p className="text-sm text-gray-500">
                  Enable payment directly from QR ordering.
                </p>
              </div>

              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </label>
          </div>
        </div>

        {/* ======================================
            QR ACTIONS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">QR Code Actions</h2>

          <div className="flex flex-wrap gap-4">
            <button
              className="
                h-12
                px-6
                rounded-xl
                bg-blue-600
                hover:bg-blue-700
                text-white
              "
            >
              Generate QR Codes
            </button>

            <button
              className="
                h-12
                px-6
                rounded-xl
                bg-green-600
                hover:bg-green-700
                text-white
                flex
                items-center
                gap-2
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
                hover:bg-gray-100
              "
            >
              Print QR Codes
            </button>
          </div>
        </div>
        {/* ======================================
            QR STATISTICS
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">QR Statistics</h2>

            <span className="text-sm text-gray-500">Live Overview</span>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="text-sm text-gray-500">Total QR Codes</h3>

              <p className="text-3xl font-bold mt-3">{settings.totalTables}</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-sm text-gray-500">Total Scans</h3>

              <p className="text-3xl font-bold mt-3">2,458</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-sm text-gray-500">Orders via QR</h3>

              <p className="text-3xl font-bold mt-3">812</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-sm text-gray-500">Active Tables</h3>

              <p className="text-3xl font-bold mt-3">18</p>
            </div>
          </div>
        </div>

        {/* ======================================
            BILL QR & BARCODE
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-2">Bill QR &amp; Barcode</h2>
          <p className="mb-8 text-gray-600">
            Printed at the foot of every invoice. The barcode carries the bill
            number for staff lookup; the QR is a UPI payment link that opens
            with the exact bill amount already filled in.
          </p>

          {billError && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
              {billError}
            </div>
          )}
          {billNotice && (
            <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-medium text-emerald-800">
              {billNotice}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <label className="block mb-3 font-semibold">UPI ID (VPA)</label>
              <input
                name="upiId"
                value={bill.upiId}
                onChange={handleBillChange}
                placeholder="e.g. royalspice@ybl"
                className="w-full h-14 rounded-xl border border-gray-300 px-4 font-mono"
              />
              <p className="mt-2 text-sm text-gray-500">
                Leave blank to print no payment QR. Nothing else is needed —
                the QR is built from this.
              </p>
            </div>

            <div>
              <label className="block mb-3 font-semibold">
                Payee name shown in the UPI app
              </label>
              <input
                name="upiPayeeName"
                value={bill.upiPayeeName}
                onChange={handleBillChange}
                placeholder={bill.name || "Restaurant name"}
                className="w-full h-14 rounded-xl border border-gray-300 px-4"
              />
              <p className="mt-2 text-sm text-gray-500">
                Defaults to the restaurant name when left blank.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block mb-3 font-semibold">
                Footer note (optional)
              </label>
              <input
                name="billFooterNote"
                value={bill.billFooterNote}
                onChange={handleBillChange}
                placeholder="e.g. Thank you! Free Wi-Fi: RoyalSpiceGuest"
                className="w-full h-14 rounded-xl border border-gray-300 px-4"
              />
            </div>

            <label className="flex items-center gap-3 font-semibold">
              <input
                type="checkbox"
                name="showBillBarcode"
                checked={bill.showBillBarcode}
                onChange={handleBillChange}
                className="w-5 h-5"
              />
              Print barcode on bills
            </label>

            <label className="flex items-center gap-3 font-semibold">
              <input
                type="checkbox"
                name="showBillQr"
                checked={bill.showBillQr}
                onChange={handleBillChange}
                className="w-5 h-5"
              />
              Print UPI payment QR on bills
            </label>
          </div>

          {/* Live preview — the SAME component the invoice uses, fed sample
              values, so this can't drift from what actually prints. */}
          <div className="mt-8 border-t pt-8">
            <h3 className="mb-4 font-semibold">Preview on a sample bill</h3>
            <div className="inline-block rounded-xl border bg-white p-5 font-mono text-[11px]">
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
              <p className="mt-3 break-all text-xs text-gray-500">
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
              className="h-12 px-6 rounded-xl border border-gray-300 hover:bg-gray-100 font-semibold disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSaveBill}
              disabled={savingBill || loadingBill}
              className="h-12 px-8 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2 disabled:opacity-60"
            >
              <FiSave />
              {savingBill ? "Saving…" : "Save Bill Codes"}
            </button>
          </div>
        </div>

        {/* ======================================
            QR PREVIEW
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">QR Preview</h2>

          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="w-52 h-52 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
              <FaQrcode size={120} className="text-gray-400" />
            </div>

            <div className="space-y-3">
              <h3 className="text-xl font-bold">Preview Information</h3>

              <p className="text-gray-600">
                Type :
                <span className="font-semibold ml-2">{settings.qrType}</span>
              </p>

              <p className="text-gray-600">
                URL :
                <span className="font-semibold ml-2 break-all">
                  {settings.domain}
                </span>
              </p>

              <p className="text-gray-600">
                Table Prefix :
                <span className="font-semibold ml-2">
                  {settings.tablePrefix}
                </span>
              </p>
            </div>
          </div>
        </div>

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
              border-gray-300
              hover:bg-gray-100
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
              bg-blue-600
              hover:bg-blue-700
              text-white
              flex
              items-center
              gap-2
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