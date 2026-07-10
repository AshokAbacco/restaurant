import React from "react";
import { FiDownload } from "react-icons/fi";
import { ui } from "../menuTheme";

const BulkImportErrorDownload = ({ skipped = [] }) => {
  const handleDownload = () => {
    if (!skipped.length) return;

    const headers = [
      "Row",
      "SKU",
      "Item Name",
      "Reason",
    ];

    const rows = skipped.map((item) => [
      item.row ?? "",
      item.sku ?? "",
      item.name ?? "",
      item.reason ?? "",
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) =>
        row
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = window.URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;
    link.download = `menu-import-errors-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    document.body.appendChild(link);

    link.click();

    document.body.removeChild(link);

    window.URL.revokeObjectURL(url);
  };

  if (!skipped.length) {
    return (
      <button
        disabled
        className={`${ui.btnSecondary} opacity-50 cursor-not-allowed`}
      >
        <FiDownload />
        No Errors
      </button>
    );
  }

  return (
    <button
      onClick={handleDownload}
      className={ui.btnSecondary}
    >
      <FiDownload />

      Download Error Report
    </button>
  );
};

export default BulkImportErrorDownload;