// ==============================================
// client/src/profitLoss/ReportsTab.jsx
// ==============================================
import React, { useState } from "react";
import { FiDownload, FiLoader } from "react-icons/fi";
import { downloadReport, fetchReportJSON } from "./profitLossService";
import {
  useDateRange,
  FilterBar,
  ErrorBanner,
  EmptyState,
} from "./profitLossUI";

const REPORT_TYPES = [
  { key: "daily", label: "Daily P&L Report" },
  { key: "weekly", label: "Weekly P&L Report" },
  { key: "monthly", label: "Monthly P&L Report" },
  { key: "annual", label: "Annual P&L Report" },
  { key: "food-cost", label: "Food Cost Report" },
  { key: "category-profit", label: "Category Profit Report" },
  { key: "item-profit", label: "Item Profit Report" },
  { key: "expense", label: "Expense Report" },
  { key: "revenue", label: "Revenue Report" },
  { key: "wastage-cost", label: "Wastage Cost Report" },
];

const FORMATS = [
  { key: "csv", label: "CSV" },
  { key: "excel", label: "Excel" },
  { key: "pdf", label: "PDF" },
];

const ReportsTab = () => {
  const dateRange = useDateRange("month");
  const [store, setStore] = useState("");
  const [reportType, setReportType] = useState("monthly");
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [error, setError] = useState(null);

  const params = {
    ...dateRange.range,
    store: store || undefined,
    type: reportType,
  };

  const handlePreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      const data = await fetchReportJSON(params);
      setPreview(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async (format) => {
    setDownloadingFormat(format);
    setError(null);
    try {
      await downloadReport({ ...params, format });
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div>
      <FilterBar
        dateRange={dateRange}
        store={store}
        setStore={setStore}
        extra={
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="rounded-lg border border-gray-200 dark:border-[#262B24] bg-white dark:bg-[#171C17] px-3 py-1.5 text-sm text-gray-700 dark:text-[#E4E9E2] dark:[color-scheme:dark]"
          >
            {REPORT_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        }
      />
      <ErrorBanner message={error} />

      <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24]  mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handlePreview}
            disabled={!dateRange.ready || loadingPreview}
            className="rounded-xl bg-gray-100 dark:bg-white/5 px-4 py-2 text-sm font-medium text-gray-700 dark:text-[#E4E9E2] hover:bg-gray-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
          >
            {loadingPreview ? "Loading preview..." : "Preview report"}
          </button>

          {FORMATS.map((f) => (
            <button
              key={f.key}
              onClick={() => handleDownload(f.key)}
              disabled={!dateRange.ready || downloadingFormat === f.key}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 dark:disabled:bg-white/10 dark:disabled:text-[#6B7280]"
            >
              {downloadingFormat === f.key ? (
                <FiLoader className="w-4 h-4 animate-spin" />
              ) : (
                <FiDownload className="w-4 h-4" />
              )}
              Export {f.label}
            </button>
          ))}
        </div>
      </div>

      {preview && (
        <div className="bg-white dark:bg-[#171C17] rounded-2xl shadow-sm border border-gray-100 dark:border-[#262B24] p-5">
          <h2 className="text-base font-semibold text-gray-700 dark:text-[#E4E9E2] mb-4">
            Preview
          </h2>
          <pre className="text-xs bg-gray-50 dark:bg-white/5 rounded-xl p-4 overflow-x-auto text-gray-600 dark:text-[#9CA8A0]">
            {JSON.stringify(preview, null, 2)}
          </pre>
        </div>
      )}

      {!preview && (
        <EmptyState message="Generate a preview or export a file to get started." />
      )}
    </div>
  );
};

export default ReportsTab;