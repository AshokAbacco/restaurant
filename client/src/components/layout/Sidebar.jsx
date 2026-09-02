// src/components/sidebar.jsx

import React, { useEffect, useMemo, useRef, useState } from "react";
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

// =====================================================
// SIDEBAR
// =====================================================

// Persisted across route-driven remounts of <Sidebar/> — if this component
// ever unmounts/remounts on navigation (e.g. it lives inside a routed
// element rather than a layout that wraps <Outlet/>), a fresh DOM node's
// scrollTop starts at 0. Without this, that reset made the whole menu look
// like it "jumped" back to the top every time you clicked an item further
// down the list, right before the auto-scroll effect below tried to bring
// the clicked item back into view. Restoring it immediately on mount means
// there's nothing to visibly snap.
let lastMenuScrollTop = 0;

// The desktop sidebar is a narrow icon rail that expands on hover and
// collapses when the pointer leaves — there's no toggle button to find.
//
// Two deliberate constraints:
//
//   1. The expanded rail OVERLAYS the page, it doesn't push it. The layout
//      permanently reserves only the collapsed width, so brushing the screen
//      edge can't reflow the whole page underneath the cursor.
//   2. Hover is gated on a real pointer. A touch screen has no "mouse away",
//      so a tap would expand the rail and strand it open on top of the
//      content — touch keeps the hamburger drawer instead.
// Hover intent. The open delay is the important one: without it, the rail
// fires the instant the cursor clips the screen edge on its way somewhere
// else, which is what made it feel like it was snapping at the mouse. 120ms
// is below the threshold where a deliberate move feels laggy, but long
// enough to ignore a pass-through.
//
// The close delay is longer than the open delay on purpose — leaving is the
// more forgiving direction, and a slow exit reads as settled rather than
// dismissive.
const HOVER_OPEN_DELAY_MS = 120;
const HOVER_CLOSE_DELAY_MS = 260;

