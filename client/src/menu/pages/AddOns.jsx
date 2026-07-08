// client/src/menu/pages/AddOns.jsx
import React, { useEffect, useState } from "react";
import { FiPlus, FiTag } from "react-icons/fi";
import { useAuth } from "../../auth/AuthContext";
import MenuTabs from "../MenuTabs";
import { fetchAddOns, createAddOn, updateAddOn, deleteAddOn } from "../menuApi";

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const AddOns = () => {
  const { canManageMenu, canDeleteMenuItems } = useAuth();
  const canManage = canManageMenu();
  const canDelete = canDeleteMenuItems();

  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    const result = await fetchAddOns();
    if (result.ok) {
      setAddOns(result.data.data || []);
    } else {
      setError(result.data?.message || "Failed to load add-ons");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = async () => {
    if (!name.trim() || price === "") return;
    setSaving(true);
    const result = await createAddOn({ name: name.trim(), price: Number(price) });
    setSaving(false);
    if (!result.ok) {
      alert(result.data?.message || "Failed to add");
      return;
    }
    setName("");
    setPrice("");
    loadData();
  };

  const handleUpdate = async (id) => {
    const result = await updateAddOn(id, { name: editName.trim(), price: Number(editPrice) });
    if (!result.ok) {
      alert(result.data?.message || "Failed to update");
      return;
    }
    setEditingId(null);
    loadData();
  };

  const handleDelete = async (addOn) => {
    if (!window.confirm(`Delete add-on "${addOn.name}"?`)) return;
    const result = await deleteAddOn(addOn.id);
    if (!result.ok) {
      alert(result.data?.message || "Failed to delete");
      return;
    }
    loadData();
  };

  return (
    <div>
      <MenuTabs />

      {canManage && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6 flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Extra Cheese"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price (₹)"
            className="w-full sm:w-32 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            <FiPlus /> Add
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <Spinner />
        ) : addOns.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FiTag className="mx-auto text-4xl text-gray-300 mb-3" />
            No add-ons yet — e.g. Extra Cheese ₹40, Extra Chicken ₹70
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {addOns.map((addOn) => (
              <div key={addOn.id} className="flex items-center justify-between px-5 py-3.5">
                {editingId === addOn.id ? (
                  <div className="flex gap-3 flex-1 mr-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className="w-24 border border-blue-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-800">{addOn.name}</span>
                    <span className="text-sm text-gray-500">₹{Number(addOn.price).toFixed(2)}</span>
                    {!addOn.isEnabled && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Disabled</span>
                    )}
                  </div>
                )}
                <div className="flex gap-3 flex-shrink-0">
                  {editingId === addOn.id ? (
                    <>
                      <button onClick={() => handleUpdate(addOn.id)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
                        Save
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs font-medium text-gray-500 hover:text-gray-700">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {canManage && (
                        <button
                          onClick={() => { setEditingId(addOn.id); setEditName(addOn.name); setEditPrice(addOn.price); }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(addOn)} className="text-xs font-medium text-red-600 hover:text-red-700">
                          Delete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddOns;