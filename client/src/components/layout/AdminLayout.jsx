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

  const [sidebarOpen, setSidebarOpen] = useState(false);


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
    setSidebarOpen(true);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#f3f5ee] dark:bg-[#0D110C] transition-colors">
      {/* ======================================
          SIDEBAR
      ====================================== */}

      {/* One overlay drawer at every width, opened only from the header's
          menu button and closed the moment a menu item is picked. It floats
          over the page, so the main column below reserves no width for it —
          the full screen belongs to the floor. */}
      <Sidebar open={sidebarOpen} onClose={closeSidebar} />

      {/* ======================================
          MAIN CONTENT
      ====================================== */}

      <div className="flex flex-col min-h-screen">
        {/* Header */}

        <Header onMenuClick={openSidebar} />

        {/* Main */}

        <main className="flex-1 p-3 sm:p-4 lg:p-6">
          <div className="max-w-[1800px] mx-auto">
            {/* ================= PAGE CONTAINER ================= */}

            <div className="relative">
              <Outlet />
            </div>
          </div>
        </main>

        {/* Footer */}

        {/* <Footer /> */}
      </div>

      {/* ================= GLOBAL LOADING (Future) ================= */}
    </div>
  );
};

export default AdminLayout;