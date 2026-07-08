// client/src/menu/pages/KitchenSections.jsx
import React, { useEffect, useState } from "react";
import { FiPlus, FiCoffee } from "react-icons/fi";
import { useAuth } from "../../auth/AuthContext";
import MenuTabs from "../MenuTabs";
import {
  fetchKitchenSections,
  createKitchenSection,
  updateKitchenSection,
  deleteKitchenSection,
} from "../menuApi";

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const KitchenSections = () => {
  const { canManageMenu, canDeleteMenuItems } = useAuth();
  const canManage = canManageMenu();
  const canDelete = canDeleteMenuItems();

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    const result = await fetchKitchenSections();
    if (result.ok) {
      setSections(result.data.data || []);
    } else {
      setError(result.data?.message || "Failed to load kitchen sections");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    const result = await createKitchenSection({ name: newName.trim() });
    setSaving(false);
    if (!result.ok) {
      alert(result.data?.message || "Failed to add");
      return;
    }
    setNewName("");
    loadData();
  };

  const handleUpdate = async (id) => {
    if (!editingName.trim()) return;
    const result = await updateKitchenSection(id, { name: editingName.trim() });
    if (!result.ok) {
      alert(result.data?.message || "Failed to update");
      return;
    }
    setEditingId(null);
    loadData();
  };

  const handleDelete = async (section) => {
    if (!window.confirm(`Delete "${section.name}"?`)) return;
    const result = await deleteKitchenSection(section.id);
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
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 mb-6 flex gap-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Main Kitchen, Bakery, Bar, Juice Counter"
            className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
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
        ) : sections.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <FiCoffee className="mx-auto text-4xl text-gray-300 mb-3" />
            No kitchen sections yet — add Main Kitchen, Bakery, Bar, etc.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center justify-between px-5 py-3.5">
                {editingId === section.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(section.id)}
                    autoFocus
                    className="flex-1 border border-blue-300 rounded-lg px-2 py-1 text-sm mr-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span className="font-medium text-gray-800">{section.name}</span>
                )}
                <div className="flex gap-3 flex-shrink-0">
                  {editingId === section.id ? (
                    <>
                      <button onClick={() => handleUpdate(section.id)} className="text-xs font-medium text-blue-600 hover:text-blue-700">
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
                          onClick={() => { setEditingId(section.id); setEditingName(section.name); }}
                          className="text-xs font-medium text-blue-600 hover:text-blue-700"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button onClick={() => handleDelete(section)} className="text-xs font-medium text-red-600 hover:text-red-700">
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

export default KitchenSections;