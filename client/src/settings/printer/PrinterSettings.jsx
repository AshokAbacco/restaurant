// ==============================================
// src/settings/printer/PrinterSettings.jsx
// ==============================================
// One compact page instead of seven stacked panels.
//
//   1. Add / Edit Printer — hardware model + paper size, and nothing else
//      competing for attention. Picking a model fills the spec.
//   2. Print Settings — every toggle in one scannable list, not six cards.
//   3. All Connected Printers — the saved list, with Edit / Delete.
//
// Edit loads a row straight back into section 1, so there's one form on the
// page and no separate add/edit screens to keep in sync.
//
// The settings and the paper spec both save onto the SAME PrinterProfile row,
// because they genuinely differ per device: a kitchen printer auto-prints
// KOTs and shows no prices, a counter printer auto-prints receipts and kicks
// a cash drawer. A single global block of print preferences can't express
// that.

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FiPrinter,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiSave,
  FiX,
  FiCheck,
  FiAlertCircle,
  FiStar,
  FiMonitor,
  FiCoffee,
  FiFileText,
} from "react-icons/fi";

import PageHeader from "../../components/layout/PageHeader";
import PaperPreview from "../printer-profiles/PaperPreview";
import {
  PRINTER_PURPOSES,
  listPrinterProfiles,
  createPrinterProfile,
  updatePrinterProfile,
  makePrinterProfileDefault,
  deactivatePrinterProfile,
  getSelectedProfileId,
  setSelectedProfile,
  refreshActiveProfile,
} from "../../print/printerConfig";
import { PRINTER_CATALOGUE, findCatalogueModel } from "../../print/printerProfiles";
import { printOnce } from "../../print/printing";
import { getKitchenBranches } from "../../pos/api/posApi";

// Paper size presets. The bracketed figure is the printable width — the part
// the head can actually reach — which is what the layout is built against.
const PAPER_SIZES = [
  { label: "80mm (72mm)", paperWidthMm: 80, printableWidthMm: 72, printableDots: 576, columns: 48, baseFontPx: 10 },
  { label: "70mm (64mm)", paperWidthMm: 70, printableWidthMm: 64, printableDots: 512, columns: 42, baseFontPx: 10 },
  { label: "58mm (48mm)", paperWidthMm: 58, printableWidthMm: 48, printableDots: 384, columns: 32, baseFontPx: 9 },
];

const CONNECTIONS = ["SYSTEM", "NETWORK", "USB", "BLUETOOTH"];

// Grouped so the list reads as three short runs rather than twelve loose
// rows. Order matters more than grouping here — the ones staff change most
// are first.
const SETTINGS_GROUPS = [
  {
    group: "Automatic printing",
    items: [
      ["autoPrintKot", "Auto print kitchen ticket", "Send the KOT to this printer as soon as an order is placed."],
      ["autoPrintReceipt", "Auto print receipt", "Print the receipt immediately after payment."],
      ["autoPrintInvoice", "Auto print invoice", "Print the invoice when an order is completed."],
      ["allowReprint", "Allow reprint on demand", "Let staff reprint a previous bill from Bill History."],
    ],
  },
  {
    group: "Receipt content",
    items: [
      ["printLogo", "Print restaurant logo", "Include the outlet logo at the top of the receipt."],
      ["printGstDetails", "Print GST details", "Show GSTIN and the tax breakdown."],
      ["printQrCode", "Print QR code", "Include the UPI / feedback QR on the receipt."],
      ["printBarcode", "Print barcode", "Include the invoice barcode for tracking."],
    ],
  },
  {
    group: "Kitchen ticket",
    items: [
      ["printItemNotes", "Print item notes", 'Include customer notes such as "less spicy".'],
      ["printTableNumber", "Print table number", "Show the table on the kitchen ticket."],
      ["printOrderTime", "Print order time", "Show when the order was placed."],
      ["openCashDrawer", "Open cash drawer after payment", "Trigger the drawer on a cash payment."],
    ],
  },
];

const EMPTY = {
  name: "",
  model: "",
  paperWidthMm: 80,
  printableWidthMm: 72,
  printableDots: 576,
  columns: 48,
  speedMmPerSec: 300,
  baseFontPx: 10,
  extraMarginMm: 0,
  purpose: "BOTH",
  kitchenBranchId: "",
  connectionType: "SYSTEM",
  ipAddress: "",
  copies: 1,
  deviceLabel: "",
  isDefault: false,
  autoPrintKot: true,
  autoPrintReceipt: true,
  autoPrintInvoice: false,
  allowReprint: true,
  printLogo: true,
  printGstDetails: true,
  printQrCode: true,
  printBarcode: false,
  printItemNotes: true,
  printTableNumber: true,
  printOrderTime: true,
  openCashDrawer: false,
};

