// ==============================================
// src/layouts/AdminLayout.jsx
// ==============================================

import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";
import { refreshActiveProfile } from "../../print/printerConfig";

const AdminLayout = () => {
  // ==========================================
  // STATES
  // ==========================================

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);


  // ==========================================
  // SCROLL TO TOP
  // ==========================================

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  // ==========================================
  // PRINTER GEOMETRY
  // ==========================================
  // Resolve this device's printer profile once per authenticated session.
  // printOnce() is synchronous — it can't await a fetch while the operator
  // waits on a print dialog — so the profile has to already be in hand by the
  // time someone hits Print. Until it lands (or if it fails outright)
  // printing falls back to the built-in 80mm geometry, which is exactly what
  // the receipts used before printer profiles existed.
  useEffect(() => {
    refreshActiveProfile();
  }, []);

  // ==========================================
  // SIDEBAR
  // ==========================================

  const openSidebar = () => {
    setMobileSidebarOpen(true);
  };

  const closeSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f3f5ee] dark:bg-[#0D110C] transition-colors">
      {/* ======================================
          SIDEBAR
      ====================================== */}

      {/* The desktop rail expands on hover and overlays the page, so it no
          longer needs a collapsed flag from here — and the margin below must
          NOT follow it. Reserving the collapsed width permanently is what
          stops the whole page reflowing every time the cursor passes the
          screen edge. */}
      <Sidebar mobileOpen={mobileSidebarOpen} onClose={closeSidebar} />

      {/* ======================================
          MAIN CONTENT
      ====================================== */}

      <div className="flex flex-col min-h-screen lg:ml-24">
        {/* Header */}

        <Header onMenuClick={openSidebar} />

        {/* Main */}

        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          <div className="max-w-[1800px] mx-auto">
            {/* ================= PAGE CONTAINER ================= */}

            <div className="relative">
              {/* Background Decoration */}

              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 dark:bg-[#43B75A]/[0.06] rounded-full blur-3xl" />

                <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 dark:bg-cyan-400/[0.05] rounded-full blur-3xl" />
              </div>

              {/* Content */}

              <div className="relative">
                <div className="animate-fadeIn">
                  <Outlet />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}

        {/* <Footer /> */}
      </div>

      {/* ================= SCROLL TO TOP ================= */}

      <button
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          })
        }
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-600 dark:bg-[#43B75A] hover:bg-blue-700 dark:hover:bg-[#3FA34D] text-white shadow-xl transition-all duration-300 hover:scale-110 z-20"
      >
        ↑
      </button>

      {/* ================= GLOBAL LOADING (Future) ================= */}
    </div>
  );
};

export default AdminLayout;