// ==============================================
// src/landing/components/Navbar.jsx
// ==============================================
//
// Sticky public header.
//
// Two states: sitting transparently on the hero at the top of the page,
// and a solid bar with a hairline once the page has scrolled. The change
// exists so the links stay readable over the photograph, not for effect.
//
// The right-hand action follows who's asking. A visitor gets "Sign in"
// and "Start free trial"; someone already logged in gets a single link
// back to the dashboard, because offering them a signup form is noise.

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { FiMenu, FiX } from "react-icons/fi";

import { useAuth } from "../../auth/AuthContext";
 import { useScrolledPast } from "../hooks/useLandingMotion";
import Wordmark from "./Wordmark";

const Navbar = () => {
  const scrolled = useScrolledPast(12);
  const { pathname } = useLocation();
  const { isAuthenticated } = useAuth();
  const panelRef = useRef(null);

  const [openedOn, setOpenedOn] = useState(null);
  const open = openedOn === pathname;

  const toggle = () => setOpenedOn(open ? null : pathname);
  const close = () => setOpenedOn(null);

  // Lock the page behind the sheet, and give Escape its usual meaning.
  useEffect(() => {
    if (!open) return;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenedOn(null);
    };

    window.addEventListener("keydown", onKeyDown);
    panelRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const solid = scrolled || open;

  // ==========================================
  // RENDER
  // ==========================================

  const NAV_LINKS = [
  { label: "Home", to: "/" },
 
  { label: "Pricing", to: "/pricing" },
  { label: "Contact", to: "/contact" },
];
  return (
    <header
      className={`sticky top-0 z-50 transition-colors duration-300 ${
        solid
          ? "border-b border-[#e0e4d8] bg-green/55 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent "
      }`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-10 focus:rounded-full focus:bg-[#171C17] focus:px-4 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>

      <nav
        aria-label="Main"
        className="mx-auto flex h-[72px] w-full max-w-7l items-center justify-between px-5 sm:px-8"
      >
        <Wordmark />

        {/* ==========================================
            DESKTOP LINKS
        ========================================== */}

        <ul className="hidden items-center gap-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <li key={link.label}>
              <NavLink
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  `relative rounded-full px-3.5 py-2 text-[14.5px] font-medium transition-colors ${
                    isActive
                      ? "text-[#171C17]"
                      : "text-[#6B7280] hover:text-[#171C17]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {link.label}
                    {/* A short underline under the current page rather
                        than a filled pill — quieter, and it doesn't
                        compete with the green buttons alongside. */}
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-3.5 -bottom-0.5 h-[2px] rounded-full bg-[#3FA34D] transition-opacity ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        {/* ==========================================
            ACTIONS
        ========================================== */}

        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="rounded-full bg-[#171C17] px-5 py-2.5 text-[14.5px] font-semibold text-[#F3F5EE] transition-transform duration-200 hover:-translate-y-px"
            >
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="hidden rounded-full px-4 py-2.5 text-[14.5px] font-semibold text-[#171C17] transition-colors hover:bg-[#E9EDE1] sm:block"
              >
                Sign in
              </Link>

              <Link
                to="/register"
                className="rounded-full bg-[#3FA34D] px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-[0_10px_24px_-14px_rgba(63,163,77,0.95)] transition-transform duration-200 hover:-translate-y-px"
              >
                Start free trial
              </Link>
            </>
          )}

          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            aria-controls="lp-mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="ml-1 grid h-10 w-10 place-items-center rounded-full border border-[#e0e4d8] bg-white text-[#171C17] lg:hidden"
          >
            {open ? <FiX size={18} /> : <FiMenu size={18} />}
          </button>
        </div>
      </nav>

      {/* ==========================================
          MOBILE SHEET
      ========================================== */}

      {open && (
        <div
          id="lp-mobile-nav"
          ref={panelRef}
          tabIndex={-1}
          className="border-t border-[#e0e4d8] bg-[#F3F5EE] lg:hidden"
        >
          <ul className="mx-auto flex max-w-[1240px] flex-col px-5 py-2 sm:px-8">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                {/* Deriving `open` from the route covers every link that
                    goes somewhere new. Tapping the link for the page
                    you're already on doesn't change the route, so that
                    one case needs closing by hand. */}
                <NavLink
                  to={link.to}
                  end={link.to === "/"}
                  onClick={close}
                  className={({ isActive }) =>
                    `lp-title flex items-center justify-between border-b border-[#e0e4d8] py-4 text-[22px] ${
                      isActive ? "text-[#3FA34D]" : "text-[#171C17]"
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {!isAuthenticated && (
            <div className="mx-auto max-w-[1240px] px-5 pb-6 sm:px-8">
              <Link
                to="/login"
                className="block rounded-full border border-[#171C17] px-5 py-3 text-center text-[15px] font-semibold text-[#171C17]"
              >
                Sign in
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Navbar;
