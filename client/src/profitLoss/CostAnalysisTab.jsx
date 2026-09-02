// ==============================================
// client/src/profitLoss/CostAnalysisTab.jsx
// ==============================================
import React, { useEffect, useState, useCallback } from "react";
import { FiAlertTriangle } from "react-icons/fi";
import {
  fetchFoodCost,
  fetchWastage,
  fetchInventoryCost,
} from "./profitLossService";
import {
  currency,
  SummaryCard,
  Loader,
  ErrorBanner,
  EmptyState,
  useDateRange,
  FilterBar,
} from "./profitLossUI";

const CostAnalysisTab = () => {
  const dateRange = useDateRange("month");
  const [store, setStore] = useState("");
  const [threshold, setThreshold] = useState(30);

  const [foodCost, setFoodCost] = useState(null);
  const [wastage, setWastage] = useState(null);
  const [inventoryCost, setInventoryCost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!dateRange.ready) return;
    setLoading(true);
    setError(null);

    const params = { ...dateRange.range, store: store || undefined };

    try {
      const [foodCostData, wastageData, inventoryData] = await Promise.all([
        fetchFoodCost({ ...params, thresholdPct: threshold }),
        fetchWastage(params),
        fetchInventoryCost(params),
      ]);
      setFoodCost(foodCostData);
      setWastage(wastageData);
      setInventoryCost(inventoryData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange.range, dateRange.ready, store, threshold]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <FilterBar
        dateRange={dateRange}
        store={store}
        setStore={setStore}
        extra={
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-[#9CA8A0]">
            <span>Food cost alert threshold</span>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-16 rounded-lg border border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-2 py-1.5 text-sm text-gray-700 dark:text-[#E4E9E2]"
            />
            <span>%</span>
          </div>
        }
      />
      <ErrorBanner message={error} />

      {loading ? (
        <Loader />
      ) : (
        <>
          {foodCost && (
            <div className="mb-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
                <SummaryCard
                  label="Food Cost %"
                  value={`${foodCost.foodCostPct}%`}
                  tone={foodCost.overThreshold ? "negative" : "positive"}
                />
                <SummaryCard
                  label="Total Revenue"
                  value={currency(foodCost.totalRevenue)}
                />
                <SummaryCard
                  label="Total COGS"
                  value={currency(foodCost.totalCogs)}
                  tone="negative"
                />
              </div>

              {foodCost.overThreshold && (
                <div className="flex items-center gap-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                  <FiAlertTriangle className="w-4 h-4 shrink-0" />
                  Food cost is above your {foodCost.thresholdPct}% threshold.
                </div>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5 mb-6">
            <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
              Food Cost % by Category
            </h2>
            {!foodCost || foodCost.byCategory.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {foodCost.byCategory.map((c) => (
                  <div
                    key={c.categoryId}
                    className="rounded-xl bg-gray-50 dark:bg-white/5 p-3"
                  >
                    <div className="text-xs text-gray-500 dark:text-[#9CA8A0] mb-1">
                      {c.categoryName}
                    </div>
                    <div className="text-lg font-semibold text-gray-800 dark:text-white">
                      {c.foodCostPct}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5 mb-6">
            <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
              Inventory Cost Analysis{" "}
              <span className="text-xs font-normal text-gray-400 dark:text-[#6B7280]">
                (estimate)
              </span>
            </h2>
            {inventoryCost && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <SummaryCard
                  label="Opening Stock Value"
                  value={currency(inventoryCost.openingStockValue)}
                />
                <SummaryCard
                  label="Purchases"
                  value={currency(inventoryCost.purchases)}
                />
                <SummaryCard
                  label="Closing Stock Value"
                  value={currency(inventoryCost.closingStockValue)}
                />
                <SummaryCard
                  label="Wastage Cost"
                  value={currency(inventoryCost.wastageCost)}
                  tone="negative"
                />
              </div>
            )}
            {inventoryCost?.note && (
              <p className="text-xs text-gray-400 dark:text-[#6B7280] mt-3">
                {inventoryCost.note}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5">
            <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
              Wastage Cost by Ingredient
            </h2>
            {!wastage || wastage.byIngredient.length === 0 ? (
              <EmptyState message="No wastage recorded for this period." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-[#9CA8A0] border-b border-gray-100 dark:border-[#262B24]">
                    <th className="py-2 pr-4 font-medium">Ingredient</th>
                    <th className="py-2 pr-4 font-medium">Quantity Wasted</th>
                    <th className="py-2 pr-4 font-medium">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {wastage.byIngredient.map((row) => (
                    <tr
                      key={row.ingredient}
                      className="border-b border-gray-50 dark:border-[#262B24] last:border-0"
                    >
                      <td className="py-2.5 pr-4 text-gray-700 dark:text-[#E4E9E2]">
                        {row.ingredient}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700 dark:text-[#E4E9E2]">
                        {row.quantity}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700 dark:text-[#E4E9E2]">
                        {currency(row.cost)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CostAnalysisTab;