// ==============================================
// src/settings/printer-profiles/PrinterProfileForm.jsx
// ==============================================
// Add / edit one printer. Serves both routes — `id` present means edit.
//
// Picking a model from the catalogue fills the spec in, but every field stays
// editable afterwards: the same model ships with different firmware margins
// in practice, and a restaurant that has measured its own roll should be able
// to say so. The preview re-renders on every keystroke, so the effect of a
// change is visible before it's saved.

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FiPrinter, FiSave, FiArrowLeft, FiAlertCircle } from "react-icons/fi";

import PageHeader from "../../components/layout/PageHeader";
import PaperPreview from "./PaperPreview";
import {
  createPrinterProfile,
  getPrinterProfile,
  updatePrinterProfile,
  refreshActiveProfile,
} from "../../print/printerConfig";
import { PRINTER_CATALOGUE, findCatalogueModel } from "../../print/printerProfiles";

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
  deviceLabel: "",
  notes: "",
  isDefault: false,
};

const inputClass =
  "w-full px-4 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#12160F] text-[#1F2937] dark:text-[#E4E9E2] placeholder-[#9CA3AF] dark:placeholder-[#6B7280] dark:[color-scheme:dark] focus:border-[#3FA34D] dark:focus:border-[#43B75A] outline-none transition-all";

const labelClass =
  "block mb-2 text-sm font-medium text-[#4B5563] dark:text-[#9CA8A0]";

const Field = ({ label, hint, children }) => (
  <div>
    <label className={labelClass}>{label}</label>
    {children}
    {hint && (
      <p className="mt-1.5 text-xs text-[#9CA3AF] dark:text-[#6B7280] leading-5">
        {hint}
      </p>
    )}
  </div>
);

const PrinterProfileForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(EMPTY);
  const [catalogueId, setCatalogueId] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await getPrinterProfile(id);
        if (cancelled) return;
        setForm({
          name: p.name || "",
          model: p.model || "",
          paperWidthMm: p.paperWidthMm,
          printableWidthMm: p.printableWidthMm,
          printableDots: p.printableDots,
          columns: p.columns,
          speedMmPerSec: p.speedMmPerSec ?? "",
          baseFontPx: p.baseFontPx,
          extraMarginMm: p.extraMarginMm ?? 0,
          deviceLabel: p.deviceLabel || "",
          notes: p.notes || "",
          isDefault: p.isDefault,
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handlePickModel(e) {
    const value = e.target.value;
    setCatalogueId(value);
    const preset = findCatalogueModel(value);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      // Don't stomp a name the user has already typed.
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

  // What the preview draws. Kept separate from `form` so half-typed numbers
  // ("" while the user clears a field) don't blow up the geometry maths.
  const previewProfile = useMemo(
    () => ({
      name: form.name,
      model: form.model,
      paperWidthMm: Number(form.paperWidthMm) || 80,
      printableWidthMm: Number(form.printableWidthMm) || 72,
      printableDots: Number(form.printableDots) || 576,
      columns: Number(form.columns) || 48,
      baseFontPx: Number(form.baseFontPx) || 10,
      extraMarginMm: Number(form.extraMarginMm) || 0,
    }),
    [form],
  );

  const widthError =
    Number(form.printableWidthMm) > Number(form.paperWidthMm)
      ? `Printable width can't be wider than the ${form.paperWidthMm}mm roll.`
      : "";

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Give this profile a name so staff can pick it.");
      return;
    }
    if (widthError) {
      setError(widthError);
      return;
    }

    const payload = {
      name: form.name.trim(),
      model: form.model.trim() || null,
      paperWidthMm: Number(form.paperWidthMm),
      printableWidthMm: Number(form.printableWidthMm),
      printableDots: Number(form.printableDots),
      columns: Number(form.columns),
      speedMmPerSec: form.speedMmPerSec === "" ? null : Number(form.speedMmPerSec),
      baseFontPx: Number(form.baseFontPx),
      extraMarginMm: Number(form.extraMarginMm) || 0,
      deviceLabel: form.deviceLabel.trim() || null,
      notes: form.notes.trim() || null,
      isDefault: form.isDefault,
    };
    // The server rejects clearing the default rather than un-setting it, so
    // don't send `false` for a profile that is already the default.
    if (isEdit && !form.isDefault) delete payload.isDefault;

    setSaving(true);
    try {
      const saved = isEdit
        ? await updatePrinterProfile(id, payload)
        : await createPrinterProfile(payload);
      // Geometry may have changed under a device already using this profile.
      await refreshActiveProfile();
      navigate(`/settings/printer-profiles/${saved.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-14 text-center text-[#6B7280] dark:text-[#9CA8A0]">
          Loading printer profile…
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PageHeader
        title={isEdit ? "Edit Printer" : "Add Printer"}
        subtitle="Tell the app what paper this printer actually uses. Kitchen tickets and bills are laid out against these numbers."
        icon={<FiPrinter />}
        action={
          <Link
            to="/settings/printer-profiles"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 transition"
          >
            <FiArrowLeft />
            Back
          </Link>
        }
      />

      {error && (
        <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-[#EF5350] dark:text-red-400 px-5 py-4 flex items-center gap-3">
          <FiAlertCircle className="text-xl shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ================= LEFT: FORM ================= */}

        <div className="space-y-6">
          <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-5">
              Printer hardware model
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                label="Start from a known model"
                hint="Fills the spec below. Every value stays editable."
              >
                <select value={catalogueId} onChange={handlePickModel} className={inputClass}>
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
              </Field>

              <Field label="Profile name *" hint="What staff see when picking a printer.">
                <input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Front counter — Posiflow 80mm"
                  className={inputClass}
                />
              </Field>

              <Field label="Printer model">
                <input
                  value={form.model}
                  onChange={(e) => set("model", e.target.value)}
                  placeholder="e.g. Posiflow KP307-UEWB"
                  className={inputClass}
                />
              </Field>

              <Field label="Device / profile label" hint="Which terminal this sits on.">
                <input
                  value={form.deviceLabel}
                  onChange={(e) => set("deviceLabel", e.target.value)}
                  placeholder="e.g. Billing counter PC"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#1F2937] dark:text-[#E4E9E2] mb-1">
              Paper &amp; printable area
            </h2>
            <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0] mb-5 leading-6">
              The gap between the roll width and the printable width is the
              edge the print head can't reach. It's split evenly as the page
              margin, which is what keeps receipts centred instead of drifting
              against one side.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label="Roll / paper size (mm)">
                <select
                  value={form.paperWidthMm}
                  onChange={(e) => set("paperWidthMm", Number(e.target.value))}
                  className={inputClass}
                >
                  <option value={80}>80 mm</option>
                  <option value={70}>70 mm</option>
                  <option value={58}>58 mm</option>
                </select>
              </Field>

              <Field label="Printable width (mm)">
                <input
                  type="number"
                  min="30"
                  max="120"
                  value={form.printableWidthMm}
                  onChange={(e) => set("printableWidthMm", e.target.value)}
                  className={`${inputClass} ${
                    widthError ? "border-[#EF5350] dark:border-red-400" : ""
                  }`}
                />
                {widthError && (
                  <p className="mt-1.5 text-xs font-medium text-[#EF5350] dark:text-red-400">
                    {widthError}
                  </p>
                )}
              </Field>

              <Field label="Printable dots" hint="576 on a 72mm 203dpi head.">
                <input
                  type="number"
                  min="128"
                  max="1728"
                  value={form.printableDots}
                  onChange={(e) => set("printableDots", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Columns / characters"
                hint="Font A capacity. Under 40, the bill's two-up detail block stacks instead of splitting."
              >
                <input
                  type="number"
                  min="16"
                  max="96"
                  value={form.columns}
                  onChange={(e) => set("columns", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Print speed (mm/s)" hint="Informational — from the datasheet.">
                <input
                  type="number"
                  min="10"
                  max="1000"
                  value={form.speedMmPerSec}
                  onChange={(e) => set("speedMmPerSec", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Receipt font size (px)"
                hint="Raise it if the paper is hard to read, lower it if lines wrap in the preview."
              >
                <input
                  type="number"
                  min="6"
                  max="20"
                  step="0.5"
                  value={form.baseFontPx}
                  onChange={(e) => set("baseFontPx", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field
                label="Extra margin (mm)"
                hint="Only if your driver clips the edges on top of the unprintable area."
              >
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={form.extraMarginMm}
                  onChange={(e) => set("extraMarginMm", e.target.value)}
                  className={inputClass}
                />
              </Field>

              <Field label="Notes">
                <input
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Anything worth remembering"
                  className={inputClass}
                />
              </Field>
            </div>

            <label className="mt-5 flex items-center justify-between gap-4 border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-4 cursor-pointer">
              <div>
                <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  Make this the outlet default
                </p>
                <p className="mt-0.5 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                  Devices that haven't picked their own printer will use it.
                </p>
              </div>
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) => set("isDefault", e.target.checked)}
                className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
              />
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              to="/settings/printer-profiles"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 font-semibold transition"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving || Boolean(widthError)}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FiSave />
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Printer"}
            </button>
          </div>
        </div>

        {/* ================= RIGHT: LIVE PREVIEW ================= */}

        <div>
          <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm p-6 xl:sticky xl:top-6">
            <PaperPreview profile={previewProfile} />
          </div>
        </div>
      </form>
    </div>
  );
};

export default PrinterProfileForm;