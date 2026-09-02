// ==============================================
// src/settings/users/RolePermissions.jsx
// ==============================================

import React, { useState } from "react";
import {
  FiShield,
  FiSave,
} from "react-icons/fi";

// ==============================================
// ROLES
// ==============================================

const ROLES = [
  "Owner",
  "Manager",
  "Cashier",
  "Kitchen",
];

// ==============================================
// MODULES
// ==============================================

const MODULES = [
  "Dashboard",
  "POS",
  "Orders",
  "Menu",
  "Kitchen",
  "Tables",
  "Customers",
  "Reports",
  "Settings",
  "Kiosk",
];

// ==============================================
// COMPONENT
// ==============================================

const RolePermissions = () => {
  const [selectedRole, setSelectedRole] = useState("Manager");

  const [permissions, setPermissions] = useState({
    Dashboard: true,
    POS: true,
    Orders: true,
    Menu: true,
    Kitchen: true,
    Tables: true,
    Customers: true,
    Reports: true,
    Settings: false,
    Kiosk: true,
  });

  // ==========================================
  // TOGGLE
  // ==========================================

  const togglePermission = (module) => {
    setPermissions((prev) => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  // ==========================================
  // SAVE
  // ==========================================

  const handleSave = () => {
    console.log(selectedRole);

    console.log(permissions);

    // API Later
  };

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#9333EA] dark:bg-[#C084FC] text-white flex items-center justify-center">
                <FiShield size={30} />
              </div>

              <div>
                <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                  Role Permissions
                </h1>

                <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
                  Configure access for each role.
                </p>
              </div>
            </div>

            <button
              onClick={handleSave}
              className="
                h-12
                px-6
                rounded-xl
                bg-[#2563EB]
                dark:bg-[#60A5FA]
                hover:bg-[#1D4ED8]
                dark:hover:bg-[#3B82F6]
                text-white
                flex
                items-center
                gap-2
                transition
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

      <div className="max-w-5xl mx-auto p-8">
        {/* Role */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
          <label className="block mb-3 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
            Select Role
          </label>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="
              w-full
              md:w-72
              h-12
              border
              border-[#E7EAE1]
              dark:border-[#262B24]
              bg-white
              dark:bg-[#1D231C]
              dark:text-[#E4E9E2]
              rounded-lg
              px-4
              focus:outline-none
              focus:border-[#2563EB]
              dark:focus:border-[#60A5FA]
            "
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        {/* Permission Table */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] mt-8 overflow-hidden">
          <div className="px-6 py-5 border-b border-[#E7EAE1] dark:border-[#262B24]">
            <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
              Module Permissions
            </h2>
          </div>

          <table className="w-full">
            <thead className="bg-[#F3F5EE] dark:bg-[#1D231C]">
              <tr>
                <th className="px-6 py-4 text-left text-[#1F2937] dark:text-[#E4E9E2]">
                  Module
                </th>

                <th className="px-6 py-4 text-center text-[#1F2937] dark:text-[#E4E9E2]">
                  Allow Access
                </th>
              </tr>
            </thead>

            <tbody>
              {MODULES.map((module) => (
                <tr
                  key={module}
                  className="border-t border-[#E7EAE1] dark:border-[#262B24] hover:bg-[#F3F5EE] dark:hover:bg-[#1D231C] transition"
                >
                  {/* Module Name */}

                  <td className="px-6 py-5">
                    <div className="font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                      {module}
                    </div>
                  </td>

                  {/* Toggle */}

                  <td className="px-6 py-5 text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={permissions[module]}
                        onChange={() => togglePermission(module)}
                        className="sr-only peer"
                      />

                      <div
                        className="
                          relative
                          w-12
                          h-7
                          bg-gray-300
                          dark:bg-[#262B24]
                          rounded-full
                          peer
                          peer-checked:bg-[#2563EB]
                          dark:peer-checked:bg-[#60A5FA]
                          transition
                          after:content-['']
                          after:absolute
                          after:top-1
                          after:left-1
                          after:w-5
                          after:h-5
                          after:bg-white
                          after:rounded-full
                          after:transition-all
                          peer-checked:after:translate-x-5
                        "
                      />
                    </label>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ======================================
            QUICK PRESETS
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] mt-8 p-6">
          <h2 className="text-xl font-bold mb-6 text-[#1F2937] dark:text-[#E4E9E2]">
            Recommended Permissions
          </h2>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-4">
              <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">
                👑 Owner
              </h3>

              <p className="text-[#6B7280] dark:text-[#9CA8A0]">
                Full access to every module and setting.
              </p>
            </div>

            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-4">
              <h3 className="font-semibold text-[#9333EA] dark:text-[#C084FC] mb-2">
                👨‍💼 Manager
              </h3>

              <p className="text-[#6B7280] dark:text-[#9CA8A0]">
                Manage daily operations, reports and staff without system
                administration.
              </p>
            </div>

            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-4">
              <h3 className="font-semibold text-[#2563EB] dark:text-[#60A5FA] mb-2">
                💰 Cashier
              </h3>

              <p className="text-[#6B7280] dark:text-[#9CA8A0]">
                Access POS, orders and customers only.
              </p>
            </div>

            <div className="rounded-xl border border-[#E7EAE1] dark:border-[#262B24] p-4">
              <h3 className="font-semibold text-[#EA580C] dark:text-[#FB923C] mb-2">
                👨‍🍳 Kitchen
              </h3>

              <p className="text-[#6B7280] dark:text-[#9CA8A0]">
                Access Kitchen Display System and kitchen orders only.
              </p>
            </div>
          </div>
        </div>

        {/* ======================================
            ACTION BUTTONS
        ====================================== */}

        <div className="flex justify-end gap-4 mt-8">
          <button
            className="
              h-12
              px-6
              rounded-lg
              border
              border-[#E7EAE1]
              dark:border-[#262B24]
              text-[#1F2937]
              dark:text-[#E4E9E2]
              hover:bg-[#F3F5EE]
              dark:hover:bg-[#1D231C]
              transition
            "
          >
            Reset
          </button>

          <button
            onClick={handleSave}
            className="
              h-12
              px-8
              rounded-lg
              bg-[#2563EB]
              dark:bg-[#60A5FA]
              hover:bg-[#1D4ED8]
              dark:hover:bg-[#3B82F6]
              text-white
              flex
              items-center
              gap-2
              transition
            "
          >
            <FiSave />
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
};

export default RolePermissions;