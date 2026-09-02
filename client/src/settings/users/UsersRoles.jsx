// ==============================================
// src/settings/users/UsersRoles.jsx
// ==============================================

import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();

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

  // ==========================================
  // NAVIGATION
  // ==========================================
  // These route to settingsRoutes.jsx:
  //   /settings/users/new        -> <UserForm />        (create)
  //   /settings/users/:id/edit   -> <UserForm />         (edit)
  //   /settings/roles            -> <RolePermissions />

  const handleAddUser = () => {
    navigate("/settings/users/new");
  };

  const handleEditUser = (user) => {
    navigate(`/settings/users/${user.id}/edit`);
  };

  const handlePermissions = () => {
    navigate("/settings/roles");
  };

  const handleDeleteUser = (user) => {
    // API later. Left as a confirm so the button isn't dead in the meantime.
    if (window.confirm(`Remove ${user.name}? This can't be undone.`)) {
      console.log("delete user", user.id);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F5EE] dark:bg-[#0F1410]">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="bg-white dark:bg-[#171C17] border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-[#9333EA] dark:bg-[#C084FC] text-white flex items-center justify-center">
                <FiUsers size={30} />
              </div>

              <div>
                <h1 className="text-4xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                  Users & Roles
                </h1>

                <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">
                  Manage staff accounts, roles and permissions.
                </p>
              </div>
            </div>

            <button
              onClick={handleAddUser}
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
          <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
              Total Users
            </p>

            <h2 className="mt-3 text-4xl font-bold text-[#2563EB] dark:text-[#60A5FA]">
              {USERS.length}
            </h2>
          </div>

          <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
              Active Users
            </p>

            <h2 className="mt-3 text-4xl font-bold text-[#3FA34D] dark:text-[#43B75A]">
              {USERS.filter((u) => u.status === "Active").length}
            </h2>
          </div>

          <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
              Managers
            </p>

            <h2 className="mt-3 text-4xl font-bold text-[#9333EA] dark:text-[#C084FC]">
              {USERS.filter((u) => u.role === "Manager").length}
            </h2>
          </div>

          <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6">
            <p className="text-[#6B7280] dark:text-[#9CA8A0] text-sm">
              Roles
            </p>

            <h2 className="mt-3 text-4xl font-bold text-[#EA580C] dark:text-[#FB923C]">
              4
            </h2>
          </div>
        </div>

        {/* ======================================
            SEARCH & FILTER
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] p-6 mt-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}

            <div className="relative flex-1">
              <FiSearch
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#6B7280]"
                size={20}
              />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users..."
                className="
                  w-full
                  h-12
                  rounded-xl
                  border
                  border-[#E7EAE1]
                  dark:border-[#262B24]
                  bg-white
                  dark:bg-[#1D231C]
                  dark:text-[#E4E9E2]
                  pl-12
                  pr-4
                  focus:outline-none
                  focus:border-[#2563EB]
                  dark:focus:border-[#60A5FA]
                "
              />
            </div>

            {/* Filter */}

            <div className="relative w-full lg:w-64">
              <FiFilter
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#6B7280]"
                size={18}
              />

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="
                  w-full
                  h-12
                  rounded-xl
                  border
                  border-[#E7EAE1]
                  dark:border-[#262B24]
                  bg-white
                  dark:bg-[#1D231C]
                  dark:text-[#E4E9E2]
                  pl-11
                  pr-4
                  focus:outline-none
                  focus:border-[#2563EB]
                  dark:focus:border-[#60A5FA]
                "
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

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] mt-8 overflow-hidden">
          {/* Table Header */}

          <div className="px-6 py-5 border-b border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
                Staff Members
              </h2>

              <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">
                {filteredUsers.length} user(s) found
              </p>
            </div>
          </div>

          {/* Table */}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#F3F5EE] dark:bg-[#1D231C]">
                <tr className="text-left">
                  <th className="px-6 py-4 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    User
                  </th>

                  <th className="px-6 py-4 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    Contact
                  </th>

                  <th className="px-6 py-4 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    Role
                  </th>

                  <th className="px-6 py-4 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    Status
                  </th>

                  <th className="px-6 py-4 font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                    Last Login
                  </th>

                  <th className="px-6 py-4 font-semibold text-center text-[#1F2937] dark:text-[#E4E9E2]">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-t border-[#E7EAE1] dark:border-[#262B24] hover:bg-[#F3F5EE] dark:hover:bg-[#1D231C] transition"
                  >
                    {/* User */}

                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center font-bold text-[#2563EB] dark:text-[#60A5FA]">
                          {user.name.charAt(0)}
                        </div>

                        <div>
                          <h3 className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                            {user.name}
                          </h3>

                          <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}

                    <td className="px-6 py-5 text-[#6B7280] dark:text-[#9CA8A0]">
                      {user.phone}
                    </td>

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
                              ? "bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400"
                              : user.role === "Manager"
                                ? "bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400"
                                : user.role === "Cashier"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400"
                                  : "bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400"
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
                              ? "bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400"
                              : "bg-gray-200 text-gray-600 dark:bg-[#262B24] dark:text-[#9CA8A0]"
                          }
                        `}
                      >
                        {user.status}
                      </span>
                    </td>

                    {/* Last Login */}

                    <td className="px-6 py-5 text-[#6B7280] dark:text-[#9CA8A0]">
                      {user.lastLogin}
                    </td>

                    {/* Actions */}

                    <td className="px-6 py-5">
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="
                            px-3
                            py-2
                            rounded-lg
                            bg-blue-50
                            dark:bg-blue-500/10
                            text-[#2563EB]
                            dark:text-[#60A5FA]
                            hover:bg-blue-100
                            dark:hover:bg-blue-500/20
                            transition
                          "
                        >
                          Edit
                        </button>

                        <button
                          onClick={handlePermissions}
                          className="
                            px-3
                            py-2
                            rounded-lg
                            bg-purple-50
                            dark:bg-purple-500/10
                            text-[#9333EA]
                            dark:text-[#C084FC]
                            hover:bg-purple-100
                            dark:hover:bg-purple-500/20
                            transition
                          "
                        >
                          Permissions
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="
                            px-3
                            py-2
                            rounded-lg
                            bg-red-50
                            dark:bg-red-500/10
                            text-red-600
                            dark:text-red-400
                            hover:bg-red-100
                            dark:hover:bg-red-500/20
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
          <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] mt-8 py-20 text-center">
            <FiShield
              size={60}
              className="mx-auto text-[#9CA3AF] dark:text-[#6B7280]"
            />

            <h2 className="mt-6 text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
              No Users Found
            </h2>

            <p className="mt-3 text-[#6B7280] dark:text-[#9CA8A0]">
              Try changing your search or role filter.
            </p>
          </div>
        )}
        {/* ======================================
            PAGINATION & FOOTER
        ====================================== */}

        <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] mt-8 px-6 py-5">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="text-[#6B7280] dark:text-[#9CA8A0]">
                Showing
                <span className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
                  {" "}
                  {filteredUsers.length}
                </span>{" "}
                of{" "}
                <span className="font-semibold text-[#1F2937] dark:text-[#E4E9E2]">
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
                  border-[#E7EAE1]
                  dark:border-[#262B24]
                  text-[#1F2937]
                  dark:text-[#E4E9E2]
                  hover:bg-[#F3F5EE]
                  dark:hover:bg-[#1D231C]
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
                  bg-[#2563EB]
                  dark:bg-[#60A5FA]
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
                  border-[#E7EAE1]
                  dark:border-[#262B24]
                  text-[#1F2937]
                  dark:text-[#E4E9E2]
                  hover:bg-[#F3F5EE]
                  dark:hover:bg-[#1D231C]
                  transition
                "
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsersRoles;