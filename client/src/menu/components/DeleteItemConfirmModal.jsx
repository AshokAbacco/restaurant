// client/src/menu/components/DeleteItemConfirmModal.jsx
import React, { useState } from "react";
import { deleteMenuItem } from "../menuApi";

const DeleteItemConfirmModal = ({ item, onClose, onConfirmed }) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleDelete = async () => {
    setDeleting(true);
    setError("");
    const result = await deleteMenuItem(item.id);
    if (!result.ok) {
      setError(result.data?.message || "Failed to delete item");
      setDeleting(false);
      return;
    }
    onConfirmed();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900">Delete menu item?</h2>
        <p className="text-gray-500 text-sm mt-2">
          "{item.name}" will be marked as deleted and hidden from the menu.
        </p>
        {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg mt-3">{error}</div>}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60">
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteItemConfirmModal;