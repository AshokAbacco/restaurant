// ==============================================
// src/components/layout/Header.jsx
// ==============================================
//
// One row: menu, brand, new order, the two lookups staff use all day, then
// the account controls. The live clock, breadcrumb, page title and generic
// search that used to stack three extra rows underneath on mobile are gone —
// on a POS the header is chrome, and every row it takes is a row of tables
// the person can't see.
//
// The right-hand side (theme, outlet, offline, profile) is carried over
// as-is; that's the part still due a pass.

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FiMenu, FiSearch, FiSun, FiMoon, FiPlus } from "react-icons/fi";

import { useAuth } from "../../auth/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useRestaurantProfile } from "../../context/RestaurantProfileContext";

import BrandMark from "./BrandMark";
import ProfileMenu from "./ProfileMenu";
import OfflineIndicator from "./OfflineIndicator";
import OutletSwitcher from "./OutletSwitcher";

import { getBillHistory, searchKots } from "../../pos/api/posApi";

// ==============================================
// LOOKUP FIELD
// ==============================================
//
// Bill No and KOT No are the same interaction with a different query, so
// they're one component. Both resolve to a single destination rather than a
// result list: someone typing a bill number already knows which bill they
// want — a dropdown of one is a second click for no information.

const LookupField = ({ label, placeholder, onResolve, widthClass }) => {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const statusTimer = useRef(null);

  useEffect(() => () => clearTimeout(statusTimer.current), []);

  function flash(message) {
    setStatus(message);
    clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(""), 4000);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const query = value.trim();
    if (!query || busy) return;

    setBusy(true);
    setStatus("");
    try {
      const found = await onResolve(query);
      if (found) {
        setValue("");
      } else {
        flash(`No ${label.toLowerCase()} matching "${query}".`);
      }
    } catch (err) {
      flash(err.message || "Couldn't run that search.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${widthClass}`}>
      <label className="sr-only" htmlFor={`lookup-${label}`}>
        {label}
      </label>

      <FiSearch
        size={14}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#6B7280]"
      />

      <input
        id={`lookup-${label}`}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        disabled={busy}
        autoComplete="off"
        className="w-full rounded-lg border border-[#E7EAE1] bg-[#F3F5EE] py-2 pl-9 pr-3 text-[12px] text-[#1F2937] transition-colors placeholder:text-[#9CA3AF] focus:border-[#3FA34D] focus:bg-white focus:outline-none disabled:opacity-60 dark:border-[#262B24] dark:bg-[#171C17] dark:text-white dark:placeholder:text-[#6B7280] dark:focus:border-[#43B75A] dark:focus:bg-[#1E241E]"
      />

      {status && (
        // Positioned rather than inline so a miss doesn't shove the rest of
        // the header sideways.
        <p
          role="status"
          className="absolute left-0 top-full z-10 mt-1 w-max max-w-[240px] rounded-lg bg-[#1F2937] px-2.5 py-1.5 text-[12px] text-white shadow-lg dark:bg-[#262B24]"
        >
          {status}
        </p>
      )}
    </form>
  );
};

// ==============================================
// HEADER
// ==============================================

const Header = ({ onMenuClick }) => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { restaurantName, logoUrl } = useRestaurantProfile();

  const navigate = useNavigate();

  // ==========================================
  // LOOKUPS
  // ==========================================

  // Bill History already searches invoice number and order number together
  // (see billing.service.js), so the navbar doesn't need its own endpoint —
  // it just needs to know what to do with the first hit.
  async function resolveBill(query) {
    const result = await getBillHistory({ search: query, limit: 1 });
    const bill = (Array.isArray(result) ? result : result?.data)?.[0];
    if (!bill) return false;

    navigate(`/billing/history?search=${encodeURIComponent(query)}`);
    return true;
  }

  // A KOT number identifies a ticket, but what someone wants when they type
  // one is the order it belongs to — so this lands on that order's bill.
  async function resolveKot(query) {
    const tickets = await searchKots(query);
    const ticket = Array.isArray(tickets) ? tickets[0] : null;
    const orderId = ticket?.order?.id || ticket?.orderId;
    if (!orderId) return false;

    navigate(`/billing?orderId=${orderId}`);
    return true;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-[#E7EAE1] bg-white transition-colors dark:border-[#262B24] dark:bg-[#10140F]">
      <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4 lg:px-6">
        {/* ================= LEFT ================= */}

        <button
          onClick={onMenuClick}
          aria-label="Open menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E7EAE1] bg-[#F3F5EE] transition-colors hover:border-[#3FA34D]/40 dark:border-[#262B24] dark:bg-[#171C17] dark:hover:border-[#43B75A]/40"
        >
          <FiMenu size={18} className="text-[#1F2937] dark:text-white" />
        </button>

        {/* Brand. The name is hidden below md rather than truncated — a
            three-character sliver of a restaurant name tells nobody
            anything, and the logo already identifies the outlet. */}
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="flex min-w-0 shrink-0 items-center gap-2 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3FA34D]"
          title={restaurantName}
        >
          <BrandMark
            logoUrl={logoUrl}
            restaurantName={restaurantName}
            size="h-9 w-9"
          />
          <span className="hidden max-w-[180px] truncate text-[14px] font-bold text-[#1F2937] md:block dark:text-white">
            {restaurantName}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/pos")}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#3FA34D] px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[#358F42] sm:px-4 dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
        >
          <FiPlus size={14} />
          <span className="hidden sm:inline">New Order</span>
        </button>

        {/* ================= LOOKUPS ================= */}

        {/* Hidden below md: at phone width these two fields would take the
            whole row on their own. They move to their own row below. */}
        <div className="hidden min-w-0 items-center gap-2 md:flex">
          <LookupField
            label="Bill No"
            placeholder="Bill No — INV-000021"
            onResolve={resolveBill}
            widthClass="w-[150px] lg:w-[190px]"
          />
          <LookupField
            label="KOT No"
            placeholder="KOT No — KOT-000046"
            onResolve={resolveKot}
            widthClass="w-[150px] lg:w-[190px]"
          />
        </div>

        {/* ================= RIGHT ================= */}

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            aria-label="Toggle light / dark theme"
            title={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#E7EAE1] bg-[#F3F5EE] transition-colors hover:border-[#3FA34D]/40 dark:border-[#262B24] dark:bg-[#171C17] dark:hover:border-[#43B75A]/40"
          >
            {theme === "dark" ? (
              <FiSun size={16} className="text-[#FFA94D]" />
            ) : (
              <FiMoon size={16} className="text-[#3FA34D]" />
            )}
          </button>

          <OutletSwitcher />

          <OfflineIndicator />

          <ProfileMenu user={user} />
        </div>
      </div>

      {/* ================= LOOKUPS (below md) ================= */}

      <div className="flex items-center gap-2 px-3 pb-2.5 sm:px-4 md:hidden">
        <LookupField
          label="Bill No"
          placeholder="Bill No"
          onResolve={resolveBill}
          widthClass="flex-1"
        />
        <LookupField
          label="KOT No"
          placeholder="KOT No"
          onResolve={resolveKot}
          widthClass="flex-1"
        />
      </div>
    </header>
  );
};

export default Header;