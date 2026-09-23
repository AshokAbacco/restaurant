// src/crm/components/CrmTabs.jsx
import { NavLink } from "react-router-dom";
import { useCrm } from "../CrmContext";

const TABS = [
  { to: "/crm", label: "Overview", end: true },
  { to: "/crm/customers", label: "Customers" },
  { to: "/crm/follow-ups", label: "Follow-ups & feedback" },
  { to: "/crm/loyalty", label: "Loyalty", requiresLoyalty: true },
  // { to: "/crm/groups", label: "Groups" },
];

export default function CrmTabs() {
  const { loyalty } = useCrm();
  // The Loyalty tab appears only while Settings -> Loyalty is on.
  const tabs = TABS.filter((t) => !t.requiresLoyalty || loyalty?.enabled);

  return (
    <nav className="mb-5 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-[#E7EAE1] dark:border-[#262B24]">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${
              isActive
                ? "border-[#3FA34D] text-[#3FA34D] dark:border-[#43B75A] dark:text-[#43B75A]"
                : "border-transparent text-[#6B7280] hover:text-[#1F2937] dark:text-[#9CA8A0] dark:hover:text-white"
            }`
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}