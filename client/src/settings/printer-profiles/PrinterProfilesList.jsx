// ==============================================
// src/settings/printer-profiles/PrinterProfilesList.jsx
// ==============================================
// Main page. Every printer the outlet owns, plus which one THIS device
// prints against.
//
// Two different things live side by side here on purpose:
//   • the profile list is outlet-wide (server) — Owner/Admin manage it
//   • "Use on this device" is per-browser (localStorage), because a floor
//     tablet on a 58mm handheld and the billing PC on an 80mm counter
//     printer are the same login on different hardware.
// Same split as Billing Counters (counterContext.js).

import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FiPrinter,
  FiPlus,
  FiEye,
  FiEdit2,
  FiTrash2,
  FiAlertCircle,
  FiCheck,
  FiStar,
  FiMonitor,
} from "react-icons/fi";

import PageHeader from "../../components/layout/PageHeader";
import {
  listPrinterProfiles,
  makePrinterProfileDefault,
  deactivatePrinterProfile,
  getSelectedProfileId,
  setSelectedProfile,
  refreshActiveProfile,
} from "../../print/printerConfig";
import { describeProfile } from "../../print/printerProfiles";

const PrinterProfilesList = () => {
  const navigate = useNavigate();

  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [deviceProfileId, setDeviceProfileId] = useState(getSelectedProfileId());

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
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

  async function handleMakeDefault(profile) {
    setBusyId(profile.id);
    setError("");
    try {
      await makePrinterProfileDefault(profile.id);
      setNotice(`"${profile.name}" is now the outlet default.`);
      await load();
      // Devices following the default (rather than a pick of their own) need
      // their print styles rebuilt right away.
      await refreshActiveProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleUseOnThisDevice(profile) {
    setBusyId(profile.id);
    try {
      await setSelectedProfile(profile);
      setDeviceProfileId(profile.id);
      setNotice(`This device now prints on "${profile.name}".`);
    } finally {
      setBusyId(null);
    }
  }

  async function handleFollowDefault() {
    await setSelectedProfile(null);
    setDeviceProfileId(null);
    await refreshActiveProfile();
    setNotice("This device now follows the outlet default.");
  }

  async function handleRemove(profile) {
    setBusyId(profile.id);
    setError("");
    try {
      await deactivatePrinterProfile(profile.id);
      // A device pointed at the profile just retired has to stop using it.
      if (deviceProfileId === profile.id) {
        await setSelectedProfile(null);
        setDeviceProfileId(null);
      }
      setNotice(`"${profile.name}" was deactivated.`);
      await load();
      await refreshActiveProfile();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
      setConfirmRemoveId(null);
    }
  }

  const activeOnDevice =
    profiles.find((p) => p.id === deviceProfileId) ||
    profiles.find((p) => p.isDefault) ||
    null;

  return (
    <div className="p-6">
      <PageHeader
        title="Printer Profiles"
        subtitle="Paper size and printable width for each thermal printer this outlet uses. Kitchen tickets and invoices lay themselves out against the profile selected on each device."
        icon={<FiPrinter />}
        showRefresh
        onRefresh={load}
        loading={loading}
        action={
          <Link
            to="/settings/printer-profiles/new"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <FiPlus />
            Add Printer
          </Link>
        }
      />

      {/* ================= THIS DEVICE ================= */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm p-5 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 shrink-0 rounded-xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A] flex items-center justify-center text-xl">
              <FiMonitor />
            </div>
            <div>
              <p className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                This device prints on:{" "}
                {activeOnDevice ? activeOnDevice.name : "Built-in 80mm default"}
              </p>
              <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                {activeOnDevice
                  ? describeProfile(activeOnDevice)
                  : "No printers configured yet — receipts use standard 80mm geometry."}
                {deviceProfileId ? " · chosen on this device" : " · following the outlet default"}
              </p>
            </div>
          </div>

          {deviceProfileId && (
            <button
              onClick={handleFollowDefault}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] text-[#4B5563] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5 transition"
            >
              Follow outlet default
            </button>
          )}
        </div>
      </div>

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

      {/* ================= TABLE ================= */}

      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#F3F5EE] dark:bg-[#1D231C] border-b border-[#E7EAE1] dark:border-[#262B24]">
              <tr>
                {["Profile", "Paper", "Printable", "Columns", "Speed", "Status", ""].map(
                  (h, i) => (
                    <th
                      key={h || i}
                      className={`px-6 py-4 text-sm font-semibold text-[#4B5563] dark:text-[#9CA8A0] ${
                        i === 6 ? "text-right" : ""
                      }`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center text-[#6B7280] dark:text-[#9CA8A0]">
                    Loading printer profiles…
                  </td>
                </tr>
              ) : profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-14 text-center">
                    <p className="text-[#1F2937] dark:text-[#E4E9E2] font-semibold">
                      No printers configured yet
                    </p>
                    <p className="mt-2 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                      Receipts currently print on standard 80mm geometry. Add
                      your printer to match its exact paper.
                    </p>
                    <Link
                      to="/settings/printer-profiles/new"
                      className="mt-5 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#3FA34D] dark:bg-[#43B75A] hover:bg-[#358F42] dark:hover:bg-[#3AA34E] text-white font-semibold transition"
                    >
                      <FiPlus />
                      Add Printer
                    </Link>
                  </td>
                </tr>
              ) : (
                profiles.map((p) => {
                  const onThisDevice = p.id === deviceProfileId;
                  return (
                    <tr
                      key={p.id}
                      className={`hover:bg-[#F3F5EE] dark:hover:bg-white/5 transition-colors ${
                        p.isActive ? "" : "opacity-60"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/settings/printer-profiles/${p.id}`}
                            className="font-semibold text-[#1F2937] dark:text-[#E4E9E2] hover:text-[#3FA34D] dark:hover:text-[#43B75A]"
                          >
                            {p.name}
                          </Link>
                          {p.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#EAF6EC] dark:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A]">
                              <FiStar size={11} />
                              Default
                            </span>
                          )}
                          {onThisDevice && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-300">
                              <FiMonitor size={11} />
                              This device
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                          {p.model || "Custom"}
                          {p.deviceLabel ? ` · ${p.deviceLabel}` : ""}
                        </p>
                      </td>

                      <td className="px-6 py-4 font-mono text-sm text-[#1F2937] dark:text-[#E4E9E2]">
                        {p.paperWidthMm}mm
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-[#1F2937] dark:text-[#E4E9E2]">
                        {p.printableWidthMm}mm
                        <span className="ml-1 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                          ({p.printableDots} dots)
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-[#1F2937] dark:text-[#E4E9E2]">
                        {p.columns}
                      </td>
                      <td className="px-6 py-4 font-mono text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                        {p.speedMmPerSec ? `${p.speedMmPerSec}mm/s` : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            p.isActive
                              ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300"
                              : "bg-[#F3F5EE] text-[#4B5563] dark:bg-white/5 dark:text-[#9CA8A0]"
                          }`}
                        >
                          {p.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        {confirmRemoveId === p.id ? (
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-xs text-[#EF5350] dark:text-red-400 font-medium">
                              Deactivate?
                            </span>
                            <button
                              onClick={() => setConfirmRemoveId(null)}
                              className="text-xs font-medium text-[#6B7280] dark:text-[#9CA8A0] hover:text-[#1F2937] dark:hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleRemove(p)}
                              disabled={busyId === p.id}
                              className="text-xs font-semibold text-[#EF5350] dark:text-red-400 hover:text-red-700 disabled:opacity-50"
                            >
                              {busyId === p.id ? "Working…" : "Confirm"}
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            {p.isActive && !onThisDevice && (
                              <button
                                onClick={() => handleUseOnThisDevice(p)}
                                disabled={busyId === p.id}
                                title="Print from this device on this printer"
                                className="px-3 py-2 rounded-lg text-xs font-semibold text-[#3FA34D] dark:text-[#43B75A] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 disabled:opacity-50"
                              >
                                Use here
                              </button>
                            )}
                            {p.isActive && !p.isDefault && (
                              <button
                                onClick={() => handleMakeDefault(p)}
                                disabled={busyId === p.id}
                                title="Make this the outlet default"
                                className="p-2 rounded-lg text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 hover:text-[#3FA34D] dark:hover:text-[#43B75A] disabled:opacity-50"
                              >
                                <FiStar />
                              </button>
                            )}
                            <button
                              onClick={() => navigate(`/settings/printer-profiles/${p.id}`)}
                              title="View"
                              className="p-2 rounded-lg text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#F3F5EE] dark:hover:bg-white/5 hover:text-[#1F2937] dark:hover:text-white"
                            >
                              <FiEye />
                            </button>
                            <button
                              onClick={() => navigate(`/settings/printer-profiles/${p.id}/edit`)}
                              title="Edit"
                              className="p-2 rounded-lg text-[#9CA3AF] dark:text-[#6B7280] hover:bg-[#EAF6EC] dark:hover:bg-[#43B75A]/10 hover:text-[#3FA34D] dark:hover:text-[#43B75A]"
                            >
                              <FiEdit2 />
                            </button>
                            {/* The default has no Deactivate button at all —
                                the server refuses it, so offering it would
                                only produce an error toast. */}
                            {p.isActive && !p.isDefault && (
                              <button
                                onClick={() => setConfirmRemoveId(p.id)}
                                title="Deactivate"
                                className="p-2 rounded-lg text-[#9CA3AF] dark:text-[#6B7280] hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-[#EF5350] dark:hover:text-red-400"
                              >
                                <FiTrash2 />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PrinterProfilesList;