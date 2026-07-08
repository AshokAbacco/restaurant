// ==============================================
// src/settings/users/UserForm.jsx
// ==============================================

import React, { useState } from "react";
import { FiX, FiSave, FiUpload, FiUser } from "react-icons/fi";

const ROLES = ["Owner", "Manager", "Cashier", "Kitchen"];

const UserForm = ({
  open = true,
  user = null,
  onClose = () => {},
  onSave = () => {},
}) => {
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

    onSave(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-5">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden">
        {/* ======================================
            HEADER
        ====================================== */}

        <div className="flex items-center justify-between px-8 py-6 border-b">
          <div>
            <h2 className="text-2xl font-bold">
              {user ? "Edit User" : "Add User"}
            </h2>

            <p className="text-gray-500 mt-1">
              Create or update staff account.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
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
              <div className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden hover:border-blue-500 transition">
                {form.profile ? (
                  <img
                    src={form.profile}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <FiUser size={45} className="text-gray-400" />
                )}
              </div>

              <input
                hidden
                type="file"
                accept="image/*"
                onChange={handleImage}
              />

              <div className="flex justify-center mt-3">
                <div className="flex items-center gap-2 text-blue-600">
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
              <label className="block mb-2 font-medium">Full Name</label>

              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
                placeholder="John Doe"
              />
            </div>

            {/* Email */}

            <div>
              <label className="block mb-2 font-medium">Email Address</label>

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
                placeholder="john@example.com"
              />
            </div>

            {/* Phone */}

            <div>
              <label className="block mb-2 font-medium">Mobile Number</label>

              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
                placeholder="+91 9876543210"
              />
            </div>

            {/* Role */}

            <div>
              <label className="block mb-2 font-medium">Role</label>

              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
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
              <label className="block mb-2 font-medium">Password</label>

              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
                placeholder="Enter Password"
              />
            </div>

            {/* Confirm Password */}

            <div>
              <label className="block mb-2 font-medium">Confirm Password</label>

              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                className="w-full h-12 border rounded-lg px-4"
                placeholder="Confirm Password"
              />
            </div>
          </div>

          {/* ======================================
              STATUS
          ====================================== */}

          <div>
            <label className="block mb-2 font-medium">Status</label>

            <select
              name="status"
              value={form.status}
              onChange={handleChange}
              className="w-full h-12 border rounded-lg px-4"
            >
              <option value="Active">Active</option>

              <option value="Inactive">Inactive</option>
            </select>
          </div>

          {/* ======================================
              NOTES
          ====================================== */}

          <div>
            <label className="block mb-2 font-medium">Notes</label>

            <textarea
              rows={4}
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Additional information about this staff member..."
              className="w-full border rounded-lg p-4 resize-none"
            />
          </div>

          {/* ======================================
              ACTION BUTTONS
          ====================================== */}

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
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
              Cancel
            </button>

            <button
              type="submit"
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

              {user ? "Update User" : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserForm;
