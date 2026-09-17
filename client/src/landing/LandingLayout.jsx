// ==============================================
// src/landing/LandingLayout.jsx
// ==============================================
//
// The public site's shell: navbar, page, footer.
//
// `lp-root` on the wrapper is what scopes landing.css. Every rule in
// that stylesheet is a descendant of this class, so nothing here can
// reach the admin app even though both are one React tree and one
// bundle.
//
// The stylesheet is imported here rather than in index.css so it only
// loads with this route.

import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

// ==============================================
// TYPEFACES
// ==============================================
//
// Self-hosted rather than pulled from the Google Fonts CDN.
//
// Three reasons, in order of how much they matter here. This app is a
// PWA that has to keep working when the restaurant's connection drops —
// a headline that falls back to Arial the moment the line goes down is a
// bad look for software whose main claim is that it survives that. The
// woff2 files are precached by the service worker alongside everything
// else. Second, no third-party request means nothing to disclose about
// visitor IPs going to Google. Third, it's one fewer connection blocking
// first paint.
//
// Vite fingerprints and emits the woff2 subsets it actually references,
// and only this route imports them, so the admin bundle doesn't carry
// them. The admin app keeps the system font stack — it's a tool people
// stare at for ten hours and it shouldn't wait on a font to draw a bill.

import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/plus-jakarta-sans";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import "./landing.css";

// ==============================================
// SCROLL RESET
// ==============================================
//
// A single-page app keeps the scroll position across a route change, so
// moving from the bottom of Home to /pricing would land halfway down a
// page the visitor has never seen. Jump, don't smooth-scroll — an
// animated trip up two thousand pixels is worse than an instant one.

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

// ==============================================
// LAYOUT
// ==============================================

const LandingLayout = () => (
  <div className="lp-root min-h-screen">
    <ScrollToTop />

    <Navbar />

    <main id="main">
      <Outlet />
    </main>

    <Footer />
  </div>
);

export default LandingLayout;
