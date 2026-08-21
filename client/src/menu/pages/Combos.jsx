// client/src/menu/pages/Combos.jsx
import React, { useEffect, useState } from "react";
import { FiPlus, FiPackage, FiX } from "react-icons/fi";
import { WifiOff } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ui } from "../menuTheme";
import { Spinner, ErrorBanner, EmptyState } from "../MenuUI";
import {
  fetchCombos,
  createCombo,
  deleteCombo,
  fetchMenuItems,
  addComboItem,
  removeComboItem,
} from "../menuApi";
import { fetchWithOfflineFallbackResult } from "../../offline/offlineCache";

const ComboFormModal = ({ menuItems, onClose, onSaved }) => {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [selectedItems, setSelectedItems] = useState([]); // [{menuItemId, quantity}]
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toggleItem = (itemId) => {
    setSelectedItems((prev) =>
      prev.find((i) => i.menuItemId === itemId)
        ? prev.filter((i) => i.menuItemId !== itemId)
        : [...prev, { menuItemId: itemId, quantity: 1 }],
    );
  };

  const handleSave = async () => {
    if (!name.trim() || price === "" || selectedItems.length === 0) {
      setError("Name, price, and at least one item are required");
      return;
    }
    setSaving(true);
    setError("");

    const comboResult = await createCombo({
      name: name.trim(),
      price: Number(price),
      description: description.trim() || null,
    });

    if (!comboResult.ok) {
      setError(comboResult.data?.message || "Failed to create combo");
      setSaving(false);
      return;
    }

    const comboId = comboResult.data.data.id;
    for (const item of selectedItems) {
      await addComboItem(comboId, item.menuItemId, item.quantity);
    }

    onSaved();
  };

  return (
    <div className={ui.modalOverlay}>
      <div className={`${ui.modalCard} max-w-lg max-h-[85vh]`}>
        <div className={ui.modalHeader}>
          <h2 className={`text-lg font-semibold ${ui.heading}`}>
            Add Combo Meal
          </h2>
        </div>
        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <div>
            <label className={ui.label}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Combo 1"
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Combo Price *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 299"
              className={ui.input}
            />
          </div>
          <div>
            <label className={ui.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={`${ui.input} resize-none`}
            />
          </div>
          <div>
            <label className={ui.label}>
              Select Items * ({selectedItems.length} selected)
            </label>
            <div className="border border-[#E7EAE1] dark:border-[#262B24] rounded-xl max-h-56 overflow-y-auto divide-y divide-[#E7EAE1] dark:divide-[#262B24]">
              {menuItems.map((item) => {
                const checked = selectedItems.some(
                  (i) => i.menuItemId === item.id,
                );
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#F3F5EE] dark:hover:bg-[#1E241C] cursor-pointer text-sm transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.id)}
                      className="rounded accent-[#3FA34D]"
                    />
                    <span className={`flex-1 ${ui.heading}`}>{item.name}</span>
                    <span className={ui.faint}>
                      ₹{Number(item.sellingPrice).toFixed(2)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className={ui.modalFooter}>
          <button onClick={onClose} disabled={saving} className={ui.btnCancel}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={ui.btnPrimary}
          >
            {saving ? "Saving..." : "Create Combo"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Combos = () => {
  const { canManageMenu, canDeleteMenuItems } = useAuth();
  const canManage = canManageMenu();
  const canDelete = canDeleteMenuItems();

  const [combos, setCombos] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // Read-only offline browsing for both lists — create/delete stay
  // online-only. Menu items failing silently (no error shown) matches the
  // original tolerant behavior; combos failing does surface an error.
  const loadData = async () => {
    setLoading(true);
    setError("");
    const [comboResult, itemsResult] = await Promise.allSettled([
      fetchWithOfflineFallbackResult("menuAdmin:combos", fetchCombos),
      fetchWithOfflineFallbackResult(
        "menuAdmin:comboMenuItems",
        fetchMenuItems,
      ),
    ]);

    let offline = false;
    if (comboResult.status === "fulfilled") {
      setCombos(comboResult.value.data.data || []);
      if (comboResult.value.fromCache) offline = true;
    } else {
      setError(comboResult.reason?.message || "Failed to load combos");
    }
    if (itemsResult.status === "fulfilled") {
      setMenuItems(itemsResult.value.data.data || []);
      if (itemsResult.value.fromCache) offline = true;
    }

    setIsOffline(offline);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteCombo = async (combo) => {
    if (!window.confirm(`Delete combo "${combo.name}"?`)) return;
    const result = await deleteCombo(combo.id);
    if (!result.ok) {
      alert(result.data?.message || "Failed to delete");
      return;
    }
    loadData();
  };

  const handleRemoveItem = async (comboItemId) => {
    await removeComboItem(comboItemId);
    loadData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {canManage && (
          <button onClick={() => setFormOpen(true)} className={ui.btnPrimary}>
            <FiPlus /> Add Combo
          </button>
        )}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {isOffline && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          <WifiOff className="h-3.5 w-3.5" />
          Offline — showing last-synced combos. Adding/editing needs a
          connection.
        </div>
      )}

      {loading ? (
        <div className={ui.card}>
          <Spinner />
        </div>
      ) : combos.length === 0 ? (
        <div className={ui.card}>
          <EmptyState
            icon="📦"
            title="No combo meals yet"
            subtitle="Bundle items like Burger + Fries + Coke at a fixed price."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {combos.map((combo) => (
            <div key={combo.id} className={`${ui.card} ${ui.cardHover} p-5`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className={`font-semibold ${ui.heading}`}>
                    {combo.name}
                  </h3>
                  {combo.description && (
                    <p className={`text-sm ${ui.muted} mt-0.5`}>
                      {combo.description}
                    </p>
                  )}
                </div>
                <span className="font-bold text-[#3FA34D] dark:text-[#43B75A]">
                  ₹{Number(combo.price).toFixed(2)}
                </span>
              </div>

              <div className="mt-3 space-y-1.5">
                {(combo.items || []).map((ci) => (
                  <div
                    key={ci.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className={ui.muted}>
                      {ci.quantity}× {ci.menuItem?.name}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveItem(ci.id)}
                        className={`${ui.faint} hover:text-[#EF5350] transition-colors`}
                      >
                        <FiX size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {canDelete && (
                <button
                  onClick={() => handleDeleteCombo(combo)}
                  className={`mt-4 ${ui.linkDanger}`}
                >
                  Delete Combo
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <ComboFormModal
          menuItems={menuItems}
          onClose={() => setFormOpen(false)}
          onSaved={() => {
            setFormOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
};

export default Combos;
