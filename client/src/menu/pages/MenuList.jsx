// client/src/menu/pages/MenuList.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  FiPlus,
  FiSearch,
  FiUpload,
  FiDownload,
  FiSliders,
  FiClock,
  FiInfo,
  FiFileText,
} from "react-icons/fi";
import { useAuth } from "../../auth/AuthContext";
import MenuItemFormModal from "../components/MenuItemFormModal";
import ItemExtrasModal from "../components/ItemExtrasModal";
import DeleteItemConfirmModal from "../components/DeleteItemConfirmModal";
import BulkImportModal from "../components/BulkImportModal";
import { ui } from "../menuTheme";
import { Spinner, ErrorBanner, EmptyState } from "../MenuUI";
import {
  fetchMenuItems,
  fetchCategories,
  fetchSubCategories,
  fetchKitchenSections,
  fetchAddOns,
  importMenuCsv,
  exportMenuCsv,
} from "../menuApi";
import { WifiOff } from "lucide-react";
import { fetchWithOfflineFallbackResult } from "../../offline/offlineCache";

const FoodTypeDot = ({ foodType }) => {
  const border =
    foodType === "VEG"
      ? "border-[#3FA34D]"
      : foodType === "EGG"
        ? "border-[#E8873A]"
        : "border-[#EF5350]";
  const dot =
    foodType === "VEG"
      ? "bg-[#3FA34D]"
      : foodType === "EGG"
        ? "bg-[#E8873A]"
        : "bg-[#EF5350]";
  return (
    <span
      className={`inline-flex items-center justify-center w-4 h-4 border-2 ${border} rounded-sm flex-shrink-0`}
      title={foodType.replace("_", "-")}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
    </span>
  );
};

const StatusPill = ({ status }) => {
  const styles = {
    ACTIVE: ui.badgeGreen,
    OUT_OF_STOCK: ui.badgeAmber,
    INACTIVE: ui.badgeGray,
    DELETED: ui.badgeRed,
  };
  const labels = {
    ACTIVE: "Active",
    OUT_OF_STOCK: "Out of Stock",
    INACTIVE: "Inactive",
    DELETED: "Deleted",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}
    >
      {labels[status] || status}
    </span>
  );
};

