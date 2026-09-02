// ==============================================
// client/src/profitLoss/DiscountsRefundsTaxTab.jsx
// ==============================================
import React, { useEffect, useState, useCallback } from "react";
import { fetchDiscounts, fetchRefunds, fetchTax } from "./profitLossService";
import {
  currency,
  SummaryCard,
  Loader,
  ErrorBanner,
  EmptyState,
  useDateRange,
  FilterBar,
} from "./profitLossUI";

const DiscountsRefundsTaxTab = () => {
  const dateRange = useDateRange("month");
  const [store, setStore] = useState("");

  const [discounts, setDiscounts] = useState(null);
  const [refunds, setRefunds] = useState(null);
  const [tax, setTax] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!dateRange.ready) return;
    setLoading(true);
    setError(null);

    const params = { ...dateRange.range, store: store || undefined };

    try {
      const [discountData, refundData, taxData] = await Promise.all([
        fetchDiscounts(params),
        fetchRefunds(params),
        fetchTax(params),
      ]);
      setDiscounts(discountData);
      setRefunds(refundData);
      setTax(taxData);
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
        <div className="space-y-6">
          {/* Discounts */}
          <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5">
            <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
              Discount Impact
            </h2>
            {discounts && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <SummaryCard
                  label="Total Discounts"
                  value={currency(discounts.totalDiscounts)}
                  tone="negative"
                />
                <SummaryCard
                  label="Coupons Used"
                  value={discounts.couponsUsed}
                />
                <SummaryCard
                  label="Revenue Lost"
                  value={currency(discounts.revenueLost)}
                  tone="negative"
                />
              </div>
            )}
            {!discounts || discounts.byType.length === 0 ? (
              <EmptyState message="No discounts applied for this period." />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {discounts.byType.map((d) => (
                  <div
                    key={d.type}
                    className="rounded-xl bg-gray-50 dark:bg-white/5 p-3"
                  >
                    <div className="text-xs text-gray-500 dark:text-[#9CA8A0] mb-1">
                      {d.type.replace("_", " ")}
                    </div>
                    <div className="text-base font-semibold text-gray-800 dark:text-white">
                      {currency(d.amount)}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-[#6B7280]">
                      {d.count} applied
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Refunds */}
          <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5">
            <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
              Refund Analysis
            </h2>
            {refunds && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <SummaryCard
                  label="Refund Amount"
                  value={currency(refunds.refundAmount)}
                  tone="negative"
                />
                <SummaryCard label="Refund Count" value={refunds.refundCount} />
              </div>
            )}
            {!refunds || refunds.byReason.length === 0 ? (
              <EmptyState message="No refunds recorded for this period." />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 dark:text-[#9CA8A0] border-b border-gray-100 dark:border-[#262B24]">
                    <th className="py-2 pr-4 font-medium">Reason</th>
                    <th className="py-2 pr-4 font-medium">Count</th>
                    <th className="py-2 pr-4 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.byReason.map((r) => (
                    <tr
                      key={r.reason}
                      className="border-b border-gray-50 dark:border-[#262B24] last:border-0"
                    >
                      <td className="py-2.5 pr-4 text-gray-700 dark:text-[#E4E9E2]">
                        {r.reason}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700 dark:text-[#E4E9E2]">
                        {r.count}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-700 dark:text-[#E4E9E2]">
                        {currency(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {refunds?.note && (
              <p className="text-xs text-gray-400 dark:text-[#6B7280] mt-3">
                {refunds.note}
              </p>
            )}
          </div>

          {/* Tax */}
          <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5">
            <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
              Tax Analysis
            </h2>
            {tax && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <SummaryCard
                  label="GST Collected"
                  value={currency(tax.gstCollected)}
                  tone="positive"
                />
                <SummaryCard
                  label="GST Paid"
                  value={currency(tax.gstPaid)}
                  tone="negative"
                />
                <SummaryCard
                  label="Tax Liability"
                  value={currency(tax.taxLiability)}
                  tone={tax.taxLiability >= 0 ? "neutral" : "positive"}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountsRefundsTaxTab;