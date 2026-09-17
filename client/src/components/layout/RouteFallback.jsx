// ==============================================
// src/components/layout/RouteFallback.jsx
// ==============================================
//
// What's on screen for the moment between a route being matched and its
// JavaScript chunk arriving.
//
// Two pieces, because there are two shapes of wait:
//
//   RouteFallback   the bar itself
//   SuspenseOutlet  a pathless layout route that catches its children's
//                   suspensions so they don't bubble up and blank out
//                   the chrome around them
//
// The second one is the point. Without it, a single <Suspense> at the
// top of App.jsx means clicking from Dashboard to POS tears down the
// sidebar and header, flashes a spinner across the whole window, and
// rebuilds them — on a till, in front of a customer. Wrapping the admin
// modules in their own boundary keeps the shell standing and confines
// the wait to the content area, which is the only part actually changing.
//
// No spinner. A determinate-looking bar across the top is what browsers
// have trained people to read as "the page is coming", and it doesn't
// jump the layout the way a centred spinner in a variable-height
// container does.

import { Suspense } from "react";
import { Outlet } from "react-router-dom";

// ==============================================
// FALLBACK
// ==============================================

export const RouteFallback = () => (
  <div
    role="status"
    aria-live="polite"
    className="fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-transparent"
  >
    <div className="h-full w-1/3 animate-pulse rounded-full bg-[#3FA34D]" />
    <span className="sr-only">Loading</span>
  </div>
);

// ==============================================
// SUSPENDING OUTLET
// ==============================================

export const SuspenseOutlet = () => (
  <Suspense fallback={<RouteFallback />}>
    <Outlet />
  </Suspense>
);

export default RouteFallback;
