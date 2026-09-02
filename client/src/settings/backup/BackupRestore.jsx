// ==============================================
// src/settings/backup/BackupRestore.jsx
// Updated with dark/light mode support, matching SettingsDashboard
// ==============================================

import React, { useState } from "react";
import { FiDatabase, FiSave, FiRefreshCw, FiDownload } from "react-icons/fi";

const inputClass =
  "w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] rounded-lg px-4 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] dark:[color-scheme:dark] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA] transition-colors";

const BackupRestore = () => {
  const [settings, setSettings] = useState({
    autoBackup: true,
    backupFrequency: "Daily",
    cloudBackup: false,
    keepBackups: "30",
  });

  // ==========================================
  // CHANGE
  // ==========================================

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    setSettings((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // ==========================================
  // ACTIONS
  // ==========================================

  const handleBackup = () => {
    console.log("Creating backup...");
  };

  const handleSave = () => {
    console.log(settings);
  };

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-[#0369A1] dark:bg-[#0EA5E9] text-white flex items-center justify-center">
              <FiDatabase size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                Backup & Restore
              </h1>

              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
                Secure your restaurant data with automatic backups.
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
            MANUAL BACKUP
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
            Manual Backup
          </h2>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleBackup}
              className="
                h-12
                px-8
                rounded-xl
                bg-[#3FA34D]
                dark:bg-[#43B75A]
                hover:bg-[#358F42]
                dark:hover:bg-[#3AA34E]
                text-white
                shadow-sm
                transition-colors
              "
            >
              Create Backup
            </button>

            <button
              className="
                h-12
                px-8
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
              <FiDownload />
              Download Latest Backup
            </button>
          </div>
        </div>

        {/* ======================================
            AUTOMATIC BACKUP
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
            Automatic Backup
          </h2>

          <div className="space-y-6">
            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  Enable Automatic Backup
                </h3>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                  Automatically backup restaurant data.
                </p>
              </div>

              <input
                type="checkbox"
                name="autoBackup"
                checked={settings.autoBackup}
                onChange={handleChange}
                className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
              />
            </label>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Backup Frequency
              </label>

              <select
                name="backupFrequency"
                value={settings.backupFrequency}
                onChange={handleChange}
                className={`md:w-72 ${inputClass}`}
              >
                <option>Every 6 Hours</option>

                <option>Daily</option>

                <option>Weekly</option>

                <option>Monthly</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Keep Last Backups
              </label>

              <select
                name="keepBackups"
                value={settings.keepBackups}
                onChange={handleChange}
                className={`md:w-72 ${inputClass}`}
              >
                <option value="7">7</option>

                <option value="15">15</option>

                <option value="30">30</option>

                <option value="60">60</option>
              </select>
            </div>
          </div>
        </div>
        {/* ======================================
            CLOUD BACKUP
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
            Cloud Backup
          </h2>

          <div className="space-y-6">
            <label className="flex items-center justify-between border border-[#E7EAE1] dark:border-[#262B24] rounded-xl p-5">
              <div>
                <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  Enable Cloud Backup
                </h3>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                  Store backups securely in cloud storage.
                </p>
              </div>

              <input
                type="checkbox"
                name="cloudBackup"
                checked={settings.cloudBackup}
                onChange={handleChange}
                className="w-5 h-5 accent-[#3FA34D] dark:accent-[#43B75A]"
              />
            </label>

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Cloud Provider
              </label>

              <select className={`md:w-80 ${inputClass}`}>
                <option>Google Drive</option>

                <option>Dropbox</option>

                <option>OneDrive</option>

                <option>Amazon S3</option>
              </select>
            </div>
          </div>
        </div>

        {/* ======================================
            RESTORE BACKUP
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
            Restore Backup
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Upload Backup File
              </label>

              <input
                type="file"
                accept=".zip,.sql,.json"
                className="w-full border border-[#E7EAE1] dark:border-[#262B24] rounded-lg p-3 bg-white dark:bg-[#1D231C] text-[#1F2937] dark:text-[#E4E9E2] file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#F3F5EE] dark:file:bg-white/5 file:text-[#1F2937] dark:file:text-[#E4E9E2] transition-colors"
              />
            </div>

            <div className="flex items-end">
              <button
                className="
                  h-12
                  px-8
                  rounded-xl
                  bg-orange-600
                  hover:bg-orange-700
                  dark:bg-orange-500
                  dark:hover:bg-orange-400
                  text-white
                  transition-colors
                "
              >
                Restore Backup
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-yellow-300 dark:border-yellow-500/30 bg-yellow-50 dark:bg-yellow-500/10 p-5">
            <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
              Warning
            </h3>

            <p className="mt-2 text-sm text-yellow-700 dark:text-yellow-200/80">
              Restoring a backup will overwrite the current database. Always
              create a backup before restoring.
            </p>
          </div>
        </div>

        {/* ======================================
            BACKUP HISTORY
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
              Backup History
            </h2>

            <span className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
              Last 5 backups
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F3F5EE] dark:bg-white/5">
                <tr>
                  <th className="text-left px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    Date
                  </th>

                  <th className="text-left px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    Type
                  </th>

                  <th className="text-left px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    Size
                  </th>

                  <th className="text-left px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    Status
                  </th>

                  <th className="text-center px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
                <tr className="border-t border-[#E7EAE1] dark:border-[#262B24]">
                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    Today 10:30 AM
                  </td>

                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    Automatic
                  </td>

                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    28 MB
                  </td>

                  <td className="px-5 py-4 text-green-600 dark:text-green-400 font-medium">
                    Successful
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button className="text-[#2563EB] dark:text-[#60A5FA] hover:underline">
                      Download
                    </button>
                  </td>
                </tr>

                <tr className="border-t border-[#E7EAE1] dark:border-[#262B24]">
                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    Yesterday
                  </td>

                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    Manual
                  </td>

                  <td className="px-5 py-4 text-[#1F2937] dark:text-[#E4E9E2]">
                    27 MB
                  </td>

                  <td className="px-5 py-4 text-green-600 dark:text-green-400 font-medium">
                    Successful
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button className="text-[#2563EB] dark:text-[#60A5FA] hover:underline">
                      Download
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ======================================
            STORAGE INFORMATION
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8 text-[#1F2937] dark:text-[#E4E9E2]">
            Storage Information
          </h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
              <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Last Backup
              </h3>

              <p className="mt-3 text-[#6B7280] dark:text-[#9CA8A0]">
                Today 10:30 AM
              </p>
            </div>

            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
              <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Total Backups
              </h3>

              <p className="mt-3 text-[#6B7280] dark:text-[#9CA8A0]">18</p>
            </div>

            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
              <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                Storage Used
              </h3>

              <p className="mt-3 text-[#6B7280] dark:text-[#9CA8A0]">512 MB</p>
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
            Save Backup Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;