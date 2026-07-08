// client/src/menu/components/ItemExtrasModal.jsx
import React, { useEffect, useState } from "react";
import { FiX } from "react-icons/fi";
import {
  fetchVariants, createVariant, deleteVariant,
  fetchAddOnsForItem, attachAddOnToItem, detachAddOnFromItem,
} from "../menuApi";

const ItemExtrasModal = ({ item, allAddOns, canManage, onClose }) => {
  const [variants, setVariants] = useState([]);
  const [attachedAddOns, setAttachedAddOns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [variantName, setVariantName] = useState("");
  const [variantPrice, setVariantPrice] = useState("");
  const [selectedAddOnId, setSelectedAddOnId] = useState("");

  const loadExtras = async () => {
    setLoading(true);
    const [v, a] = await Promise.all([fetchVariants(item.id), fetchAddOnsForItem(item.id)]);
    if (v.ok) setVariants(v.data.data || []);
    if (a.ok) setAttachedAddOns(a.data.data || []);
    setLoading(false);
  };

  useEffect(() => { loadExtras(); }, [item.id]);

  const handleAddVariant = async () => {
    if (!variantName.trim() || variantPrice === "") return;
    const result = await createVariant(item.id, { name: variantName.trim(), price: Number(variantPrice) });
    if (!result.ok) { alert(result.data?.message || "Failed to add variant"); return; }
    setVariantName(""); setVariantPrice("");
    loadExtras();
  };

  const handleDeleteVariant = async (id) => { await deleteVariant(id); loadExtras(); };

  const handleAttachAddOn = async () => {
    if (!selectedAddOnId) return;
    const result = await attachAddOnToItem(item.id, selectedAddOnId);
    if (!result.ok) { alert(result.data?.message || "Failed to attach add-on"); return; }
    setSelectedAddOnId("");
    loadExtras();
  };

  const handleDetachAddOn = async (addOnId) => { await detachAddOnFromItem(item.id, addOnId); loadExtras(); };

  const availableAddOns = allAddOns.filter((a) => !attachedAddOns.some((l) => l.addOnId === a.id));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{item.name}</h2>
            <p className="text-sm text-gray-500">Variants & Add-ons</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : (
          <div className="px-6 py-5 space-y-6">
            <div>
              <h3 className="font-medium text-gray-800 mb-3">Variants</h3>
              {variants.length === 0 ? (
                <p className="text-sm text-gray-400 mb-3">No variants — e.g. Small ₹80, Medium ₹120, Large ₹150</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {variants.map((v) => (
                    <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-700">{v.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">₹{Number(v.price).toFixed(2)}</span>
                        {canManage && <button onClick={() => handleDeleteVariant(v.id)} className="text-gray-400 hover:text-red-600"><FiX size={14} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {canManage && (
                <div className="flex gap-2">
                  <input type="text" value={variantName} onChange={(e) => setVariantName(e.target.value)} placeholder="e.g. Small" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <input type="number" value={variantPrice} onChange={(e) => setVariantPrice(e.target.value)} placeholder="Price" className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <button onClick={handleAddVariant} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Add</button>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-3">Add-ons available for this item</h3>
              {attachedAddOns.length === 0 ? (
                <p className="text-sm text-gray-400 mb-3">No add-ons attached yet</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {attachedAddOns.map((link) => (
                    <div key={link.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-700">{link.addOn?.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-gray-900">₹{Number(link.addOn?.price ?? 0).toFixed(2)}</span>
                        {canManage && <button onClick={() => handleDetachAddOn(link.addOnId)} className="text-gray-400 hover:text-red-600"><FiX size={14} /></button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {canManage && availableAddOns.length > 0 && (
                <div className="flex gap-2">
                  <select value={selectedAddOnId} onChange={(e) => setSelectedAddOnId(e.target.value)} className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select an add-on to attach</option>
                    {availableAddOns.map((a) => <option key={a.id} value={a.id}>{a.name} — ₹{Number(a.price).toFixed(2)}</option>)}
                  </select>
                  <button onClick={handleAttachAddOn} className="px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">Attach</button>
                </div>
              )}
              {allAddOns.length === 0 && (
                <p className="text-xs text-gray-400">No add-ons exist yet — create some on the Add-ons tab first.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemExtrasModal;