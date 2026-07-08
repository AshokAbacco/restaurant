// ==============================================
// src/settings/users/UsersRoles.jsx
// ==============================================

import React, { useMemo, useState } from "react";
import {
  FiUsers,
  FiUserPlus,
  FiSearch,
  FiFilter,
  FiShield,
} from "react-icons/fi";

// ==============================================
// DEMO USERS
// Replace with API later
// ==============================================

const USERS = [
  {
    id: 1,
    name: "Restaurant Owner",
    email: "owner@restaurant.com",
    phone: "+91 9876543210",
    role: "Owner",
    status: "Active",
    lastLogin: "Today 10:45 AM",
  },
  {
    id: 2,
    name: "Restaurant Manager",
    email: "manager@restaurant.com",
    phone: "+91 9876543211",
    role: "Manager",
    status: "Active",
    lastLogin: "Today 09:10 AM",
  },
  {
    id: 3,
    name: "POS Cashier",
    email: "cashier@restaurant.com",
    phone: "+91 9876543212",
    role: "Cashier",
    status: "Active",
    lastLogin: "Yesterday",
  },
  {
    id: 4,
    name: "Kitchen Staff",
    email: "kitchen@restaurant.com",
    phone: "+91 9876543213",
    role: "Kitchen",
    status: "Inactive",
    lastLogin: "3 Days Ago",
  },
];

// ==============================================
// COMPONENT
// ==============================================

const UsersRoles = () => {
  const [search, setSearch] = useState("");

  const [roleFilter, setRoleFilter] = useState("All");

  // ==========================================
  // FILTER USERS
  // ==========================================

  const filteredUsers = useMemo(() => {
    return USERS.filter((user) => {
      const searchMatch = `${user.name} ${user.email} ${user.phone}`
        .toLowerCase()
        .includes(search.toLowerCase());

      const roleMatch = roleFilter === "All" || user.role === roleFilter;

      return searchMatch && roleMatch;
    });
  }, [search, roleFilter]);

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                <FiUsers size={30} />
              </div>

              <div>
                <h1 className="text-4xl font-bold text-gray-800">
                  Users & Roles
                </h1>

                <p className="mt-2 text-gray-500">
                  Manage staff accounts, roles and permissions.
                </p>
              </div>
            </div>

            <button
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
              <FiUserPlus />
              Add User
            </button>
          </div>
        </div>
      </div>

      {/* ======================================
          CONTENT
      ====================================== */}

      <div className="max-w-7xl mx-auto p-8">
        {/* ======================================
            STATISTICS
        ====================================== */}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-2xl border p-6">
            <p className="text-gray-500 text-sm">Total Users</p>

            <h2 className="mt-3 text-4xl font-bold text-blue-600">
              {USERS.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <p className="text-gray-500 text-sm">Active Users</p>

            <h2 className="mt-3 text-4xl font-bold text-green-600">
              {USERS.filter((u) => u.status === "Active").length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <p className="text-gray-500 text-sm">Managers</p>

            <h2 className="mt-3 text-4xl font-bold text-purple-600">
              {USERS.filter((u) => u.role === "Manager").length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl border p-6">
            <p className="text-gray-500 text-sm">Roles</p>

            <h2 className="mt-3 text-4xl font-bold text-orange-500">4</h2>
          </div>
        </div>

        {/* ======================================
            SEARCH & FILTER
        ====================================== */}

        <div className="bg-white rounded-2xl border p-6 mt-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}

            <div className="relative flex-1">
              <FiSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="w-full h-12 rounded-xl border border-gray-300 pl-12 pr-4"
              />
            </div>

            {/* Filter */}

            <div className="relative w-full lg:w-64">
              <FiFilter
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full h-12 rounded-xl border border-gray-300 pl-11 pr-4"
              >
                <option>All</option>

                <option>Owner</option>

                <option>Manager</option>

                <option>Cashier</option>

                <option>Kitchen</option>
              </select>
            </div>
          </div>
        </div>
        {/* ======================================
            USERS TABLE
        ====================================== */}

        <div className="bg-white rounded-2xl border border-gray-200 mt-8 overflow-hidden">
          {/* Table Header */}

          <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800">Staff Members</h2>

              <p className="text-gray-500 mt-1">
                {filteredUsers.length} user(s) found
              </p>
            </div>
          </div>

          {/* Table */}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold text-gray-700">
                    User
                  </th>

                  <th className="px-6 py-4 font-semibold text-gray-700">
                    Contact
                  </th>

                  <th className="px-6 py-4 font-semibold text-gray-700">
                    Role
                  </th>

                  <th className="px-6 py-4 font-semibold text-gray-700">
                    Status
                  </th>

                  <th className="px-6 py-4 font-semibold text-gray-700">
                    Last Login
                  </th>

                  <th className="px-6 py-4 font-semibold text-center text-gray-700">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    {/* User */}

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center font-bold text-blue-700">
                          {user.name.charAt(0)}
                        </div>

                        <div>
                          <h3 className="font-semibold text-gray-800">
                            {user.name}
                          </h3>

                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}

                    <td className="px-6 py-5 text-gray-600">{user.phone}</td>

                    {/* Role */}

                    <td className="px-6 py-5">
                      <span
                        className={`
                          px-3
                          py-1
                          rounded-full
                          text-sm
                          font-medium
                          ${
                            user.role === "Owner"
                              ? "bg-red-100 text-red-700"
                              : user.role === "Manager"
                                ? "bg-purple-100 text-purple-700"
                                : user.role === "Cashier"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-orange-100 text-orange-700"
                          }
                        `}
                      >
                        {user.role}
                      </span>
                    </td>

                    {/* Status */}

                    <td className="px-6 py-5">
                      <span
                        className={`
                          px-3
                          py-1
                          rounded-full
                          text-sm
                          font-medium
                          ${
                            user.status === "Active"
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          }
                        `}
                      >
                        {user.status}
                      </span>
                    </td>

                    {/* Last Login */}

                    <td className="px-6 py-5 text-gray-600">
                      {user.lastLogin}
                    </td>

                    {/* Actions */}

                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-3">
                        <button
                          className="
                            px-3
                            py-2
                            rounded-lg
                            bg-blue-50
                            text-blue-600
                            hover:bg-blue-100
                            transition
                          "
                        >
                          Edit
                        </button>

                        <button
                          className="
                            px-3
                            py-2
                            rounded-lg
                            bg-purple-50
                            text-purple-600
                            hover:bg-purple-100
                            transition
                          "
                        >
                          Permissions
                        </button>

                        <button
                          className="
                            px-3
                            py-2
                            rounded-lg
                            bg-red-50
                            text-red-600
                            hover:bg-red-100
                            transition
                          "
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Empty State */}

        {filteredUsers.length === 0 && (
          <div className="bg-white rounded-2xl border mt-8 py-20 text-center">
            <FiShield size={60} className="mx-auto text-gray-300" />

            <h2 className="mt-6 text-2xl font-bold text-gray-700">
              No Users Found
            </h2>

            <p className="mt-3 text-gray-500">
              Try changing your search or role filter.
            </p>
          </div>
        )}
        {/* ======================================
            PAGINATION & FOOTER
        ====================================== */}

        <div className="bg-white rounded-2xl border border-gray-200 mt-8 px-6 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-gray-500">
                Showing
                <span className="font-semibold text-gray-700">
                  {" "}
                  {filteredUsers.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-gray-700">
                  {USERS.length}
                </span>{" "}
                users
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="
                  px-4
                  py-2
                  rounded-lg
                  border
                  border-gray-300
                  hover:bg-gray-100
                  transition
                "
              >
                Previous
              </button>

              <button
                className="
                  w-10
                  h-10
                  rounded-lg
                  bg-blue-600
                  text-white
                "
              >
                1
              </button>

              <button
                className="
                  px-4
                  py-2
                  rounded-lg
                  border
                  border-gray-300
                  hover:bg-gray-100
                  transition
                "
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================
          USER FORM MODAL
      ====================================== */}

      {/* 
        <UserForm
            open={showUserForm}
            user={selectedUser}
            onClose={() => setShowUserForm(false)}
            onSave={handleSaveUser}
        />
      */}

      {/* ======================================
          ROLE PERMISSIONS MODAL
      ====================================== */}

      {/*
        <RolePermissions
            open={showPermissionModal}
            role={selectedRole}
            onClose={() => setShowPermissionModal(false)}
            onSave={handleSavePermissions}
        />
      */}
    </div>
  );
};

export default UsersRoles;
