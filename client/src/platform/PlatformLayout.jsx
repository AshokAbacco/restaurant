// ==============================================
// client/src/platform/PlatformLayout.jsx
// Shell for /platform/*: grouped sidebar, top bar, live badges.
// ==============================================

import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import {
  FiGrid,
  FiHome,
  FiRefreshCw,
  FiMessageSquare,
  FiCheckSquare,
  FiLayers,
  FiCreditCard,
  FiActivity,
  FiZap,
  FiMail,
  FiUsers,
  FiSettings,
  FiHeart,
  FiBarChart2,
  FiMenu,
  FiX,
  FiLogOut,
  FiUser,
} from "react-icons/fi";
import { usePlatformAuth } from "./PlatformAuth";
import { api } from "./api";
import { Avatar, cx, titleCase } from "./ui";

export const NAV = [
  {
    group: "Overview",
    items: [
      { to: "/platform/dashboard", label: "Dashboard", icon: FiGrid, perm: "dashboard.read" },
      { to: "/platform/restaurants", label: "Restaurants", icon: FiHome, perm: "restaurants.read" },
      { to: "/platform/renewals", label: "Renewals & plans", icon: FiRefreshCw, perm: "renewals.read", badge: "expiring" },
      { to: "/platform/messages", label: "Messages", icon: FiMessageSquare, perm: "messages.read", badge: "unread" },
      { to: "/platform/follow-ups", label: "Follow-ups", icon: FiCheckSquare, perm: "followups.read", badge: "followUps" },
    ],
  },
  {
    group: "Money & records",
    items: [
      { to: "/platform/plans", label: "Plans", icon: FiLayers, perm: "plans.read" },
      { to: "/platform/payments", label: "Payments", icon: FiCreditCard, perm: "payments.read" },
      { to: "/platform/activity", label: "Activity log", icon: FiActivity, perm: "activity.read" },
      { to: "/platform/webhooks", label: "Webhooks", icon: FiZap, perm: "webhooks.read", badge: "webhooks" },
      { to: "/platform/enquiries", label: "Website enquiries", icon: FiMail, perm: "enquiries.read", badge: "enquiries" },
    ],
  },
  {
    group: "Admin",
    items: [
      { to: "/platform/team", label: "Platform team", icon: FiUsers, perm: "team.read" },
      { to: "/platform/health", label: "System health", icon: FiHeart, perm: "health.read", badge: "errors" },
      { to: "/platform/reports", label: "Reports", icon: FiBarChart2, perm: "reports.read" },
      { to: "/platform/settings", label: "Settings", icon: FiSettings, perm: "settings.read" },
    ],
  },
];

export const firstAllowedPath = (admin) => {
  for (const g of NAV) for (const i of g.items) if (admin?.permissions?.includes(i.perm)) return i.to;
  return "/platform/account";
};

function Sidebar({ admin, badges, onNavigate }) {
  return (
    <nav className="flex h-full flex-col">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3FA34D] text-sm font-black text-white">P</div>
        <div className="leading-tight">
          <p className="text-sm font-bold text-white">Platform Admin</p>
          <p className="text-[11px] text-white/45">Restaurant ERP control</p>
        </div>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((g) => {
          const items = g.items.filter((i) => admin?.permissions?.includes(i.perm));
          if (!items.length) return null;
          return (
            <div key={g.group}>
              <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/35">{g.group}</p>
              <div className="space-y-0.5">
                {items.map((i) => {
                  const count = i.badge ? badges[i.badge] : 0;
                  return (
                    <NavLink
                      key={i.to}
                      to={i.to}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cx(
                          "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition",
                          isActive ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
                        )
                      }
                    >
                      <i.icon className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{i.label}</span>
                      {count > 0 && (
                        <span className={cx("rounded-full px-1.5 py-px text-[10px] font-bold", i.badge === "errors" || i.badge === "webhooks" ? "bg-rose-500 text-white" : "bg-[#3FA34D] text-white")}>
                          {count > 99 ? "99+" : count}
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <NavLink
        to="/platform/account"
        onClick={onNavigate}
        className="m-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 hover:bg-white/10"
      >
        <Avatar name={admin?.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">{admin?.name}</p>
          <p className="truncate text-[11px] text-white/45">{titleCase(admin?.role)}</p>
        </div>
        <FiUser className="h-4 w-4 text-white/40" />
      </NavLink>
    </nav>
  );
}

export default function PlatformLayout() {
  const { admin, logout } = usePlatformAuth();
  const [open, setOpen] = useState(false);
  const [badges, setBadges] = useState({});
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .get("/badges")
        .then((d) => alive && setBadges(d.badges || {}))
        .catch(() => {});
    load();
    const t = setInterval(load, 30000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [location.pathname]);

  useEffect(() => {
    document.title = "Platform Admin";
  }, []);

  return (
    <div className="flex min-h-screen bg-[#F6F7F4] font-sans text-slate-800">
      <Toaster position="top-right" toastOptions={{ style: { fontSize: 13, borderRadius: 12 } }} />
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 bg-[#0F1712] lg:block">
        <Sidebar admin={admin} badges={badges} />
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 flex lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-64 bg-[#0F1712]" onClick={(e) => e.stopPropagation()}>
            <Sidebar admin={admin} badges={badges} onNavigate={() => setOpen(false)} />
          </div>
          <div className="flex-1 bg-black/40" />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b border-[#E7EAE1] bg-white/85 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-2">
            <button className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)}>
              {open ? <FiX /> : <FiMenu />}
            </button>
            <span className="hidden text-xs font-medium text-slate-400 sm:block">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {admin?.permissions?.includes("messages.read") && (
              <button onClick={() => navigate("/platform/messages")} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Messages">
                <FiMessageSquare className="h-[18px] w-[18px]" />
                {badges.unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500" />}
              </button>
            )}
            <button
              onClick={() => {
                logout();
                navigate("/platform/login");
              }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <FiLogOut /> Sign out
            </button>
          </div>
        </header>
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
