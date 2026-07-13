import React, { useMemo, useState } from "react";
import { FiRefreshCw, FiSearch } from "react-icons/fi";
import { ui } from "../menuTheme";

const BulkImportUpdatedTable = ({ data = [] }) => {
  const [search, setSearch] = useState("");

  const filteredData = useMemo(() => {
    if (!search.trim()) return data;

    return data.filter((item) =>
      [
        item.sku,
        item.name,
        item.categoryName,
        ...(item.updatedFields || []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [search, data]);

  if (data.length === 0) {
    return (
      <div className={`${ui.card} p-12 text-center`}>
        <FiRefreshCw
          size={50}
          className="mx-auto mb-4 text-amber-500"
        />

        <h3 className={`text-lg font-semibold ${ui.heading}`}>
          No Updated Records
        </h3>

        <p className={`mt-2 ${ui.faint}`}>
          No existing menu items were updated during this import.
        </p>
      </div>
    );
  }

  return (
    <div className={ui.card}>
      {/* Search */}
      <div className="p-4 border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
        <div className="relative max-w-sm">
          <FiSearch
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${ui.faint}`}
          />

          <input
            type="text"
            placeholder="Search updated items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={`${ui.input} pl-10`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto max-h-[450px]">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#F3F5EE] dark:bg-[#1A1F19] border-b border-[#E5E7EB] dark:border-[#2A2A2A]">
              <th className="px-4 py-3 text-left">SKU</th>
              <th className="px-4 py-3 text-left">Item Name</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Updated Fields</th>
              <th className="px-4 py-3 text-right">Price</th>
            </tr>
          </thead>

          <tbody>
            {filteredData.map((item, index) => (
              <tr
                key={index}
                className="border-b border-[#E5E7EB] dark:border-[#2A2A2A] hover:bg-[#F8FAF6] dark:hover:bg-[#1F241E]"
              >
                <td className="px-4 py-3 font-medium">
                  {item.sku}
                </td>

                <td className="px-4 py-3">
                  {item.name}
                </td>

                <td className="px-4 py-3">
                  {item.categoryName}
                </td>

                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {(item.updatedFields || []).length ? (
                      item.updatedFields.map((field) => (
                        <span
                          key={field}
                          className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        >
                          {field}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        Updated
                      </span>
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 text-right font-medium">
                  ₹{Number(item.sellingPrice || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#E5E7EB] dark:border-[#2A2A2A] flex justify-between items-center">
        <span className={ui.faint}>
          Showing {filteredData.length} of {data.length} updated records
        </span>

        <span className="text-amber-600 dark:text-amber-400 text-sm font-medium">
          Existing menu items updated successfully
        </span>
      </div>
    </div>
  );
};

export default BulkImportUpdatedTable;