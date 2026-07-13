// client/src/expenses/components/ExpenseLayout.jsx
import { NavLink, Outlet } from "react-router-dom";
import { FiGrid, FiList, FiTag, FiBarChart2, FiHome, FiDollarSign } from "react-icons/fi";
import PageHeader from "../../components/layout/PageHeader";

const tabs = [
  { name: "Dashboard", path: "/expenses", end: true, icon: <FiGrid size={15} /> },
  { name: "Expenses", path: "/expenses/list", icon: <FiList size={15} /> },
  { name: "Categories", path: "/expenses/categories", icon: <FiTag size={15} /> },
  { name: "Stores", path: "/expenses/stores", icon: <FiHome size={15} /> },
  { name: "Reports", path: "/expenses/reports", icon: <FiBarChart2 size={15} /> },
];

const ExpenseLayout = () => {
  return (
    <div className="space-y-6 bg-[#F3F5EE] dark:bg-[#0D110C] min-h-screen -m-6 p-6 transition-colors">
      <PageHeader
        title="Expenses"
        subtitle="Track what the restaurant is spending, all in one place."
        icon={<FiDollarSign />}
      />

      {/* Tabs — same segmented-pill pattern as Menu Management, horizontally
          scrollable so all 5 tabs stay reachable on narrow screens */}
      <div className="bg-white dark:bg-[#171C17] rounded-2xl border border-[#E7EAE1] dark:border-[#262B24] shadow-sm shadow-black/[0.02] dark:shadow-none p-1.5 transition-colors">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((tab) => (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[#3FA34D] dark:bg-[#43B75A] text-white shadow-sm"
                    : "text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-[#1E241C] hover:text-[#1F2937] dark:hover:text-white"
                }`
              }
            >
              {tab.icon}
              {tab.name}
            </NavLink>
          ))}
        </div>
      </div>

      <Outlet />
    </div>
  );
};

export default ExpenseLayout;
