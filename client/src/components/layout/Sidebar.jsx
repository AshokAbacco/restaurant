// src/components/layout/Sidebar.jsx
//
// A single overlay drawer, at every screen size.
//
// It used to be two different things: a hamburger drawer below lg, and a
// narrow icon rail above it that expanded on hover. The rail is gone. It
// had no closed/open state anyone could rely on — it opened when the
// cursor grazed the screen edge and closed when it left — and the layout
// had to permanently reserve its collapsed width, so 96px of every page
// was spent on a menu nobody was reading. Now the menu is only ever open
// because someone asked for it, and it closes the moment they pick
// something. Nothing reserves space for it.

import { useEffect, useMemo, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";

import {
  FiHome,
  FiShoppingCart,
  FiClipboard,
  FiGrid,
  FiBox,
  FiUsers,
  FiFileText,
  FiCreditCard,
  FiDollarSign,
  FiBarChart2,
  FiTrendingUp,
  FiSettings,
  FiLogOut,
  FiCoffee,
  FiX,
  FiMonitor,
  FiExternalLink,
} from "react-icons/fi";
import { TableProperties } from "lucide-react";
import { MdOutlineTableRestaurant } from "react-icons/md";

import { useAuth } from "../../auth/AuthContext";
import { useRestaurantProfile } from "../../context/RestaurantProfileContext";
import BrandMark from "./BrandMark";

// Persisted across route-driven remounts of <Sidebar/>, so reopening the
// drawer puts you back where you were in a 16-item menu rather than at the
// top of it.
let lastMenuScrollTop = 0;

const Sidebar = ({ open, onClose }) => {
  const { user, logout } = useAuth();
  const { restaurantName, logoUrl } = useRestaurantProfile();

  const location = useLocation();
  const menuRef = useRef(null);
  const panelRef = useRef(null);

  // =====================================================
  // MENU SCROLL POSITION
  // =====================================================

  // Restores whatever scroll offset the menu had before this render/mount,
  // and keeps it up to date as the user scrolls — see lastMenuScrollTop
  // above for why this exists.
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    el.scrollTop = lastMenuScrollTop;

    const handleScroll = () => {
      lastMenuScrollTop = el.scrollTop;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const container = menuRef.current;
    if (!container) return;

    const activeItem = container.querySelector(".active-menu");
    if (!activeItem) return;

    // FIX: this used to call scrollIntoView unconditionally, with a smooth
    // animation, on every route change. Combined with the remount-reset
    // above, that's what produced the "jumps to top" effect when clicking
    // any lower menu item. Now it only scrolls when the active item truly
    // isn't fully visible, and it does so instantly rather than animating
    // — so on a normal click (item already in view) nothing moves at all.
    const containerRect = container.getBoundingClientRect();
    const itemRect = activeItem.getBoundingClientRect();
    const isFullyVisible =
      itemRect.top >= containerRect.top &&
      itemRect.bottom <= containerRect.bottom;

    if (!isFullyVisible) {
      activeItem.scrollIntoView({ behavior: "auto", block: "nearest" });
    }
  }, [location.pathname]);

  // =====================================================
  // DRAWER: lock body scroll, close on Escape, take focus
  // =====================================================

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus moves into the panel so the menu is immediately keyboard- and
    // screen-reader-navigable, and returns to whatever opened it on close —
    // otherwise Tab resumes from the top of the document every time.
    const previouslyFocused = document.activeElement;
    panelRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [open, onClose]);

  // =====================================================
  // OWNER MENU
  // (Manager shares this exact menu — see the role switch below.)
  // =====================================================

  const ownerMenu = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <FiHome />,
    },

    {
      name: "POS",
      path: "/pos",
      icon: <FiShoppingCart />,
    },

    {
      name: "Kitchen Orders",
      path: "/kitchen",
      icon: <FiCoffee />,
    },

    {
      name: "Orders",
      path: "/pos/orders",
      icon: <FiClipboard />,
    },

    {
      name: "Tables",
      path: "/tables",
      icon: <FiGrid />,
    },

    {
      name: "Tables Reservations",
      path: "/table-reservations",
      icon: <MdOutlineTableRestaurant />,
    },

    {
      name: "Menu",
      path: "/menu",
      icon: <FiCoffee />,
    },

    {
      name: "Billing & Payments",
      path: "/billing",
      icon: <FiFileText />,
    },

    {
      name: "Payments",
      path: "/payments",
      icon: <FiCreditCard />,
    },

    {
      name: "Inventory",
      path: "/inventory",
      icon: <FiBox />,
    },

    {
      name: "Expenses",
      path: "/expenses",
      icon: <FiDollarSign />,
    },

    {
      name: "Employees",
      path: "/employees",
      icon: <FiUsers />,
    },

    {
      name: "Reports",
      path: "/reports",
      icon: <FiBarChart2 />,
    },

    // Sits next to Reports because that's what it is, but listed separately
    // rather than nested under it: this is the end-of-shift reconciliation
    // screen, opened daily by whoever closes the till, not a report anyone
    // goes looking for.
    {
      name: "Counter Summary",
      path: "/counter-summary",
      icon: <FiFileText />,
    },

    {
      name: "Profit & Loss",
      path: "/profit-loss",
      icon: <FiTrendingUp />,
    },

    {
      name: "Settings",
      path: "/settings",
      icon: <FiSettings />,
    },

    // Opens the self-ordering kiosk screen in a new tab/window. It's a
    // fullscreen customer-facing app (attract screen -> order -> payment
    // -> success loop) with no admin chrome, so it deliberately does NOT
    // navigate away inside this SPA — see the `external` flag below.
    {
      name: "Open Kiosk",
      path: "/kiosk",
      icon: <FiMonitor />,
      external: true,
    },
  ];

  // =====================================================
  // CASHIER MENU
  // =====================================================

  const cashierMenu = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <FiHome />,
    },

    {
      name: "POS",
      path: "/pos",
      icon: <FiShoppingCart />,
    },

    {
      name: "Tables",
      path: "/tables",
      icon: <TableProperties />,
    },

    {
      name: "Kitchen Orders",
      path: "/kitchen",
      icon: <FiCoffee />,
    },

    {
      name: "Orders",
      path: "/pos/orders",
      icon: <FiClipboard />,
    },

    {
      name: "Tables Reservations",
      path: "/table-reservations",
      icon: <MdOutlineTableRestaurant />,
    },

    {
      name: "Menu",
      path: "/menu",
      icon: <FiCoffee />,
    },

    {
      name: "Billing & Payments",
      path: "/billing",
      icon: <FiFileText />,
    },

    {
      name: "Payments",
      path: "/payments",
      icon: <FiCreditCard />,
    },
  ];

  // =====================================================
  // WAITER MENU
  // =====================================================

  const waiterMenu = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <FiHome />,
    },
    {
      name: "POS",
      path: "/pos",
      icon: <FiShoppingCart />,
    },
    {
      name: "Tables",
      path: "/tables",
      icon: <TableProperties />,
    },
    {
      name: "Kitchen Orders",
      path: "/kitchen",
      icon: <FiCoffee />,
    },
    {
      name: "Orders",
      path: "/pos/orders",
      icon: <FiClipboard />,
    },
    {
      name: "Tables Reservations",
      path: "/table-reservations",
      icon: <MdOutlineTableRestaurant />,
    },
    {
      name: "Menu",
      path: "/menu",
      icon: <FiCoffee />,
    },
  ];

  // =====================================================
  // KITCHEN MENU
  // =====================================================

  const kitchenMenu = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <FiHome />,
    },
    {
      name: "POS",
      path: "/pos",
      icon: <FiShoppingCart />,
    },
    {
      name: "Kitchen Orders",
      path: "/kitchen",
      icon: <FiCoffee />,
    },
    {
      name: "Orders",
      path: "/pos/orders",
      icon: <FiClipboard />,
    },
    {
      name: "Menu",
      path: "/menu",
      icon: <FiGrid />,
    },
    {
      name: "Inventory",
      path: "/inventory",
      icon: <FiBox />,
    },
  ];

  // =====================================================
  // MENU BY ROLE
  // =====================================================

  const menus = useMemo(() => {
    switch (user?.role) {
      case "OWNER":
        return ownerMenu;

      // Manager gets the exact same access as Owner.
      case "MANAGER":
        return ownerMenu;

      case "CASHIER":
        return cashierMenu;

      case "WAITER":
        return waiterMenu;

      case "KITCHEN":
        return kitchenMenu;

      default:
        return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = () => {
    logout();
  };

  // =====================================================
  // ROW STYLES
  // =====================================================
  //
  // The drawer is always full width now, so there's no collapsed variant
  // and no fade — every row is just an icon and a label.

  const rowClass = (isActive) =>
    `group relative flex h-12 items-center gap-3 rounded-xl px-4 transition-colors duration-200 ${
      isActive
        ? "active-menu bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 text-[#3FA34D] dark:text-[#43B75A] font-semibold"
        : "text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-[#1E241E] hover:text-[#1F2937] dark:hover:text-white"
    }`;

  // =====================================================
  // RETURN
  // =====================================================

  return (
    <>
      {/* Themed thin scrollbar for the menu list — replaces the default
          chunky browser scrollbar with something that matches the app's
          palette in both light and dark mode. */}
      <style>{`
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: #D8DED2 transparent;
        }
        .sidebar-scroll::-webkit-scrollbar { width: 6px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: #D8DED2;
          border-radius: 9999px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background-color: #C3CBBA; }
        .dark .sidebar-scroll { scrollbar-color: #262E22 transparent; }
        .dark .sidebar-scroll::-webkit-scrollbar-thumb { background-color: #262E22; }
        .dark .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(67, 183, 90, 0.35);
        }

        @media (prefers-reduced-motion: reduce) {
          .app-sidebar-drawer,
          .app-sidebar-scrim { transition: none !important; }
        }
      `}</style>

      {/* ================= SCRIM ================= */}

      {/* Kept mounted and faded rather than conditionally rendered, so the
          drawer has something to slide out from under on close instead of
          the page snapping back to full brightness in one frame. */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`app-sidebar-scrim fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 dark:bg-black/60 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* ================= DRAWER ================= */}

      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Main menu"
        aria-hidden={!open}
        // inert while closed, so a screen reader or a Tab press can't reach
        // sixteen offscreen links that are supposedly not there.
        {...(open ? {} : { inert: "" })}
        className={`app-sidebar-drawer fixed left-0 top-0 z-50 flex h-full w-72 max-w-[85vw] transform flex-col bg-white shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] focus:outline-none dark:bg-[#10140F] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* ===================== BRAND ===================== */}

        <div className="flex h-20 shrink-0 items-center gap-3 border-b border-[#E7EAE1] px-4 dark:border-[#262B24]">
          <BrandMark logoUrl={logoUrl} restaurantName={restaurantName} />

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[14px] font-bold text-[#3FA34D] dark:text-[#43B75A]">
              {restaurantName}
            </h1>
            <p className="mt-0.5 text-[12px] text-[#9CA3AF] dark:text-[#6B7280]">
              Management System
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#1F2937] hover:bg-[#3FA34D]/10 dark:text-white dark:hover:bg-[#43B75A]/10"
          >
            <FiX />
          </button>
        </div>

        {/* ===================== MENU ===================== */}

        <div ref={menuRef} className="sidebar-scroll flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            {menus.map((item) => {
              const active = location.pathname === item.path;

              // External items (currently just "Open Kiosk") open in a new
              // tab instead of navigating the admin SPA away from itself —
              // the kiosk is a separate fullscreen customer-facing app.
              if (item.external) {
                return (
                  <a
                    key={item.path}
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onClose}
                    className={rowClass(false)}
                    title="Opens in a new tab"
                  >
                    <span className="shrink-0 text-xl">{item.icon}</span>
                    <span className="flex flex-1 items-center gap-2 text-[14px] font-medium">
                      {item.name}
                      <FiExternalLink className="text-sm opacity-60" />
                    </span>
                  </a>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  // The close-on-select the brief asks for. It's also what
                  // makes an overlay drawer usable at all — the menu sits
                  // on top of the page it just navigated to.
                  onClick={onClose}
                  className={({ isActive }) => rowClass(isActive)}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#3FA34D] dark:bg-[#43B75A]" />
                  )}

                  <span className="shrink-0 text-xl">{item.icon}</span>
                  <span className="flex-1 text-[14px] font-medium">
                    {item.name}
                  </span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* ===================== LOGOUT ===================== */}

        <div className="shrink-0 border-t border-[#E7EAE1] p-2 dark:border-[#262B24]">
          <button
            onClick={handleLogout}
            className="group flex h-12 w-full items-center gap-3 rounded-xl px-4 text-[#6B7280] transition-colors duration-200 hover:bg-[#EF5350]/10 hover:text-[#EF5350] dark:text-[#9CA8A0]"
          >
            <span className="shrink-0 text-xl">
              <FiLogOut />
            </span>
            <span className="flex-1 text-left text-[14px] font-medium">
              Logout
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;