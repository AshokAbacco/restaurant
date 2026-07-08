// client/src/menu/pages/MenuList.jsx
import React, { useEffect, useMemo, useState } from "react";
import { FiPlus, FiSearch, FiUpload, FiDownload, FiSliders, FiClock, FiInfo, FiFileText } from "react-icons/fi";
import { useAuth } from "../../auth/AuthContext";
import MenuTabs from "../MenuTabs";
import MenuItemFormModal from "../components/MenuItemFormModal";
import ItemExtrasModal from "../components/ItemExtrasModal";
import DeleteItemConfirmModal from "../components/DeleteItemConfirmModal";
import {
  fetchMenuItems, fetchCategories, fetchSubCategories, fetchKitchenSections, fetchAddOns,
  importMenuCsv, exportMenuCsv,
} from "../menuApi";

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const EmptyState = ({ canManage, onAdd }) => (
  <div className="text-center py-20 px-6">
    <div className="text-5xl mb-4">🍲</div>
    <h3 className="text-lg font-semibold text-gray-800">No menu items yet</h3>
    <p className="text-gray-500 mt-1 mb-6">Add your first dish, set a price, and it'll show up here.</p>
    {canManage && (
      <button onClick={onAdd} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2.5 rounded-lg transition-colors">
        Add your first item
      </button>
    )}
  </div>
);

const FoodTypeDot = ({ foodType }) => {
  const border = foodType === "VEG" ? "border-green-600" : foodType === "EGG" ? "border-amber-500" : "border-red-600";
  const dot = foodType === "VEG" ? "bg-green-600" : foodType === "EGG" ? "bg-amber-500" : "bg-red-600";
  return (
    <span className={`inline-flex items-center justify-center w-4 h-4 border-2 ${border} rounded-sm flex-shrink-0`} title={foodType.replace("_", "-")}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
    </span>
  );
};

