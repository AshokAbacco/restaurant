// ==============================================
// src/landing/LandingLayout.jsx
// ==============================================

import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/plus-jakarta-sans";

import GlowCursor from "@/components/GlowCursor";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import "./landing.css";

// ==============================================
// SCROLL RESET
// ==============================================

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

// ==============================================
// LAYOUT
//
// GlowCursor lives here, not in App.jsx, so it mounts only while a
// landing route is on screen and unmounts the moment the visitor
// moves to /login or the admin shell.
// ==============================================

const LandingLayout = () => (
  <div className="lp-root min-h-screen">
    <ScrollToTop />

    <GlowCursor
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        width: "100vw",
        height: "100vh",
      }}
      blendMode="normal"
      color="#09a743"
      secondaryColor="#3fa34d"
    />

    <Navbar />

    <main id="main">
      <Outlet />
    </main>

    <Footer />
  </div>
);

export default LandingLayout;