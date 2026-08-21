// client/src/menu/pages/AddOns.jsx
import React, { useEffect, useState } from "react";
import { FiPlus, FiTag } from "react-icons/fi";
import { WifiOff } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { ui, rowItem } from "../menuTheme";
import { Spinner, ErrorBanner } from "../MenuUI";
import { fetchAddOns, createAddOn, updateAddOn, deleteAddOn } from "../menuApi";
import { fetchWithOfflineFallbackResult } from "../../offline/offlineCache";

const AddOns = () => {
  const { canManageMenu, canDeleteMenuItems } = useAuth();
  const canManage = canManageMenu();
  const canDelete = canDeleteMenuItems();

  const [addOns, setAddOns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [saving, setSaving] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  // FEATURE: read-only offline browsing — this list falls back to the
  // last-synced copy if the network fails. Create/update/delete below are
  // deliberately NOT offline-capable: editing add-ons mid-outage isn't a
  // real scenario worth the conflict-resolution complexity (see the
  // scoping discussion this was built from).
  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const { data: result, fromCache } = await fetchWithOfflineFallbackResult(
        "menuAdmin:addons",
        fetchAddOns,
      );
      setIsOffline(fromCache);
      setAddOns(result.data || []);
    } catch (err) {
      setError(err.message || "Failed to load add-ons");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdd = async () => {
    if (!name.trim() || price === "") return;
    setSaving(true);
    const result = await createAddOn({
      name: name.trim(),
      price: Number(price),
    });
    setSaving(false);
    if (!result.ok) {
      alert(result.data?.message || "Failed to add");
      return;
    }
    setName("");
    setPrice("");
    loadData();
  };

  const handleUpdate = async (id) => {
    const result = await updateAddOn(id, {
      name: editName.trim(),
      price: Number(editPrice),
    });
    if (!result.ok) {
      alert(result.data?.message || "Failed to update");
      return;
    }
    setEditingId(null);
    loadData();
  };

  const handleDelete = async (addOn) => {
    if (!window.confirm(`Delete add-on "${addOn.name}"?`)) return;
    const result = await deleteAddOn(addOn.id);
    if (!result.ok) {
      alert(result.data?.message || "Failed to delete");
      return;
    }
    loadData();
  };

  return (
    <div className="space-y-6">
      {canManage && (
        <div className={`${ui.card} p-4 flex flex-col sm:flex-row gap-3`}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Extra Cheese"
            className={`flex-1 ${ui.input}`}
          />
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Price (₹)"
            className={`w-full sm:w-32 ${ui.input}`}
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
          Offline — showing last-synced add-ons. Adding/editing needs a
          connection.
        </div>
      )}

      <div className={`${ui.card} overflow-hidden`}>
        {loading ? (
          <Spinner />
        ) : addOns.length === 0 ? (
          <div className={`text-center py-16 ${ui.muted}`}>
            <FiTag className={`mx-auto text-4xl ${ui.faint} mb-3`} />
            No add-ons yet — e.g. Extra Cheese ₹40, Extra Chicken ₹70
          </div>
        ) : (
          <div>
            {addOns.map((addOn) => (
              <div key={addOn.id} className={rowItem}>
                {editingId === addOn.id ? (
                  <div className="flex gap-3 flex-1 mr-3">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={`flex-1 ${ui.inputSm} ring-2 ring-[#3FA34D]/30 dark:ring-[#43B75A]/30`}
                    />
                    <input
                      type="number"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      className={`w-24 ${ui.inputSm} ring-2 ring-[#3FA34D]/30 dark:ring-[#43B75A]/30`}
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${ui.heading}`}>
                      {addOn.name}
                    </span>
                    <span className={`text-sm ${ui.muted}`}>
                      ₹{Number(addOn.price).toFixed(2)}
                    </span>
                    {!addOn.isEnabled && (
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${ui.badgeGray}`}
                      >
                        Disabled
                      </span>
                    )}
                  </div>
                )}
                <div className="flex gap-3 flex-shrink-0">
                  {editingId === addOn.id ? (
                    <>
                      <button
                        onClick={() => handleUpdate(addOn.id)}
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
                            setEditingId(addOn.id);
                            setEditName(addOn.name);
                            setEditPrice(addOn.price);
                          }}
                          className={ui.linkEdit}
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(addOn)}
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

export default AddOns;
