// ==============================================
// src/layouts/AdminLayout.jsx
// ==============================================

import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";
import Footer from "./Footer";

const AdminLayout = () => {
  // ==========================================
  // STATES
  // ==========================================

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [collapsed, setCollapsed] = useState(false);

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
  // SIDEBAR
  // ==========================================

  const openSidebar = () => {
    setMobileSidebarOpen(true);
  };

  const closeSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* ======================================
          SIDEBAR
      ====================================== */}

      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onClose={closeSidebar}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* ======================================
          MAIN CONTENT
      ====================================== */}

      <div
        className={`flex flex-col min-h-screen transition-all duration-300 ${
          collapsed ? "lg:ml-24" : "lg:ml-72"
        }`}
      >
        {/* Header */}

        <Header onMenuClick={openSidebar} />

        {/* Main */}

        <main className="flex-1 p-2">
          <div className="max-w-[1800px] mx-auto">
            {/* ================= PAGE CONTAINER ================= */}

            <div className="relative">
              {/* Background Decoration */}

              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />

                <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
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

      {/* ================= MOBILE BACKDROP ================= */}

      {mobileSidebarOpen && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
        />
      )}

      {/* ================= SCROLL TO TOP ================= */}

      <button
        onClick={() =>
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          })
        }
        className="fixed bottom-6 right-6 w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl transition-all duration-300 hover:scale-110 z-20"
      >
        ↑
      </button>

      {/* ================= GLOBAL LOADING (Future) ================= */}

      {/*
        Future Enhancement

        <GlobalLoader />

        Can be connected with:
        - React Query
        - Redux
        - Zustand
        - Axios Interceptors
      */}

      {/* ================= GLOBAL TOAST (Future) ================= */}

      {/*
        Future Enhancement

        <Toaster
          position="top-right"
          richColors
        />

        Recommended:
        react-hot-toast
        sonner
      */}

      {/* ================= GLOBAL MODALS (Future) ================= */}

      {/*
        Future Enhancement

        <GlobalModal />
        <ConfirmDialog />
        <DeleteDialog />
      */}
    </div>
  );
};

export default AdminLayout;