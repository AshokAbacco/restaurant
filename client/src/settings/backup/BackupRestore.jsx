// ==============================================
// src/settings/backup/BackupRestore.jsx
// ==============================================

import React, { useState } from "react";
import { FiDatabase, FiSave, FiRefreshCw, FiDownload } from "react-icons/fi";

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
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-8 py-8 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
              <FiDatabase size={30} />
            </div>

            <div>
              <h1 className="text-4xl font-bold">Backup & Restore</h1>

              <p className="mt-2 text-gray-500">
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
            MANUAL BACKUP
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8">
          <h2 className="text-2xl font-bold mb-8">Manual Backup</h2>

          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleBackup}
              className="
                h-12
                px-8
                rounded-xl
                bg-green-600
                hover:bg-green-700
                text-white
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
                hover:bg-gray-100
                flex
                items-center
                gap-2
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

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Automatic Backup</h2>

          <div className="space-y-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable Automatic Backup</h3>

                <p className="text-sm text-gray-500">
                  Automatically backup restaurant data.
                </p>
              </div>

              <input
                type="checkbox"
                name="autoBackup"
                checked={settings.autoBackup}
                onChange={handleChange}
                className="w-5 h-5"
              />
            </label>

            <div>
              <label className="block mb-2 font-medium">Backup Frequency</label>

              <select
                name="backupFrequency"
                value={settings.backupFrequency}
                onChange={handleChange}
                className="w-full md:w-72 h-12 border rounded-lg px-4"
              >
                <option>Every 6 Hours</option>

                <option>Daily</option>

                <option>Weekly</option>

                <option>Monthly</option>
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">
                Keep Last Backups
              </label>

              <select
                name="keepBackups"
                value={settings.keepBackups}
                onChange={handleChange}
                className="w-full md:w-72 h-12 border rounded-lg px-4"
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

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Cloud Backup</h2>

          <div className="space-y-6">
            <label className="flex items-center justify-between border rounded-xl p-5">
              <div>
                <h3 className="font-semibold">Enable Cloud Backup</h3>

                <p className="text-sm text-gray-500">
                  Store backups securely in cloud storage.
                </p>
              </div>

              <input
                type="checkbox"
                name="cloudBackup"
                checked={settings.cloudBackup}
                onChange={handleChange}
                className="w-5 h-5"
              />
            </label>

            <div>
              <label className="block mb-2 font-medium">Cloud Provider</label>

              <select className="w-full md:w-80 h-12 border rounded-lg px-4">
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

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Restore Backup</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-2 font-medium">
                Upload Backup File
              </label>

              <input
                type="file"
                accept=".zip,.sql,.json"
                className="w-full border rounded-lg p-3"
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
                  text-white
                "
              >
                Restore Backup
              </button>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-yellow-300 bg-yellow-50 p-5">
            <h3 className="font-semibold text-yellow-800">Warning</h3>

            <p className="mt-2 text-sm text-yellow-700">
              Restoring a backup will overwrite the current database. Always
              create a backup before restoring.
            </p>
          </div>
        </div>

        {/* ======================================
            BACKUP HISTORY
        ====================================== */}

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Backup History</h2>

            <span className="text-sm text-gray-500">Last 5 backups</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-5 py-4">Date</th>

                  <th className="text-left px-5 py-4">Type</th>

                  <th className="text-left px-5 py-4">Size</th>

                  <th className="text-left px-5 py-4">Status</th>

                  <th className="text-center px-5 py-4">Action</th>
                </tr>
              </thead>

              <tbody>
                <tr className="border-t">
                  <td className="px-5 py-4">Today 10:30 AM</td>

                  <td className="px-5 py-4">Automatic</td>

                  <td className="px-5 py-4">28 MB</td>

                  <td className="px-5 py-4 text-green-600 font-medium">
                    Successful
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button className="text-blue-600 hover:underline">
                      Download
                    </button>
                  </td>
                </tr>

                <tr className="border-t">
                  <td className="px-5 py-4">Yesterday</td>

                  <td className="px-5 py-4">Manual</td>

                  <td className="px-5 py-4">27 MB</td>

                  <td className="px-5 py-4 text-green-600 font-medium">
                    Successful
                  </td>

                  <td className="px-5 py-4 text-center">
                    <button className="text-blue-600 hover:underline">
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

        <div className="bg-white rounded-2xl border p-8 mt-8">
          <h2 className="text-2xl font-bold mb-8">Storage Information</h2>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="font-semibold">Last Backup</h3>

              <p className="mt-3 text-gray-600">Today 10:30 AM</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="font-semibold">Total Backups</h3>

              <p className="mt-3 text-gray-600">18</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="font-semibold">Storage Used</h3>

              <p className="mt-3 text-gray-600">512 MB</p>
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
            Save Backup Settings
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupRestore;
