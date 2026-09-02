// ==============================================
// client/src/profitLoss/CategoryItemProfitTab.jsx
// ==============================================
import React, { useEffect, useState, useCallback } from "react";
import { fetchCategoryProfit, fetchItemProfit } from "./profitLossService";
import {
  currency,
  Loader,
  ErrorBanner,
  EmptyState,
  useDateRange,
  FilterBar,
} from "./profitLossUI";

const Table = ({ columns, rows, rowKey }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 dark:text-[#9CA8A0] border-b border-gray-100 dark:border-[#262B24]">
          {columns.map((c) => (
            <th key={c.key} className="py-2 pr-4 font-medium">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={row[rowKey]}
            className="border-b border-gray-50 dark:border-[#262B24] last:border-0"
          >
            {columns.map((c) => (
              <td
                key={c.key}
                className="py-2.5 pr-4 text-gray-700 dark:text-[#E4E9E2]"
              >
                {c.render ? c.render(row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const CategoryItemProfitTab = () => {
  const dateRange = useDateRange("month");
  const [store, setStore] = useState("");
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!dateRange.ready) return;
    setLoading(true);
    setError(null);

    const params = { ...dateRange.range, store: store || undefined };

    try {
      const [categoryData, itemData] = await Promise.all([
        fetchCategoryProfit(params),
        fetchItemProfit(params),
      ]);
      setCategories(categoryData.categories);
      setItems(itemData.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [dateRange.range, dateRange.ready, store]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <FilterBar dateRange={dateRange} store={store} setStore={setStore} />
      <ErrorBanner message={error} />

      {loading ? (
        <Loader />
      ) : (
        <>
          <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5 mb-6">
            <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
              Category-wise Profit
            </h2>
            {categories.length === 0 ? (
              <EmptyState />
            ) : (
              <Table
                rowKey="categoryId"
                rows={categories}
                columns={[
                  { key: "categoryName", label: "Category" },
                  {
                    key: "revenue",
                    label: "Revenue",
                    render: (r) => currency(r.revenue),
                  },
                  {
                    key: "cost",
                    label: "Cost",
                    render: (r) => currency(r.cost),
                  },
                  {
                    key: "profit",
                    label: "Profit",
                    render: (r) => currency(r.profit),
                  },
                  {
                    key: "profitMarginPct",
                    label: "Margin %",
                    render: (r) => `${r.profitMarginPct}%`,
                  },
                ]}
              />
            )}
          </div>

          <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5">
            <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
              Item-wise Profit
            </h2>
            {items.length === 0 ? (
              <EmptyState />
            ) : (
              <Table
                rowKey="menuItemId"
                rows={items}
                columns={[
                  { key: "name", label: "Item" },
                  { key: "quantitySold", label: "Qty Sold" },
                  {
                    key: "revenue",
                    label: "Revenue",
                    render: (r) => currency(r.revenue),
                  },
                  {
                    key: "cost",
                    label: "Cost",
                    render: (r) => currency(r.cost),
                  },
                  {
                    key: "profit",
                    label: "Profit",
                    render: (r) => currency(r.profit),
                  },
                  {
                    key: "profitMarginPct",
                    label: "Margin %",
                    render: (r) => `${r.profitMarginPct}%`,
                  },
                ]}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CategoryItemProfitTab;