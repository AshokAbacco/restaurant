// client/src/menu/pages/KitchenSections.jsx
import React, { useEffect, useState } from "react";
import { FiPlus, FiCoffee } from "react-icons/fi";
import { WifiOff } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ui, rowItem } from "../menuTheme";
import { Spinner, ErrorBanner } from "../MenuUI";
import {
  fetchKitchenSections,
  createKitchenSection,
  updateKitchenSection,
  deleteKitchenSection,
} from "../menuApi";
import { fetchWithOfflineFallbackResult } from "../../offline/offlineCache";

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
  const [isOffline, setIsOffline] = useState(false);

  // Read-only offline browsing — create/update/delete stay online-only.
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: result, fromCache } = await fetchWithOfflineFallbackResult(
        "menuAdmin:kitchenSections",
        fetchKitchenSections,
      );
      setIsOffline(fromCache);
      setSections(result.data || []);
    } catch (err) {
      setError(err.message || "Failed to load kitchen sections");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

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
    <div className="space-y-6">
      {canManage && (
        <div className={`${ui.card} p-4 flex gap-3`}>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Main Kitchen, Bakery, Bar, Juice Counter"
            className={`flex-1 ${ui.input}`}
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className={ui.btnPrimary}
          >
            <FiPlus /> Add
          </button>
        </div>
      )}

      {error && <ErrorBanner>{error}</ErrorBanner>}
      {isOffline && (
        <div className="mb-4 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          <WifiOff className="h-3.5 w-3.5" />
          Offline — showing last-synced kitchen sections. Adding/editing needs a
          connection.
        </div>
      )}

      <div className={`${ui.card} overflow-hidden`}>
        {loading ? (
          <Spinner />
        ) : sections.length === 0 ? (
          <div className={`text-center py-16 ${ui.muted}`}>
            <FiCoffee className={`mx-auto text-4xl ${ui.faint} mb-3`} />
            No kitchen sections yet — add Main Kitchen, Bakery, Bar, etc.
          </div>
        ) : (
          <div>
            {sections.map((section) => (
              <div key={section.id} className={rowItem}>
                {editingId === section.id ? (
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleUpdate(section.id)
                    }
                    autoFocus
                    className={`flex-1 ${ui.inputSm} mr-3 ring-2 ring-[#3FA34D]/30 dark:ring-[#43B75A]/30`}
                  />
                ) : (
                  <span className={`font-medium ${ui.heading}`}>
                    {section.name}
                  </span>
                )}
                <div className="flex gap-3 flex-shrink-0">
                  {editingId === section.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(section.id)}
                        className={`${ui.linkEdit} text-xs`}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className={`${ui.muted} text-xs font-medium hover:opacity-80`}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {canManage && (
                        <button
                          onClick={() => {
                            setEditingId(section.id);
                            setEditingName(section.name);
                          }}
                          className={ui.linkEdit}
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(section)}
                          className={ui.linkDanger}
                        >
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
