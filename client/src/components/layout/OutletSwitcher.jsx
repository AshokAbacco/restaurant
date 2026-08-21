// ==============================================
// src/components/layout/OutletSwitcher.jsx
// ==============================================
// Only renders anything when the logged-in account has more than one
// outlet (i.e. an OWNER/ADMIN on a multi-outlet organization) — see
// AuthContext's `outlets`, populated from /auth/me and from login. Every
// other role's `outlets` array has exactly one entry (their Employee's
// fixed home outlet), so this component is invisible for them, same as
// it's invisible for a single-outlet organization's owner.

import React, { useRef, useState } from "react";
import { FiMapPin, FiChevronDown, FiCheck } from "react-icons/fi";
import { useAuth } from "../../auth/AuthContext";

const useClickOutside = (onOutside) => {
  const ref = useRef(null);

  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onOutside();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);

  return ref;
};

const OutletSwitcher = () => {
  const { user, outlets, switchOutlet } = useAuth();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  // Nothing to switch between — render nothing rather than a disabled/
  // single-item dropdown, which would just be visual noise for the vast
  // majority of accounts (every non-OWNER/ADMIN role, and single-outlet
  // organizations).
  if (!outlets || outlets.length <= 1) return null;

  const currentOutletId = user?.outlet?.id;

  const handleSelect = async (outletId) => {
    if (outletId === currentOutletId || switching) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    // switchOutlet() reloads the page on success (see AuthContext) — no
    // need to setSwitching(false) or close the menu in the success path,
    // the whole app remounts. Only the failure path needs to reset local
    // state.
    const result = await switchOutlet(outletId);
    if (!result.success) {
      setSwitching(false);
      setOpen(false);
      // Minimal failure feedback — this action is rare enough (an owner
      // switching outlets) that a console warning plus staying put is a
      // reasonable bar; upgrade to a toast if this turns out to need more.
      console.error("Failed to switch outlet:", result.message);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={switching}
        className="flex items-center gap-2 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] px-3 py-2 text-sm font-medium text-[#1F2937] dark:text-white hover:border-[#3FA34D]/40 dark:hover:border-[#43B75A]/40 transition-colors disabled:opacity-60"
      >
        <FiMapPin className="text-[#3FA34D] dark:text-[#43B75A]" />
        <span className="hidden sm:inline max-w-[140px] truncate">
          {user?.outlet?.name || "Select outlet"}
        </span>
        <FiChevronDown
          className={`text-[#9CA3AF] dark:text-[#6B7280] transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] shadow-lg overflow-hidden">
          <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#6B7280] border-b border-[#E7EAE1] dark:border-[#262B24]">
            Switch outlet
          </div>
          {outlets.map((outlet) => (
            <button
              key={outlet.id}
              type="button"
              onClick={() => handleSelect(outlet.id)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm text-left text-[#1F2937] dark:text-white hover:bg-[#F3F5EE] dark:hover:bg-[#1D231D] transition-colors"
            >
              <span className="truncate">{outlet.name}</span>
              {outlet.id === currentOutletId && (
                <FiCheck className="text-[#3FA34D] dark:text-[#43B75A] shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default OutletSwitcher;