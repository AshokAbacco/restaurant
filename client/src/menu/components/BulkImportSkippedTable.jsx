import React, { useMemo, useState } from "react";
import {
  FiAlertTriangle,
  FiSearch,
  FiAlertCircle,
} from "react-icons/fi";
import { ui } from "../menuTheme";

const BulkImportSkippedTable = ({ data = [] }) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;

    return data.filter((item) =>
      [
        item.row,
        item.sku,
        item.name,
        item.reason,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [search, data]);

  if (data.length === 0) {
    return (
      <div className={`${ui.card} py-20 text-center`}>
        <FiAlertTriangle
          size={48}
          className="mx-auto text-green-500 mb-4"
        />

        <h3 className={`text-lg font-semibold ${ui.heading}`}>
          No Skipped Records
        </h3>

        <p className={`mt-2 ${ui.faint}`}>
          Every row in the file was processed successfully.
        </p>
      </div>
    );
  }

  return (
    <div className={ui.card}>
      {/* Search */}

      <div className="p-4 border-b border-[#E7EAE1] dark:border-[#262B24]">
        <div className="relative max-w-sm">
          <FiSearch
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${ui.faint}`}
          />

          <input
            className={`${ui.input} pl-10`}
            placeholder="Search skipped rows..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>
      </div>

      {/* Table */}

      <div className="overflow-auto max-h-[450px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F3F5EE] dark:bg-[#1A1F19] border-b border-[#E7EAE1] dark:border-[#262B24]">

              <th className="text-left px-4 py-3">
                Row
              </th>

              <th className="text-left px-4 py-3">
                SKU
              </th>

              <th className="text-left px-4 py-3">
                Item
              </th>

              <th className="text-left px-4 py-3">
                Error
              </th>

            </tr>
          </thead>

          <tbody>
            {filtered.map((item, index) => (
              <tr
                key={index}
                className="border-b border-[#E7EAE1] dark:border-[#262B24] hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <td className="px-4 py-3 font-medium">
                  {item.row}
                </td>

                <td className="px-4 py-3">
                  {item.sku || "-"}
                </td>

                <td className="px-4 py-3">
                  {item.name || "-"}
                </td>

                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <FiAlertCircle
                      className="text-red-500 mt-0.5 flex-shrink-0"
                      size={16}
                    />

                    <span className="text-red-600 dark:text-red-400">
                      {item.reason}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}

      <div className="px-4 py-3 border-t border-[#E7EAE1] dark:border-[#262B24] flex items-center justify-between">

        <span className={ui.faint}>
          {filtered.length} skipped record
          {filtered.length !== 1 ? "s" : ""}
        </span>

        <span className="text-red-500 text-sm font-medium">
          Fix these rows and import again
        </span>

      </div>
    </div>
  );
};

export default BulkImportSkippedTable;