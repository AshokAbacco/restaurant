// client/src/menu/pages/Categories.jsx
import React, { useEffect, useState } from "react";
import { FiPlus } from "react-icons/fi";
import { WifiOff } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ui } from "../menuTheme";
import { Spinner, ErrorBanner, EmptyState, Toggle } from "../MenuUI";
import { fetchWithOfflineFallbackResult } from "../../offline/offlineCache";
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadImage,
} from "../menuApi";

// ==============================================
// Category Form Modal
// ==============================================

const CategoryFormModal = ({ initial, onClose, onSaved }) => {
  const isEdit = Boolean(initial?.id);

  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [displayOrder, setDisplayOrder] = useState(initial?.displayOrder ?? 0);
  const [isEnabled, setIsEnabled] = useState(initial?.isEnabled ?? true);
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl || "");
  const [imagePreview, setImagePreview] = useState(initial?.imageUrl || "");
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }
    setSaving(true);
    setError("");

    try {
      let finalImageUrl = imageUrl;

      if (imageFile) {
        const uploadResult = await uploadImage(imageFile, "categories");
        if (!uploadResult.ok) {
          throw new Error(uploadResult.data?.message || "Image upload failed");
        }
        finalImageUrl = uploadResult.data.data.url;
      }

      const payload = {
        name: name.trim(),
        description: description.trim() || null,
        displayOrder: Number(displayOrder) || 0,
        isEnabled,
        imageUrl: finalImageUrl || null,
      };

      const result = isEdit
        ? await updateCategory(initial.id, payload)
        : await createCategory(payload);

      if (!result.ok) {
        throw new Error(result.data?.message || "Failed to save category");
      }

      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={ui.modalOverlay}>
      <div className={`${ui.modalCard} max-w-md max-h-[90vh]`}>
        <div className={ui.modalHeader}>
          <h2 className={`text-lg font-semibold ${ui.heading}`}>
            {isEdit ? "Edit Category" : "Add Category"}
          </h2>
          <button
            onClick={onClose}
            className={`${ui.faint} hover:text-[#1F2937] dark:hover:text-white text-xl leading-none`}
          >
            ×
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
          {error && <ErrorBanner>{error}</ErrorBanner>}

          {/* Image */}
          <div>
            <label className={ui.label}>Image</label>
            <div className="flex items-center gap-3">
              <div className="w-16 h-16 rounded-xl bg-[#F3F5EE] dark:bg-[#1E241C] overflow-hidden flex items-center justify-center flex-shrink-0">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className={`${ui.faint} text-2xl`}>🖼️</span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className={`text-sm ${ui.muted} file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#3FA34D]/10 dark:file:bg-[#43B75A]/15 file:text-[#3FA34D] dark:file:text-[#43B75A] file:text-sm hover:file:bg-[#3FA34D]/20`}
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={ui.label}>Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Starters"
              className={ui.input}
            />
          </div>

          {/* Description */}
          <div>
            <label className={ui.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Optional short description"
              className={`${ui.input} resize-none`}
            />
          </div>

          <div className="flex gap-4">
            {/* Display order */}
            <div className="flex-1">
              <label className={ui.label}>Display order</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(e.target.value)}
                className={ui.input}
              />
            </div>

            {/* Enabled toggle */}
            <div className="flex-1">
              <label className={ui.label}>Status</label>
              <Toggle
                label={isEnabled ? "Enabled" : "Disabled"}
                value={isEnabled}
                onChange={setIsEnabled}
                tone="green"
              />
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
            {saving ? "Saving..." : isEdit ? "Save changes" : "Add category"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================
// Delete Confirm Modal
// ==============================================

const DeleteConfirmModal = ({ category, onClose, onConfirmed }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    const result = await deleteCategory(category.id);
    if (!result.ok) {
      setError(result.data?.message || "Failed to delete category");
      setDeleting(false);
      return;
    }
    onConfirmed();
  };

  return (
    <div className={ui.modalOverlay}>
      <div className={`${ui.modalCard} max-w-sm p-6`}>
        <h2 className={`text-lg font-semibold ${ui.heading}`}>
          Delete category?
        </h2>
        <p className={`${ui.muted} text-sm mt-2`}>
          "{category.name}" will be permanently removed. Menu items inside it
          will need a new category.
        </p>
        {error && <div className={`${ui.errorBanner} mt-3 mb-0`}>{error}</div>}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            disabled={deleting}
            className={ui.btnCancel}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className={ui.btnDanger}
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==============================================
// Category Card
// ==============================================

const CategoryCard = ({ category, canManage, canDelete, onEdit, onDelete }) => (
  <div className={`${ui.card} ${ui.cardHover} overflow-hidden group`}>
    <div className="h-32 bg-[#F3F5EE] dark:bg-[#1E241C] relative">
      {category.imageUrl ? (
        <img
          src={category.imageUrl}
          alt={category.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div
          className={`w-full h-full flex items-center justify-center text-4xl ${ui.faint}`}
        >
          🍽️
        </div>
      )}
      <span
        className={`absolute top-2 right-2 text-xs font-medium px-2 py-0.5 rounded-full ${
          category.isEnabled ? ui.badgeGreen : ui.badgeGray
        }`}
      >
        {category.isEnabled ? "Enabled" : "Disabled"}
      </span>
    </div>

    <div className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className={`font-semibold ${ui.heading}`}>{category.name}</h3>
          {category.description && (
            <p className={`text-sm ${ui.muted} mt-0.5 line-clamp-2`}>
              {category.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#E7EAE1] dark:border-[#262B24]">
        <span className={`text-xs ${ui.faint}`}>
          {category.subCategories?.length || 0} sub-categories
        </span>

        {(canManage || canDelete) && (
          <div className="flex gap-3">
            {canManage && (
              <button onClick={() => onEdit(category)} className={ui.linkEdit}>
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(category)}
                className={ui.linkDanger}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  </div>
);

// ==============================================
// Main Page
// ==============================================

const Categories = () => {
  const { canManageMenu, canDeleteMenuItems } = useAuth();

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [deletingCategory, setDeletingCategory] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  const canManage = canManageMenu();
  const canDelete = canDeleteMenuItems();

  // Read-only offline browsing — create/update/delete stay online-only.
  // Shares the "menuAdmin:categories" cache key with SubCategories.jsx, so
  // browsing either page while online warms the fallback for both.
  const loadCategories = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: result, fromCache } = await fetchWithOfflineFallbackResult(
        "menuAdmin:categories",
        fetchCategories,
      );
      setIsOffline(fromCache);
      setCategories(result.data || []);
    } catch (err) {
      setError(err.message || "Failed to load categories");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleAdd = () => {
    setEditingCategory(null);
    setFormOpen(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormOpen(true);
  };

  const handleFormSaved = () => {
    setFormOpen(false);
    setEditingCategory(null);
    loadCategories();
  };

  const handleDeleteConfirmed = () => {
    setDeletingCategory(null);
    loadCategories();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        {canManage && categories.length > 0 && (
          <button onClick={handleAdd} className={ui.btnPrimary}>
            <FiPlus /> Add Category
          </button>
        )}
      </div>

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {isOffline && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          <WifiOff className="h-3.5 w-3.5" />
          Offline — showing last-synced categories. Adding/editing needs a
          connection.
        </div>
      )}

      {loading ? (
        <div className={ui.card}>
          <Spinner />
        </div>
      ) : categories.length === 0 ? (
        <div className={ui.card}>
          <EmptyState
            icon="🍽️"
            title="No categories yet"
            subtitle="Categories group your menu items — Starters, Biryani, Beverages, and so on."
            actionLabel={canManage ? "Add your first category" : undefined}
            onAction={canManage ? handleAdd : undefined}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {categories.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              canManage={canManage}
              canDelete={canDelete}
              onEdit={handleEdit}
              onDelete={setDeletingCategory}
            />
          ))}
        </div>
      )}

      {formOpen && (
        <CategoryFormModal
          initial={editingCategory}
          onClose={() => setFormOpen(false)}
          onSaved={handleFormSaved}
        />
      )}

      {deletingCategory && (
        <DeleteConfirmModal
          category={deletingCategory}
          onClose={() => setDeletingCategory(null)}
          onConfirmed={handleDeleteConfirmed}
        />
      )}
    </div>
  );
};

export default Categories;
