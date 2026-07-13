import React, { useMemo, useState } from "react";
import {
  FiCheckCircle,
  FiRefreshCw,
  FiAlertTriangle,
  FiList,
  FiDownload,
  FiX,
} from "react-icons/fi";

import { ui } from "../menuTheme";

import BulkImportSummary from "./BulkImportSummary";
import BulkImportCreatedTable from "./BulkImportCreatedTable";
import BulkImportUpdatedTable from "./BulkImportUpdatedTable";
import BulkImportSkippedTable from "./BulkImportSkippedTable";
import BulkImportErrorDownload from "./BulkImportErrorDownload";

const tabs = [
  {
    id: "summary",
    label: "Summary",
    icon: FiList,
  },
  {
    id: "created",
    label: "Created",
    icon: FiCheckCircle,
  },
  {
    id: "updated",
    label: "Updated",
    icon: FiRefreshCw,
  },
  {
    id: "skipped",
    label: "Skipped",
    icon: FiAlertTriangle,
  },
];

const BulkImportModal = ({
  open,
  result,
  importing = false,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState("summary");

  const summary = useMemo(() => {
    if (result?.summary) {
      return {
        total: result.summary.totalRows,
        created: result.summary.created,
        updated: result.summary.updated,
        skipped: result.summary.skipped,
      };
    }

    return {
      total:
        (result?.created?.length || 0) +
        (result?.updated?.length || 0) +
        (result?.skipped?.length || 0),
      created: result?.created?.length || 0,
      updated: result?.updated?.length || 0,
      skipped: result?.skipped?.length || 0,
    };
  }, [result]);

  if (!open) return null;

  const renderContent = () => {
    switch (activeTab) {
      case "created":
        return (
          <BulkImportCreatedTable
            data={result?.created || []}
          />
        );

      case "updated":
        return (
          <BulkImportUpdatedTable
            data={result?.updated || []}
          />
        );

      case "skipped":
        return (
          <BulkImportSkippedTable
            data={result?.skipped || []}
          />
        );

      default:
        return (
          <BulkImportSummary
            summary={summary}
          />
        );
    }
  };

  return (
    <div className={ui.modalOverlay}>
      <div
        className={`${ui.modalCard} max-w-6xl w-full h-[88vh]`}
      >
        {/* Header */}

        <div className={ui.modalHeader}>
          <div>
            <h2
              className={`text-xl font-semibold ${ui.heading}`}
            >
              Bulk Import Results
            </h2>

            <p className={`text-sm ${ui.muted}`}>
              Review imported menu items before closing.
            </p>
          </div>

          {!importing && (
            <button
              onClick={onClose}
              className={`${ui.faint} hover:text-red-500 transition`}
            >
              <FiX size={22} />
            </button>
          )}
        </div>

        {/* Summary Cards */}

        <div className="px-6 pt-5">
          <BulkImportSummary summary={summary} />
        </div>

        {/* Tabs */}

        <div className="px-6 mt-5 border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
          <div className="flex gap-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.id}
                  onClick={() =>
                    setActiveTab(tab.id)
                  }
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2 ${
                    activeTab === tab.id
                      ? "border-[#3FA34D] text-[#3FA34D]"
                      : "border-transparent text-gray-500 hover:text-[#3FA34D]"
                  }`}
                >
                  <Icon size={15} />

                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}

        <div className="flex-1 overflow-auto px-6 py-5">
          {renderContent()}
        </div>

        {/* Footer */}

        <div className={ui.modalFooter}>
          <BulkImportErrorDownload
            skipped={result?.skipped || []}
          />

          <button
            onClick={onClose}
            className={ui.btnPrimary}
            disabled={importing}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkImportModal;