// client/src/menu/pages/Combos.jsx
import React, { useEffect, useState } from "react";
import { FiPlus, FiPackage, FiX } from "react-icons/fi";
import { useAuth } from "../../auth/AuthContext";
import MenuTabs from "../MenuTabs";
import {
  fetchCombos,
  createCombo,
  deleteCombo,
  fetchMenuItems,
  addComboItem,
  removeComboItem,
} from "../menuApi";

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

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
        : [...prev, { menuItemId: itemId, quantity: 1 }]
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-semibold text-gray-900">Add Combo Meal</h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Combo 1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Combo Price *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. 299"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Items * ({selectedItems.length} selected)
            </label>
            <div className="border border-gray-200 rounded-lg max-h-56 overflow-y-auto divide-y divide-gray-100">
              {menuItems.map((item) => {
                const checked = selectedItems.some((i) => i.menuItemId === item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleItem(item.id)}
                      className="rounded"
                    />
                    <span className="flex-1 text-gray-800">{item.name}</span>
                    <span className="text-gray-400">₹{Number(item.sellingPrice).toFixed(2)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
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

  const loadData = async () => {
    setLoading(true);
    setError("");
    const [comboResult, itemsResult] = await Promise.all([fetchCombos(), fetchMenuItems()]);
    if (comboResult.ok) {
      setCombos(comboResult.data.data || []);
    } else {
      setError(comboResult.data?.message || "Failed to load combos");
    }
    if (itemsResult.ok) setMenuItems(itemsResult.data.data || []);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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
    <div>
      <MenuTabs />

      <div className="flex items-center justify-end mb-4">
        {canManage && (
          <button
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <FiPlus /> Add Combo
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {loading ? (
        <Spinner />
      ) : combos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-500">
          <FiPackage className="mx-auto text-4xl text-gray-300 mb-3" />
          No combo meals yet — bundle items like Burger + Fries + Coke at a fixed price.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {combos.map((combo) => (
            <div key={combo.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{combo.name}</h3>
                  {combo.description && (
                    <p className="text-sm text-gray-500 mt-0.5">{combo.description}</p>
                  )}
                </div>
                <span className="font-bold text-blue-600">₹{Number(combo.price).toFixed(2)}</span>
              </div>

              <div className="mt-3 space-y-1.5">
                {(combo.items || []).map((ci) => (
                  <div key={ci.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {ci.quantity}× {ci.menuItem?.name}
                    </span>
                    {canManage && (
                      <button
                        onClick={() => handleRemoveItem(ci.id)}
                        className="text-gray-400 hover:text-red-600"
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
                  className="mt-4 text-xs font-medium text-red-600 hover:text-red-700"
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
          onSaved={() => { setFormOpen(false); loadData(); }}
        />
      )}
    </div>
  );
};

export default Combos;