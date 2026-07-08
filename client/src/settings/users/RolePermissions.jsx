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
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-purple-600 text-white flex items-center justify-center">
                <FiShield size={30} />
              </div>

              <div>
                <h1 className="text-4xl font-bold">Role Permissions</h1>

                <p className="mt-2 text-gray-500">
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

      <div className="max-w-5xl mx-auto p-8">
        {/* Role */}

        <div className="bg-white rounded-2xl border p-6">
          <label className="block mb-3 font-semibold">Select Role</label>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full md:w-72 h-12 border rounded-lg px-4"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>

        {/* Permission Table */}

        <div className="bg-white rounded-2xl border mt-8 overflow-hidden">
          <div className="px-6 py-5 border-b">
            <h2 className="text-xl font-bold">Module Permissions</h2>
          </div>

          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left">Module</th>

                <th className="px-6 py-4 text-center">Allow Access</th>
              </tr>
            </thead>

            <tbody>
              {MODULES.map((module) => (
                <tr
                  key={module}
                  className="border-t hover:bg-gray-50 transition"
                >
                  {/* Module Name */}

                  <td className="px-6 py-5">
                    <div className="font-medium text-gray-700">{module}</div>
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
                          rounded-full
                          peer
                          peer-checked:bg-blue-600
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

        <div className="bg-white rounded-2xl border mt-8 p-6">
          <h2 className="text-xl font-bold mb-6">Recommended Permissions</h2>

          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border p-4">
              <h3 className="font-semibold text-red-600 mb-2">👑 Owner</h3>

              <p className="text-gray-600">
                Full access to every module and setting.
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <h3 className="font-semibold text-purple-600 mb-2">👨‍💼 Manager</h3>

              <p className="text-gray-600">
                Manage daily operations, reports and staff without system
                administration.
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <h3 className="font-semibold text-blue-600 mb-2">💰 Cashier</h3>

              <p className="text-gray-600">
                Access POS, orders and customers only.
              </p>
            </div>

            <div className="rounded-xl border p-4">
              <h3 className="font-semibold text-orange-600 mb-2">👨‍🍳 Kitchen</h3>

              <p className="text-gray-600">
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
              border-gray-300
              hover:bg-gray-100
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
              bg-blue-600
              hover:bg-blue-700
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