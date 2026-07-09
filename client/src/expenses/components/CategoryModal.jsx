// ==============================================
// src/expenses/components/CategoryModal.jsx
// v2 — icon + color picker with a live preview tile,
// so the category looks the same here as it does everywhere else.
// ==============================================

import { useEffect, useState } from "react";
import {
  FiX,
  FiAlertCircle,
  FiHome,
  FiZap,
  FiUsers,
  FiTruck,
  FiTool,
  FiTag,
  FiShoppingBag,
  FiWifi,
  FiTrendingUp,
  FiCoffee,
} from "react-icons/fi";

const initialState = { name: "", description: "", icon: "FiTag", color: "blue" };

// Icon choices — stored as a string key so it's easy to persist later
// (backend only has name/description today; icon+color stay client-side
// until an `icon`/`color` column is added to ExpenseCategory).
const ICONS = {
  FiHome: <FiHome />,
  FiZap: <FiZap />,
  FiUsers: <FiUsers />,
  FiTruck: <FiTruck />,
  FiTool: <FiTool />,
  FiShoppingBag: <FiShoppingBag />,
  FiWifi: <FiWifi />,
  FiTrendingUp: <FiTrendingUp />,
  FiCoffee: <FiCoffee />,
  FiTag: <FiTag />,
};

const COLORS = {
  blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-600", dot: "bg-blue-500" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-600", dot: "bg-emerald-500" },
  amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-600", dot: "bg-amber-500" },
  pink: { bg: "bg-pink-50", text: "text-pink-600", ring: "ring-pink-600", dot: "bg-pink-500" },
  indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-600", dot: "bg-indigo-500" },
  rose: { bg: "bg-rose-50", text: "text-rose-600", ring: "ring-rose-600", dot: "bg-rose-500" },
};

const CategoryModal = ({ open, onClose, onSave, category = null, loading = false }) => {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(
      category
        ? {
            name: category.name || "",
            description: category.description || "",
            icon: category.icon || "FiTag",
            color: category.color || "blue",
          }
        : initialState,
    );
    setError("");
  }, [category, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Give the category a name before saving.");
      return;
    }
    onSave(form);
  };

  const palette = COLORS[form.color];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold text-gray-800">
            {category ? "Edit Category" : "Add Category"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 p-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 text-red-600 text-sm px-4 py-3">
                <FiAlertCircle /> {error}
              </div>
            )}

            {/* Live preview */}
            <div className="flex items-center gap-3 rounded-2xl border border-dashed border-gray-200 p-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${palette.bg} ${palette.text}`}>
                {ICONS[form.icon]}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{form.name || "Category name"}</p>
                <p className="text-xs text-gray-400">This is how it'll look in your category list</p>
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1 font-medium text-gray-700">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Utilities"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  setError("");
                }}
                className="w-full rounded-lg border px-4 py-2.5 outline-none focus:border-blue-600"
              />
            </div>

            {/* Icon picker */}
            <div>
              <label className="mb-2 block font-medium text-gray-700">Icon</label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(ICONS).map(([key, node]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, icon: key }))}
                    className={`flex items-center justify-center rounded-xl border-2 py-2.5 text-lg transition-colors ${
                      form.icon === key
                        ? `${palette.bg} ${palette.text} border-current`
                        : "border-gray-200 text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    {node}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className="mb-2 block font-medium text-gray-700">Color</label>
              <div className="flex gap-2.5">
                {Object.entries(COLORS).map(([key, c]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, color: key }))}
                    className={`w-8 h-8 rounded-full ${c.dot} ${
                      form.color === key ? "ring-2 ring-offset-2 ring-gray-400" : ""
                    }`}
                    aria-label={key}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1 font-medium text-gray-700">
                Description <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="What kind of expenses go here?"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-lg border px-4 py-2.5 outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-400"
            >
              {loading ? "Saving..." : category ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;