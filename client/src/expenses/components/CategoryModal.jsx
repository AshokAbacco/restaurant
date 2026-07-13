// client/src/expenses/components/CategoryModal.jsx
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
import { ui } from "../expenseTheme";

const initialState = { name: "", description: "", icon: "FiTag", color: "green" };

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
  green: { bg: "bg-[#3FA34D]/10 dark:bg-[#43B75A]/15", text: "text-[#3FA34D] dark:text-[#43B75A]", dot: "bg-[#3FA34D] dark:bg-[#43B75A]" },
  amber: { bg: "bg-[#FFA94D]/15", text: "text-[#E8873A] dark:text-[#FFA94D]", dot: "bg-[#E8873A]" },
  rose: { bg: "bg-[#EF5350]/10", text: "text-[#EF5350]", dot: "bg-[#EF5350]" },
  slate: { bg: "bg-[#F3F5EE] dark:bg-[#232A22]", text: "text-[#6B7280] dark:text-[#9CA8A0]", dot: "bg-[#6B7280] dark:bg-[#9CA8A0]" },
  teal: { bg: "bg-[#3FA34D]/5 dark:bg-[#43B75A]/10", text: "text-[#358F42] dark:text-[#43B75A]", dot: "bg-[#358F42] dark:bg-[#43B75A]" },
  indigo: { bg: "bg-[#6B7280]/10 dark:bg-[#9CA8A0]/10", text: "text-[#4B5563] dark:text-[#D1D5DB]", dot: "bg-[#4B5563] dark:bg-[#9CA8A0]" },
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
            color: category.color || "green",
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

  const palette = COLORS[form.color] || COLORS.green;

  return (
    <div className={ui.modalOverlay}>
      <div className={`${ui.modalCard} max-w-md max-h-[90vh]`}>
        <div className={ui.modalHeader}>
          <h2 className={`text-lg font-bold ${ui.heading}`}>
            {category ? "Edit Category" : "Add Category"}
          </h2>
          <button onClick={onClose} className={`${ui.faint} hover:text-[#1F2937] dark:hover:text-white`}>
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1">
          <div className="space-y-5 p-6 overflow-y-auto flex-1">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-[#EF5350]/10 text-[#EF5350] text-sm px-4 py-3">
                <FiAlertCircle /> {error}
              </div>
            )}

            {/* Live preview */}
            <div className={`flex items-center gap-3 rounded-2xl border border-dashed ${ui.card} p-4`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${palette.bg} ${palette.text}`}>
                {ICONS[form.icon]}
              </div>
              <div>
                <p className={`font-semibold ${ui.heading}`}>{form.name || "Category name"}</p>
                <p className={`text-xs ${ui.faint}`}>This is how it'll look in your category list</p>
              </div>
            </div>

            <div>
              <label className={ui.label}>
                Category Name <span className="text-[#EF5350]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Utilities"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  setError("");
                }}
                className={ui.input}
              />
            </div>

            {/* Icon picker */}
            <div>
              <label className={`mb-2 block font-medium ${ui.heading}`}>Icon</label>
              <div className="grid grid-cols-5 gap-2">
                {Object.entries(ICONS).map(([key, node]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, icon: key }))}
                    className={`flex items-center justify-center rounded-xl border-2 py-2.5 text-lg transition-colors ${
                      form.icon === key
                        ? `${palette.bg} ${palette.text} border-current`
                        : "border-[#E7EAE1] dark:border-[#262B24] text-[#9CA3AF] dark:text-[#6B7280] hover:border-[#3FA34D]/30"
                    }`}
                  >
                    {node}
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div>
              <label className={`mb-2 block font-medium ${ui.heading}`}>Color</label>
              <div className="flex gap-2.5">
                {Object.entries(COLORS).map(([key, c]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, color: key }))}
                    className={`w-8 h-8 rounded-full ${c.dot} ${
                      form.color === key ? "ring-2 ring-offset-2 ring-[#3FA34D] dark:ring-[#43B75A] dark:ring-offset-[#171C17]" : ""
                    }`}
                    aria-label={key}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className={ui.label}>
                Description <span className={`text-xs font-normal ${ui.faint}`}>(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="What kind of expenses go here?"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className={`${ui.input} resize-none`}
              />
            </div>
          </div>

          <div className={ui.modalFooter}>
            <button type="button" onClick={onClose} className={ui.btnCancel}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={ui.btnPrimary}>
              {loading ? "Saving..." : category ? "Save Changes" : "Add Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;