const Sidebar = ({ mobileOpen, onClose }) => {
  const { user, logout } = useAuth();

  const location = useLocation();
  const menuRef = useRef(null);

  // `expanded` also flips on keyboard focus, so tabbing into the menu reveals
  // the labels. A hover-only rail is unusable without a mouse.
  const [expanded, setExpanded] = useState(false);
  const [canHover, setCanHover] = useState(false);
  const hoverTimer = useRef(null);

  // The logged-in account's outlet/restaurant name (set by the backend on
  // login / GET /auth/me — see server/src/auth/auth.service.js's
  // publicUser()). Falls back to the generic product name until a
  // restaurant name is actually available (e.g. brief moment before the
  // session finishes restoring, or an account with no outlet yet).
  const restaurantName = user?.outlet?.name?.trim() || "Restaurant ERP";

  // =====================================================
  // POINTER CAPABILITY
  // =====================================================

  // matchMedia rather than a touch sniff: a tablet with a trackpad attached
  // reports hover:hover and should get the hover behaviour, while a
  // touchscreen laptop folded into tablet mode should not. The listener means
  // plugging a mouse in mid-session switches the behaviour without a reload.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;

    const query = window.matchMedia("(hover: hover) and (pointer: fine)");
    const apply = (event) => {
      setCanHover(event.matches);
      if (!event.matches) setExpanded(false);
    };

    apply(query);

    // addEventListener on MediaQueryList is unsupported in older Safari.
    if (query.addEventListener) {
      query.addEventListener("change", apply);
      return () => query.removeEventListener("change", apply);
    }
    query.addListener(apply);
    return () => query.removeListener(apply);
  }, []);

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  // One timer for both directions, always cleared first, so a cursor moving
  // in and back out again resolves to a single state change instead of a
  // queue of them fighting each other.
  const scheduleExpanded = (next, delay) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setExpanded(next), delay);
  };

  const handlePointerEnter = () => {
    if (!canHover) return;
    scheduleExpanded(true, HOVER_OPEN_DELAY_MS);
  };

  const handlePointerLeave = () => {
    if (!canHover) return;
    scheduleExpanded(false, HOVER_CLOSE_DELAY_MS);
  };

  // React's onFocus/onBlur bubble (unlike the DOM originals), so one pair of
  // handlers on the <aside> covers every link inside it.
  const handleFocus = () => {
    // No delay here — a keyboard user has already committed.
    clearTimeout(hoverTimer.current);
    setExpanded(true);
  };

  const handleBlur = (event) => {
    // Ignore focus moving between items inside the rail.
    if (event.currentTarget.contains(event.relatedTarget)) return;
    clearTimeout(hoverTimer.current);
    setExpanded(false);
  };

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
  // MOBILE DRAWER: lock body scroll + close on Escape
  // =====================================================

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, onClose]);

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
  // SIDEBAR CONTENT
  // =====================================================

  // A function returning elements, NOT a nested component.
  //
  // Declared inline as `const SidebarContent = () => (...)` and rendered as
  // <SidebarContent/>, this was a brand-new component type on every render,
  // so React tore down and rebuilt the entire menu each time state changed.
  // That was survivable when the rail only moved on a button press. On hover
  // it fires constantly, and a remounted menu resets its own scrollTop —
  // the exact "jump to top" the lastMenuScrollTop code above exists to stop.
  // WHY THE MOTION USED TO FEEL LIKE A SNAP
  //
  // Only the aside's width was animated. Everything inside swapped
  // instantly: labels mounted and unmounted, the header traded a title block
  // for an initial badge, and each row flipped between `justify-center h-12`
  // and `gap-4 px-4 py-3`. So the container eased over 200ms while its
  // contents jumped at frame one — read as a snap, not a slide.
  //
  // Now nothing swaps. Every row keeps ONE layout in both states: a
  // fixed-width icon column plus a label that fades. The icon column is
  // exactly the width of the collapsed rail's content box, so an icon sits
  // dead-centre when narrow and doesn't shift by a single pixel when the rail
  // opens. The only things that move are the aside's width and the labels'
  // opacity.
  const ICON_COLUMN = "flex w-[72px] shrink-0 items-center justify-center text-xl";

  // Fades in slightly after the width starts opening so the text arrives into
  // space that already exists, and leaves immediately on close so it's gone
  // before the rail narrows over it.
  const labelClass = (isCollapsed) =>
    `min-w-0 flex-1 whitespace-nowrap font-medium transition-[opacity,transform] duration-200 ease-out ${
      isCollapsed
        ? "pointer-events-none -translate-x-2 opacity-0 delay-0"
        : "translate-x-0 opacity-100 delay-100"
    }`;

  const rowClass = (isActive) =>
    `group relative flex h-12 items-center rounded-xl transition-colors duration-200 ${
      isActive
        ? "active-menu bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 text-[#3FA34D] dark:text-[#43B75A] font-semibold"
        : "text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-[#1E241E] hover:text-[#1F2937] dark:hover:text-white"
    }`;

  const renderSidebarContent = (isCollapsed) => (
    <>
      {/* ===================== LOGO ===================== */}

      {/* The initial badge is always present and always in the icon column,
          so the header anchors to the same point as every menu row below it
          and the name simply fades in beside it. */}
      <div className="flex h-20 shrink-0 items-center border-b border-[#E7EAE1] dark:border-[#262B24]">
        <span className={ICON_COLUMN}>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/10 text-lg font-bold text-[#3FA34D] dark:text-[#43B75A]">
            {restaurantName.charAt(0).toUpperCase()}
          </span>
        </span>

        <div className={labelClass(isCollapsed)}>
          <h1 className="truncate text-1xl font-bold text-[#3FA34D] dark:text-[#43B75A]">
            {restaurantName}
          </h1>
          <p className="mt-0.5 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
            Management System
          </p>
        </div>
      </div>

      {/* ===================== MENU ===================== */}

      <div
        ref={menuRef}
        className="sidebar-scroll flex-1 overflow-y-auto py-4"
      >
        <nav className="space-y-1 px-0">
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
                  className={rowClass(false)}
                  // The label is the only thing naming the item while the rail
                  // is narrow, so it moves into the tooltip when hidden.
                  title={isCollapsed ? item.name : "Opens in a new tab"}
                >
                  <span className={ICON_COLUMN}>{item.icon}</span>

                  <span className={labelClass(isCollapsed)}>
                    <span className="flex items-center gap-2 pr-4">
                      {item.name}
                      <FiExternalLink className="text-sm opacity-60" />
                    </span>
                  </span>
                </a>
              );
            }

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                title={isCollapsed ? item.name : undefined}
                className={({ isActive }) => rowClass(isActive)}
              >
                {/* Shown in BOTH states now. Previously it appeared only when
                    expanded, so the active marker blinked into existence
                    every time the rail opened. */}
                {active && (
                  <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[#3FA34D] dark:bg-[#43B75A]" />
                )}

                <span className={ICON_COLUMN}>{item.icon}</span>

                <span className={labelClass(isCollapsed)}>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* ===================== LOGOUT ===================== */}

      <div className="shrink-0 border-t border-[#E7EAE1] dark:border-[#262B24] py-3">
        <button
          onClick={handleLogout}
          title={isCollapsed ? "Logout" : undefined}
          className="group flex h-12 w-full items-center rounded-xl text-[#6B7280] dark:text-[#9CA8A0] transition-colors duration-200 hover:bg-[#EF5350]/10 hover:text-[#EF5350]"
        >
          <span className={ICON_COLUMN}>
            <FiLogOut />
          </span>

          <span className={labelClass(isCollapsed)}>Logout</span>
        </button>
      </div>
    </>
  );

  // =====================================================
  // RETURN
  // =====================================================

  return (
    <>
      {/* Themed thin scrollbar for the menu list — replaces the default
          chunky white/gray browser scrollbar with something that matches
          the app's palette in both light and dark mode. Firefox uses the
          scrollbar-width/scrollbar-color properties; Chrome/Safari/Edge use
          the ::-webkit-scrollbar pseudo-elements. Rendered once here rather
          than inside the sidebar content, which is emitted twice (mobile
          drawer + desktop rail). */}
      <style>{`
        .sidebar-scroll {
          scrollbar-width: thin;
          scrollbar-color: #D8DED2 transparent;
        }
        .sidebar-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .sidebar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: #D8DED2;
          border-radius: 9999px;
        }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background-color: #C3CBBA;
        }
        .dark .sidebar-scroll {
          scrollbar-color: #262E22 transparent;
        }
        .dark .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: #262E22;
        }
        .dark .sidebar-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(67, 183, 90, 0.35);
        }

        /* Respect a reduced-motion preference: the rail still expands, it
           just doesn't animate its width. */
        @media (prefers-reduced-motion: reduce) {
          .app-sidebar-rail,
          .app-sidebar-rail * {
            transition: none !important;
          }
        }
      `}</style>

      {/* ================= MOBILE OVERLAY ================= */}

      {mobileOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 lg:hidden"
        />
      )}

      {/* ================= MOBILE / TABLET DRAWER =================
          Unchanged, and deliberately so: there is no hover on a touch
          screen, so the hamburger remains the only way in. It always renders
          fully expanded — a collapsed icon rail you can't hover would be a
          dead end. */}

      <aside
        className={`fixed top-0 left-0 h-full w-72 bg-white dark:bg-[#10140F] shadow-2xl z-50 flex flex-col transform transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="absolute top-5 right-5 z-10">
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="w-10 h-10 rounded-lg hover:bg-[#3FA34D]/10 dark:hover:bg-[#43B75A]/10 flex items-center justify-center text-[#1F2937] dark:text-white"
          >
            <FiX />
          </button>
        </div>

        {renderSidebarContent(false)}
      </aside>

      {/* ================= DESKTOP RAIL ================= */}

      <aside
        onMouseEnter={handlePointerEnter}
        onMouseLeave={handlePointerLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-expanded={expanded}
        // overflow-hidden stops labels wrapping mid-animation while the width
        // interpolates. The heavier shadow when expanded is what makes it read
        // as floating OVER the page — the layout underneath permanently
        // reserves only w-24, so nothing beneath the cursor shifts.
        // 300ms on a standard-decelerate curve. The previous 200ms linear-ish
        // ease-out was short enough that the width change read as a jump
        // rather than a movement. will-change keeps the animation off the
        // main thread's layout path on weaker tablet GPUs.
        style={{ willChange: "width" }}
        className={`app-sidebar-rail hidden lg:flex fixed top-0 left-0 h-screen overflow-hidden bg-white dark:bg-[#10140F] border-r border-[#E7EAE1] dark:border-[#262B24] flex-col transition-[width,box-shadow] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] z-30 ${
          expanded ? "w-72 shadow-2xl" : "w-24 shadow-none"
        }`}
      >
        {renderSidebarContent(!expanded)}
      </aside>
    </>
  );
};

export default Sidebar;