const inputClass =
  "w-full px-3 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-sm text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none transition-colors";

const labelClass =
  "block mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#9CA8A0]";

const PURPOSE_BADGE = {
  KOT: {
    label: "Kitchen (KOT)",
    className:
      "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  },
  INVOICE: {
    label: "Invoice",
    className: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300",
  },
  BOTH: {
    label: "Both",
    className:
      "bg-[#F3F5EE] text-[#4B5563] dark:bg-white/5 dark:text-[#9CA8A0]",
  },
};

const Card = ({ title, right, children }) => (
  <section className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm">
    <header className="flex items-center justify-between gap-3 flex-wrap px-5 py-3.5 border-b border-[#E7EAE1] dark:border-[#262B24]">
      <h2 className="text-sm font-bold uppercase tracking-wide text-[#1F2937] dark:text-[#E4E9E2]">
        {title}
      </h2>
      {right}
    </header>
    <div className="p-5">{children}</div>
  </section>
);

const PrinterSettings = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [deviceProfileId, setDeviceProfileId] = useState(getSelectedProfileId());
  // Physical kitchens ("Ground Floor Kitchen", "Rooftop Kitchen") — a KOT
  // printer is bound to one so an order's ticket prints in the room that has
  // to cook it. Failing to load these must not block adding a printer, so the
  // error is swallowed and the picker just falls back to "Any kitchen".
  const [kitchens, setKitchens] = useState([]);
  const formRef = useRef(null);
  const testRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProfiles(await listPrinterProfiles());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    getKitchenBranches()
      .then((data) => setKitchens(Array.isArray(data) ? data : []))
      .catch(() => setKitchens([]));
  }, []);

  const set = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  // An invoice printer has no kitchen. Clearing the binding on switch stops a
  // stale kitchenBranchId riding along on the save and making a cashier
  // printer look like it lives in the Rooftop kitchen.
  function setPurpose(purpose) {
    setForm((f) => ({
      ...f,
      purpose,
      kitchenBranchId: purpose === "INVOICE" ? "" : f.kitchenBranchId,
    }));
  }

  function applyModel(id) {
    const preset = findCatalogueModel(id);
    if (!preset) return set("model", "");
    setForm((f) => ({
      ...f,
      name: f.name.trim() || preset.label,
      model: preset.model,
      paperWidthMm: preset.paperWidthMm,
      printableWidthMm: preset.printableWidthMm,
      printableDots: preset.printableDots,
      columns: preset.columns,
      speedMmPerSec: preset.speedMmPerSec,
      baseFontPx: preset.baseFontPx,
    }));
  }

  function applyPaperSize(size) {
    setForm((f) => ({ ...f, ...size, label: undefined }));
  }

  function startEdit(profile) {
    // Only the keys the form owns — spreading the row would drag in id,
    // outletId and timestamps and post them straight back.
    const next = { ...EMPTY };
    for (const key of Object.keys(EMPTY)) {
      if (profile[key] !== null && profile[key] !== undefined) next[key] = profile[key];
    }
    setForm(next);
    setEditingId(profile.id);
    setError("");
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function cancelEdit() {
    setForm(EMPTY);
    setEditingId(null);
    setError("");
  }

  const widthError =
    Number(form.printableWidthMm) > Number(form.paperWidthMm)
      ? `Printable width can't exceed the ${form.paperWidthMm}mm roll.`
      : "";

  async function handleSave() {
    setError("");
    if (!form.name.trim()) return setError("Give this printer a name.");
    if (widthError) return setError(widthError);

    const payload = { ...form };
    payload.name = form.name.trim();
    payload.model = form.model.trim() || null;
    payload.deviceLabel = form.deviceLabel.trim() || null;
    payload.ipAddress = form.ipAddress.trim() || null;
    // "" from the select means "any kitchen" — send null, not an empty string,
    // or Prisma tries to match a branch whose id is "".
    payload.kitchenBranchId = form.kitchenBranchId || null;
    // The server rejects clearing a default rather than un-setting it.
    if (editingId && !form.isDefault) delete payload.isDefault;

    setSaving(true);
    try {
      const saved = editingId
        ? await updatePrinterProfile(editingId, payload)
        : await createPrinterProfile(payload);
      setNotice(`"${saved.name}" saved.`);
      cancelEdit();
      await load();
      await refreshActiveProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(profile) {
    setError("");
    try {
      await deactivatePrinterProfile(profile.id);
      if (deviceProfileId === profile.id) {
        await setSelectedProfile(null);
        setDeviceProfileId(null);
      }
      if (editingId === profile.id) cancelEdit();
      setNotice(`"${profile.name}" removed.`);
      await load();
      await refreshActiveProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setConfirmId(null);
    }
  }

  async function handleUseHere(profile) {
    await setSelectedProfile(profile);
    setDeviceProfileId(profile.id);
    setNotice(`This device now prints on "${profile.name}".`);
  }

  async function handleMakeDefault(profile) {
    try {
      await makePrinterProfileDefault(profile.id);
      await load();
      await refreshActiveProfile();
      setNotice(`"${profile.name}" is now the outlet default.`);
    } catch (err) {
      setError(err.message);
    }
  }

  // The failure mode this feature exists to prevent is silent: a kitchen with
  // no printer of its own doesn't error, it just quietly prints somewhere
  // else. Both gaps are surfaced here rather than discovered mid-service.
  const coverage = useMemo(() => {
    const live = profiles.filter((p) => p.isActive);
    const takesKot = live.filter((p) => p.purpose === "KOT" || p.purpose === "BOTH");
    const takesInvoice = live.filter(
      (p) => p.purpose === "INVOICE" || p.purpose === "BOTH",
    );
    const boundKitchenIds = new Set(
      takesKot.map((p) => p.kitchenBranchId).filter(Boolean),
    );
    // An unbound KOT printer covers every kitchen, so nothing is uncovered.
    const hasCatchAllKot = takesKot.some((p) => !p.kitchenBranchId);

    return {
      hasKot: takesKot.length > 0,
      hasInvoice: takesInvoice.length > 0,
      uncoveredKitchens: hasCatchAllKot
        ? []
        : kitchens.filter((k) => !boundKitchenIds.has(k.id)),
    };
  }, [profiles, kitchens]);

  const activePaper = useMemo(
    () =>
      PAPER_SIZES.find(
        (s) =>
          s.paperWidthMm === Number(form.paperWidthMm) &&
          s.printableWidthMm === Number(form.printableWidthMm),
      ),
    [form.paperWidthMm, form.printableWidthMm],
  );

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Printer Settings"
        subtitle="Pick the printer model and paper size, then choose what each printer prints. Kitchen tickets and bills lay themselves out against these numbers."
        icon={<FiPrinter />}
        showRefresh
        onRefresh={load}
        loading={loading}
      />

      {notice && (
        <div className="rounded-xl bg-[#EAF6EC] dark:bg-[#43B75A]/10 border border-[#3FA34D]/20 dark:border-[#43B75A]/30 text-[#3FA34D] dark:text-[#43B75A] px-4 py-3 flex items-center gap-3 text-sm">
          <FiCheck className="shrink-0" />
          {notice}
        </div>
      )}
      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-[#EF5350] dark:text-red-400 px-4 py-3 flex items-center gap-3 text-sm">
          <FiAlertCircle className="shrink-0" />
          {error}
        </div>
      )}

      {/* ============ 1. ADD / EDIT PRINTER ============ */}

      <div ref={formRef}>
        <Card
          title={editingId ? "Edit Printer" : "Add Printer"}
          right={
            editingId && (
              <button
                onClick={cancelEdit}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0] hover:text-[#1F2937] dark:hover:text-white"
              >
                <FiX size={14} />
                Cancel edit
              </button>
            )
          }
        >
          {/* Purpose comes first because it decides what the rest of the form
              even means: an invoice printer has no kitchen, and a kitchen
              printer must never be offered as an invoice target. */}
          <div className="mb-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>What does this printer print?</label>
              <div className="flex flex-wrap gap-2">
                {PRINTER_PURPOSES.map((p) => {
                  const active = form.purpose === p.key;
                  const Icon =
                    p.key === "KOT" ? FiCoffee : p.key === "INVOICE" ? FiFileText : FiPrinter;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => setPurpose(p.key)}
                      title={p.hint}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        active
                          ? "border-[#3FA34D] dark:border-[#43B75A] bg-[#EAF6EC] dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A]"
                          : "border-[#E7EAE1] dark:border-[#262B24] text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
                      }`}
                    >
                      <Icon size={14} />
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                {PRINTER_PURPOSES.find((p) => p.key === form.purpose)?.hint}
              </p>
            </div>

            {/* Only meaningful for a printer that receives kitchen tickets. */}
            {form.purpose !== "INVOICE" && (
              <div>
                <label className={labelClass}>Which kitchen is it in?</label>
                <select
                  value={form.kitchenBranchId}
                  onChange={(e) => set("kitchenBranchId", e.target.value)}
                  className={inputClass}
                >
                  <option value="">Any kitchen (no specific branch)</option>
                  {kitchens.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                      {k.floor?.name ? ` · ${k.floor.name}` : ""}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                  {kitchens.length === 0
                    ? "No kitchens set up yet — add them under Settings → Branches."
                    : form.kitchenBranchId
                      ? "Orders sent to this kitchen print here."
                      : "Used for any kitchen without a printer of its own."}
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div>
              <label className={labelClass}>Printer Hardware Model</label>
              <select
                value={
                  PRINTER_CATALOGUE.flatMap((g) => g.models).find(
                    (m) => m.model === form.model,
                  )?.id || ""
                }
                onChange={(e) => applyModel(e.target.value)}
                className={inputClass}
              >
                <option value="">Custom / not listed</option>
                {PRINTER_CATALOGUE.map((group) => (
                  <optgroup key={group.group} label={group.group}>
                    {group.models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Printable Width Override &amp; Paper Size</label>
              <div className="flex flex-wrap gap-2">
                {PAPER_SIZES.map((size) => {
                  const active = activePaper?.label === size.label;
                  return (
                    <button
                      key={size.label}
                      type="button"
                      onClick={() => applyPaperSize(size)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                        active
                          ? "border-[#3FA34D] dark:border-[#43B75A] bg-[#EAF6EC] dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A]"
                          : "border-[#E7EAE1] dark:border-[#262B24] text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
                      }`}
                    >
                      {size.label}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 font-mono text-xs text-[#3FA34D] dark:text-[#43B75A]">
                {form.printableWidthMm}mm ({form.printableDots} Dots) · Columns:{" "}
                {form.columns} Chars (Font A)
                {form.speedMmPerSec ? ` · Speed: ${form.speedMmPerSec}mm/s` : ""}
              </p>
              {widthError && (
                <p className="mt-1.5 text-xs font-medium text-[#EF5350] dark:text-red-400">
                  {widthError}
                </p>
              )}
            </div>

            <div>
              <label className={labelClass}>Printer Name *</label>
              <input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Front Counter Printer"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Connection</label>
                <select
                  value={form.connectionType}
                  onChange={(e) => set("connectionType", e.target.value)}
                  className={inputClass}
                >
                  {CONNECTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c.charAt(0) + c.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  {form.connectionType === "NETWORK" ? "IP Address" : "Device Label"}
                </label>
                {form.connectionType === "NETWORK" ? (
                  <input
                    value={form.ipAddress}
                    onChange={(e) => set("ipAddress", e.target.value)}
                    placeholder="192.168.1.50"
                    className={inputClass}
                  />
                ) : (
                  <input
                    value={form.deviceLabel}
                    onChange={(e) => set("deviceLabel", e.target.value)}
                    placeholder="Billing counter PC"
                    className={inputClass}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E7EAE1] dark:border-[#262B24]">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-[#4B5563] dark:text-[#9CA8A0] cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => set("isDefault", e.target.checked)}
                  className="w-4 h-4 accent-[#3FA34D] dark:accent-[#43B75A]"
                />
                Set as outlet default
              </label>
              <label className="flex items-center gap-2 text-sm text-[#4B5563] dark:text-[#9CA8A0]">
                Copies
                <select
                  value={form.copies}
                  onChange={(e) => set("copies", Number(e.target.value))}
                  className="px-2 py-1.5 rounded-lg border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-sm dark:[color-scheme:dark] outline-none"
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => printOnce(testRef, { profile: form })}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-sm font-semibold text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
              >
                <FiPrinter size={14} />
                Test Print
              </button>
              <button
                onClick={handleSave}
                disabled={saving || Boolean(widthError)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingId ? <FiSave size={14} /> : <FiPlus size={14} />}
                {saving ? "Saving…" : editingId ? "Save Changes" : "Add Printer"}
              </button>
            </div>
          </div>
        </Card>
      </div>

      {/* ============ 2. PRINT SETTINGS (LIST) ============ */}

      <Card
        title="Print Settings"
        right={
          <span className="text-xs text-[#6B7280] dark:text-[#9CA8A0]">
            Applies to {editingId ? `"${form.name || "this printer"}"` : "the printer being added"}
          </span>
        }
      >
        <div className="divide-y divide-[#E7EAE1] dark:divide-[#262B24] -my-2">
          {SETTINGS_GROUPS.map((group) => (
            <div key={group.group} className="py-2">
              <p className="px-1 py-2 text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280]">
                {group.group}
              </p>
              {group.items.map(([key, label, hint]) => (
                <label
                  key={key}
                  className="flex items-center justify-between gap-4 px-1 py-2 rounded-lg hover:bg-[#F3F5EE] dark:hover:bg-white/5 cursor-pointer"
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                      {label}
                    </span>
                    <span className="block text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                      {hint}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={Boolean(form[key])}
                    onChange={(e) => set(key, e.target.checked)}
                    className="w-4 h-4 shrink-0 accent-[#3FA34D] dark:accent-[#43B75A]"
                  />
                </label>
              ))}
            </div>
          ))}
        </div>
        <p className="mt-4 pt-4 border-t border-[#E7EAE1] dark:border-[#262B24] text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          These save with the printer above — use <strong>Add Printer</strong> or{" "}
          <strong>Save Changes</strong> to apply them.
        </p>
      </Card>

      {/* ============ 3. ALL CONNECTED PRINTERS ============ */}

      {!loading && (coverage.uncoveredKitchens.length > 0 || !coverage.hasKot || !coverage.hasInvoice) && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <p className="flex items-center gap-2 font-semibold">
            <FiAlertCircle className="shrink-0" />
            Printer routing is incomplete
          </p>
          <ul className="mt-2 space-y-1 text-xs list-disc pl-8">
            {!coverage.hasKot && (
              <li>
                No printer accepts kitchen tickets — add one set to
                <strong> Kitchen (KOT)</strong> or <strong>Both</strong>.
              </li>
            )}
            {!coverage.hasInvoice && (
              <li>
                No printer accepts invoices — add one set to
                <strong> Invoice</strong> or <strong>Both</strong>.
              </li>
            )}
            {coverage.uncoveredKitchens.length > 0 && (
              <li>
                No printer assigned to{" "}
                <strong>
                  {coverage.uncoveredKitchens.map((k) => k.name).join(", ")}
                </strong>
                . Tickets for {coverage.uncoveredKitchens.length === 1 ? "it" : "them"}{" "}
                fall back to another printer.
              </li>
            )}
          </ul>
        </div>
      )}

      <Card
        title="All Connected Printers"
        right={
          <span className="text-xs text-[#6B7280] dark:text-[#9CA8A0]">
            {profiles.length} configured
          </span>
        }
      >
        <div className="overflow-x-auto -m-5">
          <table className="w-full text-left">
            <thead className="bg-[#F3F5EE] dark:bg-[#1D231C] border-b border-[#E7EAE1] dark:border-[#262B24]">
              <tr>
                {["Printer", "Prints", "Kitchen", "Paper", "Connection", "Status", ""].map((h, i) => (
                  <th
                    key={h || i}
                    className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#9CA8A0] ${
                      i === 6 ? "text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                    Loading printers…
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                    No printers added yet — receipts print on standard 80mm
                    geometry until you add one.
                  </td>
                </tr>
              ) : (
                profiles.map((p) => (
                  <tr
                    key={p.id}
                    className={`hover:bg-[#F3F5EE] dark:hover:bg-white/5 transition-colors ${
                      p.isActive ? "" : "opacity-50"
                    }`}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                          {p.name}
                        </span>
                        {p.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#EAF6EC] dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A]">
                            <FiStar size={9} />
                            Default
                          </span>
                        )}
                        {p.id === deviceProfileId && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300">
                            <FiMonitor size={9} />
                            This device
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          (PURPOSE_BADGE[p.purpose] || PURPOSE_BADGE.BOTH).className
                        }`}
                      >
                        {(PURPOSE_BADGE[p.purpose] || PURPOSE_BADGE.BOTH).label}
                      </span>
                      <span className="block mt-1 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                        {p.model || "Custom"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                      {p.purpose === "INVOICE"
                        ? "—"
                        : p.kitchenBranch?.name ||
                          kitchens.find((k) => k.id === p.kitchenBranchId)?.name || (
                            <span className="text-[#9CA3AF] dark:text-[#6B7280]">
                              Any kitchen
                            </span>
                          )}
                    </td>
                    <td className="px-5 py-3 font-mono text-sm text-[#1F2937] dark:text-[#E4E9E2] whitespace-nowrap">
                      {p.paperWidthMm}mm ({p.printableWidthMm}mm)
                      <span className="block text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                        {p.columns} col
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                      {(p.connectionType || "SYSTEM").charAt(0) +
                        (p.connectionType || "SYSTEM").slice(1).toLowerCase()}
                      {p.ipAddress && (
                        <span className="block font-mono text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                          {p.ipAddress}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                          p.isActive
                            ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                            : "bg-[#F3F5EE] text-[#4B5563] dark:bg-white/5 dark:text-[#9CA8A0]"
                        }`}
                      >
                        {p.isActive ? "Connected" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {confirmId === p.id ? (
                        <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                          <span className="text-xs text-[#EF5350] dark:text-red-400 font-medium">
                            Remove?
                          </span>
                          <button
                            onClick={() => setConfirmId(null)}
                            className="text-xs font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:text-[#1F2937] dark:hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="text-xs font-semibold text-[#EF5350] dark:text-red-400 hover:text-red-700"
                          >
                            Confirm
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          {p.isActive && p.id !== deviceProfileId && (
                            <button
                              onClick={() => handleUseHere(p)}
                              title="Use this printer on this device"
                              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#3FA34D] dark:text-[#43B75A] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10"
                            >
                              Use here
                            </button>
                          )}
                          {p.isActive && !p.isDefault && (
                            <button
                              onClick={() => handleMakeDefault(p)}
                              title="Make outlet default"
                              className="p-2 rounded-lg text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 hover:text-[#3FA34D] dark:hover:text-[#43B75A]"
                            >
                              <FiStar size={15} />
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(p)}
                            title="Edit"
                            className="p-2 rounded-lg text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 hover:text-[#3FA34D] dark:hover:text-[#43B75A]"
                          >
                            <FiEdit2 size={15} />
                          </button>
                          {/* No Delete on the default — the server refuses it,
                              so the button could only ever produce an error. */}
                          {p.isActive && !p.isDefault && (
                            <button
                              onClick={() => setConfirmId(p.id)}
                              title="Delete"
                              className="p-2 rounded-lg text-[#9CA3AF] dark:text-[#6B7280] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-[#EF5350] dark:hover:text-red-400"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Collapsed by default — the preview is reassurance, not a step. */}
      <details className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm">
        <summary className="px-5 py-3.5 cursor-pointer text-sm font-bold uppercase tracking-wide text-[#1F2937] dark:text-[#E4E9E2]">
          Paper preview
        </summary>
        <div className="px-5 pb-5">
          <PaperPreview profile={form} compact />
        </div>
      </details>

      {/* Test slip. Never shown on screen — printOnce() clones it into the
          print root and the print stylesheet hides everything else. */}
      <div className="hidden">
        <div
          ref={testRef}
          className="receipt-sheet mx-auto w-full bg-white p-4 font-mono leading-snug text-black"
          style={{ fontSize: `${form.baseFontPx}px` }}
        >
          <div className="text-center font-bold uppercase" style={{ fontSize: "1.3em" }}>
            Printer Test
          </div>
          <div className="text-center">{form.name || "Unsaved printer"}</div>
          <div className="my-1.5 border-t border-black" />
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="font-bold">{form.model || "Custom"}</span>
          </div>
          <div className="flex justify-between">
            <span>Paper:</span>
            <span className="font-bold">{form.paperWidthMm}mm</span>
          </div>
          <div className="flex justify-between">
            <span>Printable:</span>
            <span className="font-bold">{form.printableWidthMm}mm</span>
          </div>
          <div className="flex justify-between">
            <span>Columns:</span>
            <span className="font-bold">{form.columns}</span>
          </div>
          <div className="my-1.5 border-t border-black" />
          {/* A ruler exactly `columns` characters wide. If it wraps the font
              is too large for this paper; if it stops short there's width
              going unused. */}
          <div className="whitespace-pre" style={{ overflow: "hidden" }}>
            {Array.from({ length: Number(form.columns) || 48 }, (_, i) =>
              (i + 1) % 10 === 0 ? String(((i + 1) / 10) % 10) : "-",
            ).join("")}
          </div>
          <div className="mt-1">{`${form.columns} columns wide`}</div>
          <div className="my-1.5 border-t border-black" />
          <div className="text-center">Alignment check complete</div>
        </div>
      </div>
    </div>
  );
};

export default PrinterSettings;