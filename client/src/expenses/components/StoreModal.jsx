// client/src/expenses/components/StoreModal.jsx
import { useEffect, useState } from "react";
import { FiX, FiAlertCircle, FiHome } from "react-icons/fi";
import { ui } from "../expenseTheme";

const initialState = { name: "", address: "", phone: "" };

const StoreModal = ({ open, onClose, onSave, store = null, loading = false }) => {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(
      store
        ? { name: store.name || "", address: store.address || "", phone: store.phone || "" }
        : initialState,
    );
    setError("");
  }, [store, open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Give the store a name before saving.");
      return;
    }
    onSave(form);
  };

  return (
    <div className={ui.modalOverlay}>
      <div className={`${ui.modalCard} max-w-md max-h-[90vh]`}>
        <div className={ui.modalHeader}>
          <h2 className={`text-lg font-bold ${ui.heading}`}>{store ? "Edit Store" : "Add Store"}</h2>
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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 text-[#3FA34D] dark:text-[#43B75A]">
                <FiHome />
              </div>
              <div>
                <p className={`font-semibold ${ui.heading}`}>{form.name || "Store name"}</p>
                <p className={`text-xs ${ui.faint}`}>This is how it'll appear in the store picker</p>
              </div>
            </div>

            <div>
              <label className={ui.label}>
                Store Name <span className="text-[#EF5350]">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Anna Nagar Branch"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  setError("");
                }}
                className={ui.input}
              />
            </div>

            <div>
              <label className={ui.label}>
                Address <span className={`text-xs font-normal ${ui.faint}`}>(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Street, area, city"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className={`${ui.input} resize-none`}
              />
            </div>

            <div>
              <label className={ui.label}>
                Phone <span className={`text-xs font-normal ${ui.faint}`}>(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                className={ui.input}
              />
            </div>
          </div>

          <div className={ui.modalFooter}>
            <button type="button" onClick={onClose} className={ui.btnCancel}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={ui.btnPrimary}>
              {loading ? "Saving..." : store ? "Save Changes" : "Add Store"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreModal;
