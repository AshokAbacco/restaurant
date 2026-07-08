// client/src/menu/pages/SubCategories.jsx
import React, { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { useAuth } from "../../auth/AuthContext";
import MenuTabs from "../MenuTabs";
import {
  fetchCategories,
  fetchSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "../menuApi";

const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const SubCategoryFormModal = ({ initial, categories, onClose, onSaved }) => {
  const isEdit = Boolean(initial?.id);
  const [name, setName] = useState(initial?.name || "");
  const [categoryId, setCategoryId] = useState(initial?.categoryId || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!name.trim() || !categoryId) {
      setError("Name and parent category are required");
      return;
    }
    setSaving(true);
    setError("");
    const payload = { name: name.trim(), categoryId };
    const result = isEdit
      ? await updateSubCategory(initial.id, payload)
      : await createSubCategory(payload);

    if (!result.ok) {
      setError(result.data?.message || "Failed to save sub-category");
      setSaving(false);
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {isEdit ? "Edit Sub Category" : "Add Sub Category"}
          </h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Parent Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Noodles"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60">
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
};

const SubCategories = () => {
  const { canManageMenu, canDeleteMenuItems } = useAuth();
  const canManage = canManageMenu();
  const canDelete = canDeleteMenuItems();

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    const [catResult, subResult] = await Promise.all([fetchCategories(), fetchSubCategories()]);
    if (catResult.ok) setCategories(catResult.data.data || []);
    if (subResult.ok) {
      setSubCategories(subResult.data.data || []);
    } else {
      setError(subResult.data?.message || "Failed to load sub-categories");
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleDelete = async (sub) => {
    if (!window.confirm(`Delete sub-category "${sub.name}"?`)) return;
    const result = await deleteSubCategory(sub.id);
    if (!result.ok) {
      alert(result.data?.message || "Failed to delete");
      return;
    }
    loadData();
  };

  const grouped = categories.map((cat) => ({
    category: cat,
    subs: subCategories.filter((s) => s.categoryId === cat.id),
  }));

  return (
    <div>
      <MenuTabs />

      <div className="flex items-center justify-end mb-4">
        {canManage && (
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
          >
            <FiPlus /> Add Sub Category
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>
      )}

      {loading ? (
        <Spinner />
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center text-gray-500">
          Add a category first — sub-categories belong to a category.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ category, subs }) => (
            <div key={category.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3">{category.name}</h3>
              {subs.length === 0 ? (
                <p className="text-sm text-gray-400">No sub-categories yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subs.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-3 pr-2 py-1.5 text-sm"
                    >
                      <span className="text-gray-700">{sub.name}</span>
                      {canManage && (
                        <button
                          onClick={() => { setEditing(sub); setFormOpen(true); }}
                          className="text-blue-600 hover:text-blue-700 text-xs font-medium"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(sub)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <SubCategoryFormModal
          initial={editing}
          categories={categories}
          onClose={() => setFormOpen(false)}
          onSaved={() => { setFormOpen(false); loadData(); }}
        />
      )}
    </div>
  );
};

export default SubCategories;