const MenuList = () => {
  const { canManageMenu, canDeleteMenuItems } = useAuth();
  const canManage = canManageMenu();
  const canDelete = canDeleteMenuItems();

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [kitchenSections, setKitchenSections] = useState([]);
  const [allSubCategories, setAllSubCategories] = useState([]);
  const [allAddOns, setAllAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [subCategoryFilter, setSubCategoryFilter] = useState("");
  const [kitchenSectionFilter, setKitchenSectionFilter] = useState("");
  const [foodTypeFilter, setFoodTypeFilter] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deletingItem, setDeletingItem] = useState(null);
  const [extrasItem, setExtrasItem] = useState(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showImportHelp, setShowImportHelp] = useState(false);
  const [showImportResult, setShowImportResult] = useState(false);

  const [importResult, setImportResult] = useState({
    created: [],
    updated: [],
    skipped: [],
  });
  const [isOffline, setIsOffline] = useState(false);

  // Read-only offline browsing — create/update/delete/import/export stay
  // online-only. The item list's cache key encodes every active filter,
  // since a different filter combination is a genuinely different result
  // set — offline browsing here only works for filter combinations
  // someone already viewed once while online (same honest limitation as
  // the POS MenuBrowser's cache — see its file for the same caveat). The
  // four supporting lists (categories/kitchen sections/sub-categories/
  // add-ons) reuse the SAME cache keys as their own dedicated admin pages,
  // so browsing either warms the cache for the other.
  const loadData = async () => {
    setLoading(true);
    setError("");

    const itemsCacheKey = `menuAdmin:items:${JSON.stringify({
      search,
      categoryFilter,
      subCategoryFilter,
      kitchenSectionFilter,
      foodTypeFilter,
      availabilityFilter,
    })}`;

    const [itemsR, catR, kitR, subR, addR] = await Promise.allSettled([
      fetchWithOfflineFallbackResult(itemsCacheKey, () =>
        fetchMenuItems({
          ...(search ? { search } : {}),
          ...(categoryFilter ? { categoryId: categoryFilter } : {}),
          ...(subCategoryFilter ? { subCategoryId: subCategoryFilter } : {}),
          ...(kitchenSectionFilter
            ? { kitchenSectionId: kitchenSectionFilter }
            : {}),
          ...(foodTypeFilter ? { foodType: foodTypeFilter } : {}),
          ...(availabilityFilter !== ""
            ? { isAvailable: availabilityFilter }
            : {}),
        }),
      ),
      fetchWithOfflineFallbackResult("menuAdmin:categories", fetchCategories),
      fetchWithOfflineFallbackResult(
        "menuAdmin:kitchenSections",
        fetchKitchenSections,
      ),
      fetchWithOfflineFallbackResult(
        "menuAdmin:subcategories",
        fetchSubCategories,
      ),
      fetchWithOfflineFallbackResult("menuAdmin:addons", fetchAddOns),
    ]);

    let offline = false;
    const wasFromCache = (r) => r.status === "fulfilled" && r.value.fromCache;

    if (itemsR.status === "fulfilled") {
      setItems(itemsR.value.data.data || []);
    } else {
      setError(itemsR.reason?.message || "Failed to load menu items");
    }
    if (catR.status === "fulfilled") setCategories(catR.value.data.data || []);
    if (kitR.status === "fulfilled")
      setKitchenSections(kitR.value.data.data || []);
    if (subR.status === "fulfilled")
      setAllSubCategories(subR.value.data.data || []);
    if (addR.status === "fulfilled") setAllAddOns(addR.value.data.data || []);

    if ([itemsR, catR, kitR, subR, addR].some(wasFromCache)) offline = true;
    setIsOffline(offline);
    setLoading(false);
  };

  useEffect(() => {
    loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [
    categoryFilter,
    subCategoryFilter,
    kitchenSectionFilter,
    foodTypeFilter,
    availabilityFilter,
  ]);
  useEffect(() => {
    const t = setTimeout(loadData, 400);
    return () =>
      clearTimeout(
        t,
      ); /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [search]);

  const handleAdd = () => {
    setEditingItem(null);
    setFormOpen(true);
  };
  const handleEdit = (item) => {
    setEditingItem(item);
    setFormOpen(true);
  };
  const handleFormSaved = () => {
    setFormOpen(false);
    setEditingItem(null);
    loadData();
  };
  const handleDeleteConfirmed = () => {
    setDeletingItem(null);
    loadData();
  };

  const categoryOptions = useMemo(
    () => [{ id: "", name: "All Categories" }, ...categories],
    [categories],
  );
  const subCategoryOptions = useMemo(
    () => [{ id: "", name: "All Sub Categories" }, ...allSubCategories],
    [allSubCategories],
  );
  const kitchenSectionOptions = useMemo(
    () => [{ id: "", name: "All Kitchen Sections" }, ...kitchenSections],
    [kitchenSections],
  );

  const handleImportClick = () =>
    document.getElementById("menu-csv-import-input")?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setImporting(true);

    const result = await importMenuCsv(file);

    setImporting(false);

    e.target.value = "";

    if (!result.ok) {
      alert(result.data?.message || "Import failed");
      return;
    }

    setImportResult(
      result.data.data || {
        created: [],
        updated: [],
        skipped: [],
      },
    );

    setShowImportResult(true);

    loadData();
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportMenuCsv();
    setExporting(false);
    if (!result.ok) {
      alert(result.data?.message || "Export failed");
      return;
    }
    const url = window.URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu-export.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadSample = () => {
    const headers = [
      "name",
      "sku",
      "categoryName",
      "sellingPrice",
      "costPrice",
      "gstPercent",
      "foodType",
      "description",
    ];
    const sampleRows = [
      [
        "Chicken Biryani",
        "BIR-001",
        "Biryani",
        "320",
        "150",
        "5",
        "NON_VEG",
        "Fragrant basmati rice with spiced chicken",
      ],
      [
        "Veg Manchurian",
        "CHI-001",
        "Chinese",
        "220",
        "90",
        "5",
        "VEG",
        "Crispy vegetable balls in tangy sauce",
      ],
      [
        "Cold Coffee",
        "BEV-001",
        "Beverages",
        "130",
        "45",
        "12",
        "VEG",
        "Chilled coffee blended with ice cream",
      ],
    ];
    const csv = [
      headers.join(","),
      ...sampleRows.map((r) => r.map((v) => `"${v}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "menu-import-sample.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Bulk Import/Export panel */}
      {(canManage || canDelete) && (
        <div className={`${ui.card} p-4`}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className={`text-sm font-semibold ${ui.heading}`}>
                Bulk Import / Export
              </h3>
              <p className={`text-xs ${ui.faint} mt-0.5`}>
                Update many items at once using a CSV file
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImportHelp(!showImportHelp)}
                className={`inline-flex items-center gap-1.5 ${ui.linkEdit} text-sm`}
              >
                <FiInfo size={14} />{" "}
                {showImportHelp
                  ? "Hide format guide"
                  : "How do I format the file?"}
              </button>
              <input
                id="menu-csv-import-input"
                type="file"
                accept=".csv"
                onChange={handleImportFile}
                className="hidden"
              />
              {canDelete && (
                <button
                  onClick={handleImportClick}
                  disabled={importing}
                  className={`${ui.btnSecondary} text-sm`}
                >
                  <FiUpload size={14} />{" "}
                  {importing ? "Importing..." : "Bulk Import"}
                </button>
              )}
              {canManage && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className={`${ui.btnSecondary} text-sm`}
                >
                  <FiDownload size={14} />{" "}
                  {exporting ? "Exporting..." : "Export CSV"}
                </button>
              )}
            </div>
          </div>
          {showImportHelp && (
            <div className="mt-3 bg-[#3FA34D]/5 dark:bg-[#43B75A]/10 border border-[#3FA34D]/20 dark:border-[#43B75A]/25 rounded-xl px-4 py-4 text-xs text-[#1F2937] dark:text-white">
              <div className="flex items-center justify-between mb-3">
                <p className={`font-semibold ${ui.heading}`}>
                  CSV column reference
                </p>
                <button
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1.5 bg-white dark:bg-[#171C17] border border-[#3FA34D]/30 dark:border-[#43B75A]/30 hover:bg-[#3FA34D]/5 dark:hover:bg-[#43B75A]/10 text-[#3FA34D] dark:text-[#43B75A] font-medium px-3 py-1.5 rounded-lg"
                >
                  <FiFileText size={13} /> Download Sample CSV
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className={ui.muted}>
                    <th className="pr-4 pb-2 font-semibold">Column</th>
                    <th className="pr-4 pb-2 font-semibold">Required?</th>
                    <th className="pr-4 pb-2 font-semibold">What to enter</th>
                    <th className="pb-2 font-semibold">Example</th>
                  </tr>
                </thead>
                <tbody className={`align-top ${ui.muted}`}>
                  {[
                    [
                      "name",
                      "Required",
                      "The dish or drink's full name",
                      "Chicken Biryani",
                    ],
                    [
                      "sku",
                      "Required",
                      "A unique code for this item — no two items can share one",
                      "BIR-001",
                    ],
                    [
                      "categoryName",
                      "Required",
                      "Must exactly match an existing category name (see Categories tab)",
                      "Biryani",
                    ],
                    [
                      "sellingPrice",
                      "Required",
                      "Price the customer pays, numbers only",
                      "320",
                    ],
                    [
                      "costPrice",
                      "Optional",
                      "What it costs you to make — leave blank if unknown",
                      "150",
                    ],
                    [
                      "gstPercent",
                      "Optional",
                      "Tax percentage — leave blank to default to 0",
                      "5",
                    ],
                    [
                      "foodType",
                      "Optional",
                      "One of: VEG, NON_VEG, EGG — defaults to VEG if left blank",
                      "NON_VEG",
                    ],
                    [
                      "description",
                      "Optional",
                      "Short description shown to customers",
                      "Fragrant basmati rice with spiced chicken",
                    ],
                  ].map((row) => (
                    <tr
                      key={row[0]}
                      className="border-t border-[#3FA34D]/10 dark:border-[#43B75A]/10"
                    >
                      <td className={`pr-4 py-1.5 font-medium ${ui.heading}`}>
                        {row[0]}
                      </td>
                      <td className="pr-4 py-1.5">{row[1]}</td>
                      <td className="pr-4 py-1.5">{row[2]}</td>
                      <td className="py-1.5">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3">
                Tip: click "Download Sample CSV" above, open it in Excel/Sheets,
                replace the example rows with your own items, save as CSV, then
                use "Bulk Import" to upload it.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end">
        {canManage && (
          <button onClick={handleAdd} className={ui.btnPrimary}>
            <FiPlus /> Add Item
          </button>
        )}
      </div>

      {/* Filters */}
      <div
        className={`${ui.card} p-4 flex flex-col sm:flex-row flex-wrap gap-3`}
      >
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch
            className={`absolute left-3 top-1/2 -translate-y-1/2 ${ui.faint}`}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or barcode"
            className={`${ui.input} pl-10`}
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className={`${ui.input} sm:w-auto`}
        >
          {categoryOptions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={subCategoryFilter}
          onChange={(e) => setSubCategoryFilter(e.target.value)}
          className={`${ui.input} sm:w-auto`}
        >
          {subCategoryOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          value={kitchenSectionFilter}
          onChange={(e) => setKitchenSectionFilter(e.target.value)}
          className={`${ui.input} sm:w-auto`}
        >
          {kitchenSectionOptions.map((k) => (
            <option key={k.id} value={k.id}>
              {k.name}
            </option>
          ))}
        </select>
        <select
          value={foodTypeFilter}
          onChange={(e) => setFoodTypeFilter(e.target.value)}
          className={`${ui.input} sm:w-auto`}
        >
          <option value="">Veg / Non-Veg / Egg</option>
          <option value="VEG">Veg</option>
          <option value="NON_VEG">Non-Veg</option>
          <option value="EGG">Egg</option>
        </select>
        <select
          value={availabilityFilter}
          onChange={(e) => setAvailabilityFilter(e.target.value)}
          className={`${ui.input} sm:w-auto`}
        >
          <option value="">Available / Unavailable</option>
          <option value="true">Available</option>
          <option value="false">Unavailable</option>
        </select>
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {isOffline && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          <WifiOff className="h-3.5 w-3.5" />
          Offline — showing last-synced items for this filter. Adding/editing
          needs a connection.
        </div>
      )}

      <div className={`${ui.card} overflow-hidden`}>
        {loading ? (
          <Spinner />
        ) : items.length === 0 ? (
          <EmptyState
            icon="🍲"
            title="No menu items yet"
            subtitle="Add your first dish, set a price, and it'll show up here."
            actionLabel={canManage ? "Add your first item" : undefined}
            onAction={canManage ? handleAdd : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E7EAE1] dark:border-[#262B24] bg-[#F3F5EE] dark:bg-[#1A1F19] text-left text-xs font-semibold text-[#6B7280] dark:text-[#9CA8A0] uppercase tracking-wide">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Kitchen Section</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">
                    <span className="inline-flex items-center gap-1">
                      <FiClock size={11} />
                      Prep / Serve
                    </span>
                  </th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Extras</th>
                  {(canManage || canDelete) && (
                    <th className="px-4 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-[#E7EAE1] dark:border-[#262B24] last:border-b-0 hover:bg-[#F3F5EE]/60 dark:hover:bg-[#1E241C] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-[#F3F5EE] dark:bg-[#1E241C] overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className={`${ui.faint} text-lg`}>🍽️</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FoodTypeDot foodType={item.foodType} />
                            <span
                              className={`font-medium truncate ${ui.heading}`}
                            >
                              {item.name}
                            </span>
                          </div>
                          <span className={`text-xs ${ui.faint}`}>
                            {item.sku}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-3 ${ui.muted}`}>
                      {item.category?.name || "—"}
                    </td>
                    <td className={`px-4 py-3 ${ui.muted}`}>
                      {item.kitchenSection?.name || "—"}
                    </td>
                    <td className={`px-4 py-3 font-medium ${ui.heading}`}>
                      ₹{Number(item.sellingPrice).toFixed(2)}
                    </td>
                    <td className={`px-4 py-3 text-xs ${ui.muted}`}>
                      {item.prepTimeMinutes ? `${item.prepTimeMinutes}m` : "—"}{" "}
                      /{" "}
                      {item.targetServeMinutes
                        ? `${item.targetServeMinutes}m`
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.isAvailable ? ui.badgeGreen : ui.badgeGray}`}
                      >
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={item.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setExtrasItem(item)}
                        className={`inline-flex items-center gap-1 ${ui.linkEdit} text-xs`}
                      >
                        <FiSliders size={12} /> Manage
                      </button>
                    </td>
                    {(canManage || canDelete) && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          {canManage && (
                            <button
                              onClick={() => handleEdit(item)}
                              className={ui.linkEdit}
                            >
                              Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => setDeletingItem(item)}
                              className={ui.linkDanger}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formOpen && (
        <MenuItemFormModal
          initial={editingItem}
          categories={categories}
          kitchenSections={kitchenSections}
          onClose={() => setFormOpen(false)}
          onSaved={handleFormSaved}
        />
      )}
      {deletingItem && (
        <DeleteItemConfirmModal
          item={deletingItem}
          onClose={() => setDeletingItem(null)}
          onConfirmed={handleDeleteConfirmed}
        />
      )}
      {extrasItem && (
        <ItemExtrasModal
          item={extrasItem}
          allAddOns={allAddOns}
          canManage={canManage}
          onClose={() => setExtrasItem(null)}
        />
      )}
      <BulkImportModal
        open={showImportResult}
        result={importResult}
        importing={importing}
        onClose={() => {
          setShowImportResult(false);
          setImportResult({
            created: [],
            updated: [],
            skipped: [],
          });
        }}
      />
    </div>
  );
};

export default MenuList;
