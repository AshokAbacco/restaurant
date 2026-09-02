// ==============================================
// client/src/profitLoss/ProfitLossLayout.jsx
// ==============================================

import React, { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import OverviewTab from "./OverviewTab";
import CategoryItemProfitTab from "./CategoryItemProfitTab";
import CostAnalysisTab from "./CostAnalysisTab";
import DiscountsRefundsTaxTab from "./DiscountsRefundsTaxTab";
import ReportsTab from "./ReportsTab";

const FULL_ACCESS_ROLES = ["OWNER", "ADMIN"];

const TABS = [
  {
    key: "overview",
    label: "Overview",
    Component: OverviewTab,
    fullAccessOnly: false,
  },
  {
    key: "profit-by-item",
    label: "Category & Item Profit",
    Component: CategoryItemProfitTab,
    fullAccessOnly: true,
  },
  {
    key: "cost-analysis",
    label: "Food Cost & Wastage",
    Component: CostAnalysisTab,
    fullAccessOnly: true,
  },
  {
    key: "discounts-refunds-tax",
    label: "Discounts, Refunds & Tax",
    Component: DiscountsRefundsTaxTab,
    fullAccessOnly: true,
  },
  {
    key: "reports",
    label: "Reports & Export",
    Component: ReportsTab,
    fullAccessOnly: true,
  },
];

const ProfitLossLayout = () => {
  const { user } = useAuth();
  const isFullAccess = FULL_ACCESS_ROLES.includes(user?.role);

  const visibleTabs = TABS.filter((tab) => !tab.fullAccessOnly || isFullAccess);

  const [activeKey, setActiveKey] = useState(visibleTabs[0]?.key ?? "overview");

  // Defensive: if the visible tab set shrinks (e.g. role resolves to
  // MANAGER after an initial render) and the active tab is no longer
  // visible, fall back to the first visible tab instead of rendering
  // nothing.
  useEffect(() => {
    if (!visibleTabs.some((t) => t.key === activeKey)) {
      setActiveKey(visibleTabs[0]?.key ?? "overview");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullAccess]);

  const activeTab =
    visibleTabs.find((t) => t.key === activeKey) || visibleTabs[0];
  const ActiveComponent = activeTab?.Component ?? OverviewTab;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#12160F]">
      <div className="border-b border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-6 lg:px-8 pt-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Profit &amp; Loss
        </h1>

        <nav className="flex flex-wrap gap-1 -mb-px">
          {visibleTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveKey(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab?.key === tab.key
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-[#9CA8A0] hover:text-gray-700 dark:hover:text-[#E4E9E2]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {!isFullAccess && (
          <p className="pb-3 text-xs text-gray-400 dark:text-[#6B7280]">
            You're viewing summary-level financials. Detailed cost, tax, and
            export tools are restricted to Owner/Admin accounts.
          </p>
        )}
      </div>

      <div className="p-6 lg:p-8">
        <ActiveComponent />
      </div>
    </div>
  );
};

export default ProfitLossLayout;