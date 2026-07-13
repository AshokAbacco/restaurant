// client/src/menu/components/DeleteItemConfirmModal.jsx
import React, { useState } from "react";
import { deleteMenuItem } from "../menuApi";
import { ui } from "../menuTheme";
import { ErrorBanner } from "../MenuUI";

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
    <div className={ui.modalOverlay}>
      <div className={`${ui.modalCard} max-w-sm p-6`}>
        <h2 className={`text-lg font-semibold ${ui.heading}`}>Delete menu item?</h2>
        <p className={`${ui.muted} text-sm mt-2`}>
          "{item.name}" will be marked as deleted and hidden from the menu.
        </p>
        {error && <div className="mt-3"><ErrorBanner>{error}</ErrorBanner></div>}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} disabled={deleting} className={ui.btnCancel}>
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting} className={ui.btnDanger}>
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteItemConfirmModal;