const StatusPill = ({ status }) => {
  const styles = { ACTIVE: "bg-green-100 text-green-700", OUT_OF_STOCK: "bg-amber-100 text-amber-700", INACTIVE: "bg-gray-100 text-gray-500", DELETED: "bg-red-100 text-red-700" };
  const labels = { ACTIVE: "Active", OUT_OF_STOCK: "Out of Stock", INACTIVE: "Inactive", DELETED: "Deleted" };
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}>{labels[status] || status}</span>;
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

  const loadData = async () => {
    setLoading(true);
    setError("");
    const [itemsR, catR, kitR, subR, addR] = await Promise.all([
      fetchMenuItems({
        ...(search ? { search } : {}),
        ...(categoryFilter ? { categoryId: categoryFilter } : {}),
        ...(subCategoryFilter ? { subCategoryId: subCategoryFilter } : {}),
        ...(kitchenSectionFilter ? { kitchenSectionId: kitchenSectionFilter } : {}),
        ...(foodTypeFilter ? { foodType: foodTypeFilter } : {}),
        ...(availabilityFilter !== "" ? { isAvailable: availabilityFilter } : {}),
      }),
      fetchCategories(), fetchKitchenSections(), fetchSubCategories(), fetchAddOns(),
    ]);
    if (itemsR.ok) setItems(itemsR.data.data || []); else setError(itemsR.data?.message || "Failed to load menu items");
    if (catR.ok) setCategories(catR.data.data || []);
    if (kitR.ok) setKitchenSections(kitR.data.data || []);
    if (subR.ok) setAllSubCategories(subR.data.data || []);
    if (addR.ok) setAllAddOns(addR.data.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [categoryFilter, subCategoryFilter, kitchenSectionFilter, foodTypeFilter, availabilityFilter]);
  useEffect(() => { const t = setTimeout(loadData, 400); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [search]);

  const handleAdd = () => { setEditingItem(null); setFormOpen(true); };
  const handleEdit = (item) => { setEditingItem(item); setFormOpen(true); };
  const handleFormSaved = () => { setFormOpen(false); setEditingItem(null); loadData(); };
  const handleDeleteConfirmed = () => { setDeletingItem(null); loadData(); };

  const categoryOptions = useMemo(() => [{ id: "", name: "All Categories" }, ...categories], [categories]);
  const subCategoryOptions = useMemo(() => [{ id: "", name: "All Sub Categories" }, ...allSubCategories], [allSubCategories]);
  const kitchenSectionOptions = useMemo(() => [{ id: "", name: "All Kitchen Sections" }, ...kitchenSections], [kitchenSections]);

  const handleImportClick = () => document.getElementById("menu-csv-import-input")?.click();

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const result = await importMenuCsv(file);
    setImporting(false);
    e.target.value = "";
    if (!result.ok) { alert(result.data?.message || "Import failed — check the file matches the required format"); return; }
    const { created, skipped, errors } = result.data.data;
    alert(`Import complete: ${created} created, ${skipped} skipped.${errors?.length ? "\n\n" + errors.join("\n") : ""}`);
    loadData();
  };

  const handleExport = async () => {
    setExporting(true);
    const result = await exportMenuCsv();
    setExporting(false);
    if (!result.ok) { alert(result.data?.message || "Export failed"); return; }
    const url = window.URL.createObjectURL(result.blob);
    const a = document.createElement("a");
    a.href = url; a.download = "menu-export.csv"; a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleDownloadSample = () => {
    const headers = ["name", "sku", "categoryName", "sellingPrice", "costPrice", "gstPercent", "foodType", "description"];
    const sampleRows = [
      ["Chicken Biryani", "BIR-001", "Biryani", "320", "150", "5", "NON_VEG", "Fragrant basmati rice with spiced chicken"],
      ["Veg Manchurian", "CHI-001", "Chinese", "220", "90", "5", "VEG", "Crispy vegetable balls in tangy sauce"],
      ["Cold Coffee", "BEV-001", "Beverages", "130", "45", "12", "VEG", "Chilled coffee blended with ice cream"],
    ];
    const csv = [headers.join(","), ...sampleRows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "menu-import-sample.csv"; a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div>
      <MenuTabs />

      {/* Bulk Import/Export panel with clear heading */}
      {(canManage || canDelete) && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Bulk Import / Export</h3>
              <p className="text-xs text-gray-400 mt-0.5">Update many items at once using a CSV file</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowImportHelp(!showImportHelp)} className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-sm font-medium">
                <FiInfo size={14} /> {showImportHelp ? "Hide format guide" : "How do I format the file?"}
              </button>
              <input id="menu-csv-import-input" type="file" accept=".csv" onChange={handleImportFile} className="hidden" />
              {canDelete && (
                <button onClick={handleImportClick} disabled={importing} className="inline-flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium px-3.5 py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                  <FiUpload size={14} /> {importing ? "Importing..." : "Bulk Import"}
                </button>
              )}
              {canManage && (
                <button onClick={handleExport} disabled={exporting} className="inline-flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium px-3.5 py-2 rounded-lg text-sm transition-colors disabled:opacity-60">
                  <FiDownload size={14} /> {exporting ? "Exporting..." : "Export CSV"}
                </button>
              )}
            </div>
          </div>
          {showImportHelp && (
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-lg px-4 py-4 text-xs text-blue-900">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold">CSV column reference</p>
                <button
                  onClick={handleDownloadSample}
                  className="inline-flex items-center gap-1.5 bg-white border border-blue-200 hover:bg-blue-50 text-blue-700 font-medium px-3 py-1.5 rounded-lg"
                >
                  <FiFileText size={13} /> Download Sample CSV
                </button>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-blue-700">
                    <th className="pr-4 pb-2 font-semibold">Column</th>
                    <th className="pr-4 pb-2 font-semibold">Required?</th>
                    <th className="pr-4 pb-2 font-semibold">What to enter</th>
                    <th className="pb-2 font-semibold">Example</th>
                  </tr>
                </thead>
                <tbody className="align-top">
                  <tr className="border-t border-blue-100">
                    <td className="pr-4 py-1.5 font-medium">name</td>
                    <td className="pr-4 py-1.5">Required</td>
                    <td className="pr-4 py-1.5">The dish or drink's full name</td>
                    <td className="py-1.5">Chicken Biryani</td>
                  </tr>
                  <tr className="border-t border-blue-100">
                    <td className="pr-4 py-1.5 font-medium">sku</td>
                    <td className="pr-4 py-1.5">Required</td>
                    <td className="pr-4 py-1.5">A unique code for this item — no two items can share one</td>
                    <td className="py-1.5">BIR-001</td>
                  </tr>
                  <tr className="border-t border-blue-100">
                    <td className="pr-4 py-1.5 font-medium">categoryName</td>
                    <td className="pr-4 py-1.5">Required</td>
                    <td className="pr-4 py-1.5">Must exactly match an existing category name (see Categories tab)</td>
                    <td className="py-1.5">Biryani</td>
                  </tr>
                  <tr className="border-t border-blue-100">
                    <td className="pr-4 py-1.5 font-medium">sellingPrice</td>
                    <td className="pr-4 py-1.5">Required</td>
                    <td className="pr-4 py-1.5">Price the customer pays, numbers only</td>
                    <td className="py-1.5">320</td>
                  </tr>
                  <tr className="border-t border-blue-100">
                    <td className="pr-4 py-1.5 font-medium">costPrice</td>
                    <td className="pr-4 py-1.5">Optional</td>
                    <td className="pr-4 py-1.5">What it costs you to make — leave blank if unknown</td>
                    <td className="py-1.5">150</td>
                  </tr>
                  <tr className="border-t border-blue-100">
                    <td className="pr-4 py-1.5 font-medium">gstPercent</td>
                    <td className="pr-4 py-1.5">Optional</td>
                    <td className="pr-4 py-1.5">Tax percentage — leave blank to default to 0</td>
                    <td className="py-1.5">5</td>
                  </tr>
                  <tr className="border-t border-blue-100">
                    <td className="pr-4 py-1.5 font-medium">foodType</td>
                    <td className="pr-4 py-1.5">Optional</td>
                    <td className="pr-4 py-1.5">One of: VEG, NON_VEG, EGG — defaults to VEG if left blank</td>
                    <td className="py-1.5">NON_VEG</td>
                  </tr>
                  <tr className="border-t border-blue-100">
                    <td className="pr-4 py-1.5 font-medium">description</td>
                    <td className="pr-4 py-1.5">Optional</td>
                    <td className="pr-4 py-1.5">Short description shown to customers</td>
                    <td className="py-1.5">Fragrant basmati rice with spiced chicken</td>
                  </tr>
                </tbody>
              </table>
              <p className="mt-3 text-blue-700">
                Tip: click "Download Sample CSV" above, open it in Excel/Sheets, replace the example rows with your
                own items, save as CSV, then use "Bulk Import" to upload it.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end mb-4">
        {canManage && (
          <button onClick={handleAdd} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors shadow-sm">
            <FiPlus /> Add Item
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-col sm:flex-row flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, SKU, or barcode"
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={subCategoryFilter} onChange={(e) => setSubCategoryFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {subCategoryOptions.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={kitchenSectionFilter} onChange={(e) => setKitchenSectionFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          {kitchenSectionOptions.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
        </select>
        <select value={foodTypeFilter} onChange={(e) => setFoodTypeFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Veg / Non-Veg / Egg</option>
          <option value="VEG">Veg</option><option value="NON_VEG">Non-Veg</option><option value="EGG">Egg</option>
        </select>
        <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Available / Unavailable</option>
          <option value="true">Available</option><option value="false">Unavailable</option>
        </select>
      </div>

      {error && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? <Spinner /> : items.length === 0 ? <EmptyState canManage={canManage} onAdd={handleAdd} /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Kitchen Section</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3"><span className="inline-flex items-center gap-1"><FiClock size={11} />Prep / Serve</span></th>
                  <th className="px-4 py-3">Availability</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Extras</th>
                  {(canManage || canDelete) && <th className="px-4 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-sm">
                          {item.imageUrl ? <img src={item.imageUrl} alt="" className="w-full h-full object-cover" /> : <span className="text-gray-300 text-lg">🍽️</span>}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <FoodTypeDot foodType={item.foodType} />
                            <span className="font-medium text-gray-900 truncate">{item.name}</span>
                          </div>
                          <span className="text-xs text-gray-400">{item.sku}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.category?.name || "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{item.kitchenSection?.name || "—"}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">₹{Number(item.sellingPrice).toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {item.prepTimeMinutes ? `${item.prepTimeMinutes}m` : "—"} / {item.targetServeMinutes ? `${item.targetServeMinutes}m` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${item.isAvailable ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {item.isAvailable ? "Available" : "Unavailable"}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusPill status={item.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setExtrasItem(item)} className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700">
                        <FiSliders size={12} /> Manage
                      </button>
                    </td>
                    {(canManage || canDelete) && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-3">
                          {canManage && <button onClick={() => handleEdit(item)} className="text-xs font-medium text-blue-600 hover:text-blue-700">Edit</button>}
                          {canDelete && <button onClick={() => setDeletingItem(item)} className="text-xs font-medium text-red-600 hover:text-red-700">Delete</button>}
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
        <MenuItemFormModal initial={editingItem} categories={categories} kitchenSections={kitchenSections} onClose={() => setFormOpen(false)} onSaved={handleFormSaved} />
      )}
      {deletingItem && (
        <DeleteItemConfirmModal item={deletingItem} onClose={() => setDeletingItem(null)} onConfirmed={handleDeleteConfirmed} />
      )}
      {extrasItem && (
        <ItemExtrasModal item={extrasItem} allAddOns={allAddOns} canManage={canManage} onClose={() => setExtrasItem(null)} />
      )}
    </div>
  );
};

export default MenuList;