// ==============================================
// src/settings/users/UserForm.jsx
// ==============================================
// Rendered directly by settingsRoutes.jsx at:
//   /settings/users/new       -> create mode, no :id param
//   /settings/users/:id/edit  -> edit mode, prefilled from :id
//
// Also still usable as a plain modal (e.g. opened from within another
// page) by passing open/user/onClose/onSave props directly — if those
// aren't passed, it falls back to reading the route params and
// navigating back to /settings/users on close/save.

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiX, FiSave, FiUpload, FiUser } from "react-icons/fi";

const ROLES = ["Owner", "Manager", "Cashier", "Kitchen"];

// TODO: replace with a real API fetch by id. Kept here just so edit mode
// has something to prefill with until GET /users/:id is wired up.
const DEMO_USERS = [
  { id: 1, name: "Restaurant Owner", email: "owner@restaurant.com", phone: "+91 9876543210", role: "Owner", status: "Active" },
  { id: 2, name: "Restaurant Manager", email: "manager@restaurant.com", phone: "+91 9876543211", role: "Manager", status: "Active" },
  { id: 3, name: "POS Cashier", email: "cashier@restaurant.com", phone: "+91 9876543212", role: "Cashier", status: "Active" },
  { id: 4, name: "Kitchen Staff", email: "kitchen@restaurant.com", phone: "+91 9876543213", role: "Kitchen", status: "Inactive" },
];

const UserForm = ({
  open = true,
  user: userProp = null,
  onClose,
  onSave,
}) => {
  const navigate = useNavigate();
  const { id } = useParams();

  // Resolve the user being edited: prefer an explicitly passed prop
  // (modal usage), otherwise look it up from the :id route param.
  const user =
    userProp ??
    (id ? DEMO_USERS.find((u) => String(u.id) === String(id)) || null : null);

  const goBackToList = () => navigate("/settings/users");
  const handleClose = onClose || goBackToList;
  const handleSaveUser = (formData) => {
    if (onSave) {
      onSave(formData);
    } else {
      // API later.
      console.log(user ? "update user" : "create user", formData);
      goBackToList();
    }
  };

  const [form, setForm] = useState({
    profile: "",
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    role: user?.role || "Cashier",
    password: "",
    confirmPassword: "",
    status: user?.status || "Active",
    notes: "",
  });

  // Route-driven edit mode: if the resolved user arrives/changes after
  // the initial render (e.g. navigating from one user's edit page
  // straight to another's), keep the form in sync.
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      role: user?.role || "Cashier",
      status: user?.status || "Active",
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // ==========================================
  // INPUT CHANGE
  // ==========================================

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  // ==========================================
  // IMAGE
  // ==========================================

  const handleImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setForm({
      ...form,
      profile: URL.createObjectURL(file),
    });
  };

  // ==========================================
  // SAVE
  // ==========================================

  const handleSubmit = (e) => {
    e.preventDefault();

    handleSaveUser(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-5">
      <div className="bg-white dark:bg-[#171C17] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* ======================================
            HEADER
        ====================================== */}

        <div className="flex items-center justify-between px-8 py-6 border-b border-[#E7EAE1] dark:border-[#262B24]">
          <div>
            <h2 className="text-2xl font-bold text-[#1F2937] dark:text-[#E4E9E2]">
              {user ? "Edit User" : "Add User"}
            </h2>

            <p className="text-[#6B7280] dark:text-[#9CA8A0] mt-1">
              Create or update staff account.
            </p>
          </div>

          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-full hover:bg-[#F3F5EE] dark:hover:bg-[#1D231C] flex items-center justify-center text-[#1F2937] dark:text-[#E4E9E2]"
          >
            <FiX size={22} />
          </button>
        </div>

        {/* ======================================
            FORM
        ====================================== */}

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* ======================================
              PROFILE IMAGE
          ====================================== */}

          <div className="flex justify-center">
            <label className="cursor-pointer">
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-center overflow-hidden hover:border-[#2563EB] dark:hover:border-[#60A5FA] transition">
                {form.profile ? (
                  <img
                    src={form.profile}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiUser size={45} className="text-[#9CA3AF] dark:text-[#6B7280]" />
                )}
              </div>

              <input
                hidden
                type="file"
                accept="image/*"
                onChange={handleImage}
              />

              <div className="flex justify-center mt-3">
                <div className="flex items-center gap-2 text-[#2563EB] dark:text-[#60A5FA]">
                  <FiUpload />
                  Upload Photo
                </div>
              </div>
            </label>
          </div>

          {/* ======================================
              BASIC INFORMATION
          ====================================== */}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Name */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Full Name
              </label>

              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] rounded-lg px-4 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Email Address
              </label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] rounded-lg px-4 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
                placeholder="john@example.com"
              />
            </div>

            {/* Phone */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Mobile Number
              </label>

              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] rounded-lg px-4 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
                placeholder="+91 9876543210"
              />
            </div>

            {/* Role */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Role
              </label>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] rounded-lg px-4 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {/* ======================================
              SECURITY
          ====================================== */}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Password */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Password
              </label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] rounded-lg px-4 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
                placeholder="Enter Password"
              />
            </div>

            {/* Confirm Password */}

            <div>
              <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
                Confirm Password
              </label>

              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] rounded-lg px-4 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
                placeholder="Confirm Password"
              />
            </div>
          </div>

          {/* ======================================
              STATUS
          ====================================== */}

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Status
            </label>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full h-12 border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] rounded-lg px-4 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            >
              <option value="Active">Active</option>

              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* ======================================
              NOTES
          ====================================== */}

          <div>
            <label className="block mb-2 font-medium text-[#1F2937] dark:text-[#E4E9E2]">
              Notes
            </label>

            <textarea
              rows={4}
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional information about this staff member..."
              className="w-full border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#1D231C] dark:text-[#E4E9E2] rounded-lg p-4 resize-none focus:outline-none focus:border-[#2563EB] dark:focus:border-[#60A5FA]"
            />
          </div>

          {/* ======================================
              ACTION BUTTONS
          ====================================== */}

          <div className="flex justify-end gap-4 pt-4 border-t border-[#E7EAE1] dark:border-[#262B24]">
            <button
              type="button"
              onClick={handleClose}
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
              Cancel
            </button>

            <button
              type="submit"
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

              {user ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;