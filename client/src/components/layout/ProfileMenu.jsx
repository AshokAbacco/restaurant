// ==============================================
// src/components/layout/ProfileMenu.jsx
// ==============================================

import React, { useEffect, useRef, useState } from "react";

import { Link } from "react-router-dom";

import {
  FiChevronDown,
  FiUser,
  FiSettings,
  FiLock,
  FiHelpCircle,
  FiLogOut,
} from "react-icons/fi";

import { useAuth } from "../../auth/AuthContext";

const ProfileMenu = () => {
  const { user, logout } = useAuth();

  const [open, setOpen] = useState(false);

  const menuRef = useRef(null);

  // ==========================================
  // CLOSE ON OUTSIDE CLICK
  // ==========================================

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout = () => {
    logout();

    setOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* PROFILE BUTTON */}

      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 bg-white dark:bg-[#171C17] border border-[#E7EAE1] dark:border-[#262B24] rounded-full pl-1 pr-3 py-1 hover:border-[#3FA34D]/40 dark:hover:border-[#43B75A]/40 hover:shadow-sm transition-all"
      >
        <div className="w-10 h-10 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] flex items-center justify-center text-white font-semibold text-lg">
          {user?.name?.charAt(0) || "R"}
        </div>

        <div className="hidden md:block text-left">
          <h4 className="font-semibold text-[#1F2937] dark:text-white leading-tight">
            {user?.name || "Restaurant User"}
          </h4>

          <p className="text-xs text-[#6B7280] dark:text-[#9CA8A0] leading-tight">{user?.role || "OWNER"}</p>
        </div>

        <FiChevronDown
          className={`text-[#9CA3AF] dark:text-[#6B7280] transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {/* ================= DROPDOWN ================= */}

      {open && (
        <div className="absolute right-0 mt-3 w-[calc(100vw-2rem)] max-w-[320px] bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-2xl shadow-black/10 dark:shadow-black/40 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
          {/* USER INFO */}

          <div className="bg-gradient-to-r from-[#3FA34D] to-[#2B7A38] dark:from-[#43B75A] dark:to-[#2B7A38] px-6 py-6 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-white text-[#3FA34D] flex items-center justify-center text-2xl font-bold shadow-lg">
                {user?.name?.charAt(0) || "R"}
              </div>

              <div>
                <h3 className="text-lg font-semibold">
                  {user?.name || "Restaurant User"}
                </h3>

                <p className="text-white/80">
                  {user?.email || "owner@restaurant.com"}
                </p>

                <span className="inline-flex mt-2 px-3 py-1 rounded-full bg-white/20 text-sm">
                  {user?.role || "OWNER"}
                </span>
              </div>
            </div>
          </div>

          {/* MENU */}

          <div className="py-2">
            <Link
              to="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[#F3F5EE] dark:hover:bg-[#1E241E] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/10 flex items-center justify-center text-[#3FA34D] dark:text-[#43B75A]">
                <FiUser />
              </div>

              <div>
                <h4 className="font-medium text-[#1F2937] dark:text-white">My Profile</h4>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">View and update profile</p>
              </div>
            </Link>

            <Link
              to="/change-password"
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[#F3F5EE] dark:hover:bg-[#1E241E] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F3F5EE] dark:bg-[#232A22] flex items-center justify-center text-[#1F2937] dark:text-white">
                <FiLock />
              </div>

              <div>
                <h4 className="font-medium text-[#1F2937] dark:text-white">Change Password</h4>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">Update your password</p>
              </div>
            </Link>

            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[#F3F5EE] dark:hover:bg-[#1E241E] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/10 flex items-center justify-center text-[#3FA34D] dark:text-[#43B75A]">
                <FiSettings />
              </div>

              <div>
                <h4 className="font-medium text-[#1F2937] dark:text-white">Settings</h4>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">
                  Manage application settings
                </p>
              </div>
            </Link>

            <Link
              to="/help"
              onClick={() => setOpen(false)}
              className="flex items-center gap-4 px-5 py-4 hover:bg-[#F3F5EE] dark:hover:bg-[#1E241E] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F3F5EE] dark:bg-[#232A22] flex items-center justify-center text-[#1F2937] dark:text-white">
                <FiHelpCircle />
              </div>

              <div>
                <h4 className="font-medium text-[#1F2937] dark:text-white">Help & Support</h4>

                <p className="text-sm text-[#6B7280] dark:text-[#9CA8A0]">Documentation & Contact</p>
              </div>
            </Link>

            <div className="border-t border-[#E7EAE1] dark:border-[#262B24] my-2" />
            {/* ================= LOGOUT ================= */}

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-4 px-5 py-4 text-[#EF5350] hover:bg-[#EF5350]/10 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EF5350]/10 flex items-center justify-center">
                <FiLogOut />
              </div>

              <div className="text-left">
                <h4 className="font-medium">Logout</h4>

                <p className="text-sm text-[#EF5350]/70">
                  Sign out from your account
                </p>
              </div>
            </button>
          </div>

          {/* ================= FOOTER ================= */}

          <div className="border-t border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#10140F] px-5 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">Restaurant ERP</p>

                <p className="text-sm font-semibold text-[#1F2937] dark:text-[#9CA8A0]">
                  Version 1.0.0
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] animate-pulse"></span>

                <span className="text-xs font-medium text-[#3FA34D] dark:text-[#43B75A]">
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;