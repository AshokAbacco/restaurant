// ==============================================
// src/expenses/components/StoreModal.jsx
// ==============================================

import { useEffect, useState } from "react";
import { FiX, FiAlertCircle, FiHome } from "react-icons/fi";

const initialState = { name: "", address: "", phone: "" };

const StoreModal = ({ open, onClose, onSave, store = null, loading = false }) => {
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm(
      store
        ? {
            name: store.name || "",
            address: store.address || "",
            phone: store.phone || "",
          }
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
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-bold text-gray-800">
            {store ? "Edit Store" : "Add Store"}
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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl bg-blue-50 text-blue-600">
                <FiHome />
              </div>
              <div>
                <p className="font-semibold text-gray-800">{form.name || "Store name"}</p>
                <p className="text-xs text-gray-400">This is how it'll appear in the store picker</p>
              </div>
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1 font-medium text-gray-700">
                Store Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Anna Nagar Branch"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  setError("");
                }}
                className="w-full rounded-lg border px-4 py-2.5 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1 font-medium text-gray-700">
                Address <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Street, area, city"
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
                className="w-full rounded-lg border px-4 py-2.5 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              <label className="mb-2 flex items-center gap-1 font-medium text-gray-700">
                Phone <span className="text-xs font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. +91 98765 43210"
                value={form.phone}
                onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
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
              {loading ? "Saving..." : store ? "Save Changes" : "Add Store"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StoreModal;