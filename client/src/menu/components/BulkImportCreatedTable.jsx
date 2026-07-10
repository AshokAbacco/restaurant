import React, { useMemo, useState } from "react";
import { FiRefreshCw, FiSearch } from "react-icons/fi";
import { ui } from "../menuTheme";

const BulkImportUpdatedTable = ({ data = [] }) => {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
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
      <div className={`${ui.card} py-20 text-center`}>
        <FiRefreshCw
          size={48}
          className="mx-auto text-amber-500 mb-4"
        />

        <h3 className={`text-lg font-semibold ${ui.heading}`}>
          No Updated Menu Items
        </h3>

        <p className={`mt-2 ${ui.faint}`}>
          No existing menu items were updated.
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
            type="text"
            placeholder="Search updated items..."
            className={`${ui.input} pl-10`}
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
                SKU
              </th>

              <th className="text-left px-4 py-3">
                Item Name
              </th>

              <th className="text-left px-4 py-3">
                Category
              </th>

              <th className="text-left px-4 py-3">
                Updated Fields
              </th>

              <th className="text-right px-4 py-3">
                Price
              </th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((item, index) => (
              <tr
                key={index}
                className="border-b border-[#E7EAE1] dark:border-[#262B24] hover:bg-[#F8FAF6] dark:hover:bg-[#1D231C]"
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
                    {(item.updatedFields || []).length === 0 ? (
                      <span
                        className={`${ui.badgeAmber} text-xs`}
                      >
                        Updated
                      </span>
                    ) : (
                      item.updatedFields.map((field) => (
                        <span
                          key={field}
                          className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                        >
                          {field}
                        </span>
                      ))
                    )}
                  </div>
                </td>

                <td className="px-4 py-3 text-right">
                  ₹
                  {Number(
                    item.sellingPrice || 0
                  ).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}

      <div className="px-4 py-3 border-t border-[#E7EAE1] dark:border-[#262B24] text-sm">
        <span className={ui.faint}>
          Showing {filtered.length} of {data.length} updated
          records
        </span>
      </div>
    </div>
  );
};

export default BulkImportUpdatedTable;