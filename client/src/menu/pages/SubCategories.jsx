// client/src/menu/pages/SubCategories.jsx
import React, { useEffect, useState } from "react";
import { FiPlus, FiX } from "react-icons/fi";
import { useAuth } from "../../auth/AuthContext";
import { ui } from "../menuTheme";
import { Spinner, ErrorBanner } from "../MenuUI";
import {
  fetchCategories,
  fetchSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "../menuApi";

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
    <div className={ui.modalOverlay}>
      <div className={`${ui.modalCard} max-w-sm`}>
        <div className={ui.modalHeader}>
          <h2 className={`text-lg font-semibold ${ui.heading}`}>
            {isEdit ? "Edit Sub Category" : "Add Sub Category"}
          </h2>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <ErrorBanner>{error}</ErrorBanner>}
          <div>
            <label className={ui.label}>Parent Category *</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className={ui.input}
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={ui.label}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Noodles"
              className={ui.input}
            />
          </div>
        </div>
        <div className={ui.modalFooter}>
          <button onClick={onClose} disabled={saving} className={ui.btnCancel}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} className={ui.btnPrimary}>
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
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {canManage && (
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className={ui.btnPrimary}
          >
            <FiPlus /> Add Sub Category
          </button>
        )}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}

      {loading ? (
        <div className={ui.card}><Spinner /></div>
      ) : categories.length === 0 ? (
        <div className={`${ui.card} p-10 text-center ${ui.muted}`}>
          Add a category first — sub-categories belong to a category.
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ category, subs }) => (
            <div key={category.id} className={`${ui.card} p-5`}>
              <h3 className={`font-semibold ${ui.heading} mb-3`}>{category.name}</h3>
              {subs.length === 0 ? (
                <p className={`text-sm ${ui.faint}`}>No sub-categories yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {subs.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-2 bg-[#F3F5EE] dark:bg-[#1E241C] border border-[#E7EAE1] dark:border-[#262B24] rounded-full pl-3 pr-2 py-1.5 text-sm"
                    >
                      <span className={ui.heading}>{sub.name}</span>
                      {canManage && (
                        <button
                          onClick={() => { setEditing(sub); setFormOpen(true); }}
                          className={`${ui.linkEdit} text-xs`}
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(sub)}
                          className="text-[#EF5350] hover:text-[#D9433E] transition-colors"
                          title="Remove"
                        >
                          <FiX size={13} />
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
