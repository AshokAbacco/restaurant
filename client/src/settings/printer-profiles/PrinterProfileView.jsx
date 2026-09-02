// ==============================================
// src/settings/printer-profiles/PrinterProfileView.jsx
// ==============================================
// Read-only detail for one printer, plus a Test Print.
//
// The test print deliberately goes through the same printOnce() path the KOT
// and the invoice use, against the same #app-print-root clone — so a slip
// that comes out correctly here proves the real receipts will too. Testing
// through a separate code path would prove nothing.

import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  FiPrinter,
  FiEdit2,
  FiArrowLeft,
  FiAlertCircle,
  FiStar,
  FiMonitor,
  FiCheck,
} from "react-icons/fi";

import PageHeader from "../../components/layout/PageHeader";
import PaperPreview from "./PaperPreview";
import {
  getPrinterProfile,
  makePrinterProfileDefault,
  setSelectedProfile,
} from "../../print/printerConfig";
import { toPrintGeometry, estimateRenderedColumns } from "../../print/printerProfiles";
import { printOnce } from "../../print/printing";

const SpecRow = ({ label, value, hint }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-b border-[#E7EAE1] dark:border-[#262B24] last:border-0">
    <div>
      <p className="text-sm font-medium text-[#4B5563] dark:text-[#9CA8A0]">{label}</p>
      {hint && (
        <p className="mt-0.5 text-xs text-[#9CA3AF] dark:text-[#6B7280]">{hint}</p>
      )}
    </div>
    <p className="font-mono text-sm font-semibold text-[#1F2937] dark:text-[#E4E9E2] text-right whitespace-nowrap">
      {value}
    </p>
  </div>
);

const PrinterProfileView = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const testRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getPrinterProfile(id);
        if (!cancelled) setProfile(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // NOTE: viewing a profile deliberately does NOT change what this device
  // prints on. The Test Print below passes the profile to printOnce as a
  // one-job geometry override instead — an earlier version repointed the
  // device on mount and restored on unmount, which meant a hard refresh
  // while this page was open left the terminal silently switched.

  async function handleMakeDefault() {
    try {
      const updated = await makePrinterProfileDefault(profile.id);
      setProfile(updated);
      setNotice("This is now the outlet default printer.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUseHere() {
    await setSelectedProfile(profile);
    setNotice("This device now prints on this printer.");
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

  if (!profile) {
    return (
      <div className="p-6">
        <div className="rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-[#EF5350] dark:text-red-400 px-5 py-4 flex items-center gap-3">
          <FiAlertCircle className="text-xl shrink-0" />
          {error || "Printer profile not found."}
        </div>
        <Link
          to="/settings/printer-profiles"
          className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
        >
          <FiArrowLeft />
          Back to printers
        </Link>
      </div>
    );
  }

  const g = toPrintGeometry(profile);

  return (
    <div className="p-6">
      <PageHeader
        title={profile.name}
        subtitle={profile.model || "Custom printer profile"}
        icon={<FiPrinter />}
        action={
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate("/settings/printer-profiles")}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 transition"
            >
              <FiArrowLeft />
              Back
            </button>
            <Link
              to={`/settings/printer-profiles/${profile.id}/edit`}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white font-semibold shadow-lg transition-all"
            >
              <FiEdit2 />
              Edit
            </Link>
          </div>
        }
      />

      {notice && (
        <div className="mb-6 rounded-xl bg-[#EAF6EC] dark:bg-[#43B75A]/10 border border-[#3FA34D]/20 dark:border-[#43B75A]/30 text-[#3FA34D] dark:text-[#43B75A] px-5 py-4 flex items-center gap-3">
          <FiCheck className="text-xl shrink-0" />
          {notice}
        </div>
      )}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-[#EF5350] dark:text-red-400 px-5 py-4 flex items-center gap-3">
          <FiAlertCircle className="text-xl shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ================= SPEC ================= */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm p-6">
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <h2 className="text-lg font-bold text-[#1F2937] dark:text-[#E4E9E2]">
              Hardware &amp; paper
            </h2>
            <div className="flex items-center gap-2">
              {profile.isDefault && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-[#EAF6EC] dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A]">
                  <FiStar size={11} />
                  Outlet default
                </span>
              )}
              <span
                className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                  profile.isActive
                    ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                    : "bg-[#F3F5EE] text-[#4B5563] dark:bg-white/5 dark:text-[#9CA8A0]"
                }`}
              >
                {profile.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>

          <SpecRow label="Printer model" value={profile.model || "—"} />
          <SpecRow label="Device / profile" value={profile.deviceLabel || profile.name} />
          <SpecRow label="Roll / paper size" value={`${profile.paperWidthMm} mm`} />
          <SpecRow
            label="Printable width"
            value={`${profile.printableWidthMm} mm`}
            hint="The area the head can actually reach"
          />
          <SpecRow label="Printable dots" value={`${profile.printableDots} dots`} />
          <SpecRow
            label="Columns / characters"
            value={`${profile.columns} chars (Font A)`}
          />
          <SpecRow
            label="Print speed"
            value={profile.speedMmPerSec ? `${profile.speedMmPerSec} mm/s` : "—"}
          />
          <SpecRow
            label="Receipt font size"
            value={`${profile.baseFontPx} px`}
            hint={`Fits roughly ${estimateRenderedColumns(g)} characters per line`}
          />
          <SpecRow
            label="Page margin"
            value={`${g.marginMm} mm`}
            hint="Half the unprintable edge on each side — this is what keeps the receipt centred"
          />
          {profile.notes && (
            <div className="pt-4 mt-2 border-t border-[#E7EAE1] dark:border-[#262B24]">
              <p className="text-sm font-medium text-[#4B5563] dark:text-[#9CA8A0] mb-1">
                Notes
              </p>
              <p className="text-sm text-[#1F2937] dark:text-[#E4E9E2] leading-6">
                {profile.notes}
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            {!profile.isDefault && profile.isActive && (
              <button
                onClick={handleMakeDefault}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 font-semibold transition"
              >
                <FiStar />
                Make outlet default
              </button>
            )}
            {profile.isActive && (
              <button
                onClick={handleUseHere}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 font-semibold transition"
              >
                <FiMonitor />
                Use on this device
              </button>
            )}
          </div>
        </div>

        {/* ================= PREVIEW + TEST ================= */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm p-6">
          <PaperPreview profile={profile} />

          <button
            onClick={() => printOnce(testRef, { profile })}
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white font-semibold shadow-lg transition-all"
          >
            <FiPrinter />
            Test Print
          </button>
          <p className="mt-3 text-xs text-[#6B7280] dark:text-[#9CA8A0] leading-6">
            Prints a calibration slip through the same path the kitchen ticket
            and the bill use. If the ruler line below reaches both edges
            without wrapping, the printable width is right.
          </p>
        </div>
      </div>

      {/* The slip itself. Never shown on screen — printOnce() clones it into
          the print root, and the print stylesheet hides everything else. */}
      <div className="hidden">
        <div
          ref={testRef}
          className="receipt-sheet mx-auto w-full bg-white p-4 font-mono leading-snug text-black"
          style={{ fontSize: `${profile.baseFontPx}px` }}
        >
          <div className="text-center font-bold uppercase" style={{ fontSize: "1.3em" }}>
            Printer Test
          </div>
          <div className="text-center">{profile.name}</div>
          <div className="my-1.5 border-t border-black" />
          <div className="flex justify-between">
            <span>Model:</span>
            <span className="font-bold">{profile.model || "Custom"}</span>
          </div>
          <div className="flex justify-between">
            <span>Paper:</span>
            <span className="font-bold">{profile.paperWidthMm}mm</span>
          </div>
          <div className="flex justify-between">
            <span>Printable:</span>
            <span className="font-bold">{profile.printableWidthMm}mm</span>
          </div>
          <div className="flex justify-between">
            <span>Dots:</span>
            <span className="font-bold">{profile.printableDots}</span>
          </div>
          <div className="flex justify-between">
            <span>Columns:</span>
            <span className="font-bold">{profile.columns}</span>
          </div>
          <div className="my-1.5 border-t border-black" />
          {/* A ruler exactly `columns` characters long. If it wraps, the font
              is too large for this paper; if it stops well short of the right
              edge, there is width going unused. */}
          <div className="whitespace-pre" style={{ overflow: "hidden" }}>
            {Array.from({ length: profile.columns }, (_, i) =>
              (i + 1) % 10 === 0 ? String(((i + 1) / 10) % 10) : "-",
            ).join("")}
          </div>
          <div className="mt-1">{`${profile.columns} columns wide`}</div>
          <div className="my-1.5 border-t border-black" />
          <div className="text-center">Alignment check complete</div>
        </div>
      </div>
    </div>
  );
};

export default PrinterProfileView;