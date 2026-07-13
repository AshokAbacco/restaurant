// ==============================================
// src/kiosk/components/ItemCustomizeModal.jsx
// ==============================================
// Replaces the old FoodDetailsModal with the reference kiosk's pattern:
//   - if the item has size variants (from MenuItem.variants), show a
//     size-card picker instead of a single price
//   - free (price 0) add-ons render as simple toggle pills ("Onion",
//     "Cheese"...) since there's nothing to count
//   - priced add-ons render as a "Promotion" section with qty steppers
//   - a small cross-sell strip of other menu items, also with steppers,
//     which get added to the cart as their own separate lines

import React, { useEffect, useMemo, useState } from "react";
import { FiX, FiPlus, FiMinus } from "react-icons/fi";
import { fetchAddOnsForItem, KioskApiError } from "../services/kioskApi";

const ItemCustomizeModal = ({ open, item, allItems = [], onClose, onAddToCart }) => {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [addOns, setAddOns] = useState([]);
  const [addOnsLoading, setAddOnsLoading] = useState(false);
  const [toggledFreeAddOnIds, setToggledFreeAddOnIds] = useState([]);
  const [pricedAddOnQty, setPricedAddOnQty] = useState({}); // { addOnId: qty }

  const [crossSellQty, setCrossSellQty] = useState({}); // { menuItemId: qty }

  useEffect(() => {
    if (open && item?.id) {
      setSelectedVariant(item.variants?.[0] || null);
      setQuantity(1);
      setToggledFreeAddOnIds([]);
      setPricedAddOnQty({});
      setCrossSellQty({});

      setAddOnsLoading(true);
      fetchAddOnsForItem(item.id)
        .then(setAddOns)
        .catch((err) => {
          if (!(err instanceof KioskApiError)) console.error(err);
          setAddOns([]);
        })
        .finally(() => setAddOnsLoading(false));
    }
  }, [open, item?.id]);

  const freeAddOns = useMemo(() => addOns.filter((a) => a.price === 0), [addOns]);
  const pricedAddOns = useMemo(() => addOns.filter((a) => a.price > 0), [addOns]);

  // A handful of other items (different category) as upsell suggestions —
  // simple, honest cross-sell: no hidden "recommendation engine" claim.
  const crossSellItems = useMemo(() => {
    if (!item) return [];
    return allItems.filter((i) => i.category !== item.category).slice(0, 4);
  }, [allItems, item]);

  if (!open || !item) return null;

  const toggleFreeAddOn = (id) => {
    setToggledFreeAddOnIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const bumpPricedAddOn = (id, delta) => {
    setPricedAddOnQty((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  };

  const bumpCrossSell = (id, delta) => {
    setCrossSellQty((prev) => {
      const next = Math.max(0, (prev[id] || 0) + delta);
      return { ...prev, [id]: next };
    });
  };

  const baseUnitPrice = selectedVariant ? selectedVariant.price : item.price;

  const pricedAddOnsTotal = pricedAddOns.reduce(
    (sum, a) => sum + (pricedAddOnQty[a.id] || 0) * a.price,
    0,
  );

  const unitPrice = baseUnitPrice + pricedAddOnsTotal;
  const lineTotal = unitPrice * quantity;

  const crossSellTotal = crossSellItems.reduce(
    (sum, ci) => sum + (crossSellQty[ci.id] || 0) * ci.price,
    0,
  );

  const grandTotal = lineTotal + crossSellTotal;

  const handleAdd = () => {
    const selectedAddOnIds = pricedAddOns
      .filter((a) => (pricedAddOnQty[a.id] || 0) > 0)
      .map((a) => a.id);

    const modifierNotes = [
      ...toggledFreeAddOnIds.map((id) => freeAddOns.find((a) => a.id === id)?.name).filter(Boolean),
    ];
    const notes = modifierNotes.length ? modifierNotes.join(", ") : undefined;

    const mainLine = {
      ...item,
      price: unitPrice,
      variantName: selectedVariant?.name,
      addOnIds: selectedAddOnIds,
      notes,
    };

    const extraLines = crossSellItems
      .filter((ci) => (crossSellQty[ci.id] || 0) > 0)
      .map((ci) => ({ item: ci, quantity: crossSellQty[ci.id] }));

    onAddToCart(mainLine, quantity, extraLines);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full sm:max-w-2xl sm:rounded-[32px] rounded-t-[32px] max-h-[90vh] overflow-y-auto">
        {/* Close */}
        <div className="sticky top-0 bg-white z-10 flex justify-end p-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#F3ECE1] flex items-center justify-center text-[#8A8378]"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="px-8 pb-8 -mt-8">
          {/* Image + name/price */}
          <div className="flex justify-center">
            <img src={item.image} alt={item.name} className="w-48 h-48 object-cover rounded-2xl" />
          </div>

          <h2 className="text-center text-2xl font-extrabold text-[#241F19] mt-4">{item.name}</h2>
          <p className="text-center text-[#EE6C2E] text-xl font-bold mt-1">
            ₹{unitPrice.toFixed(2)}
          </p>

          {/* Quantity stepper */}
          <div className="flex justify-center items-center gap-6 mt-5">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-11 h-11 rounded-full bg-[#F3ECE1] text-[#8A8378] flex items-center justify-center"
            >
              <FiMinus />
            </button>
            <span className="text-xl font-bold w-6 text-center">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-11 h-11 rounded-full bg-[#EE6C2E] text-white flex items-center justify-center"
            >
              <FiPlus />
            </button>
          </div>

          {/* Size variants (e.g. Small / Large / Regular) */}
          {item.variants?.length > 0 && (
            <div className="mt-8">
              <div className="grid grid-cols-3 gap-4">
                {item.variants.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`rounded-2xl border-2 p-4 text-center transition ${
                      selectedVariant?.id === v.id
                        ? "border-[#EE6C2E] bg-[#FFF1E6]"
                        : "border-[#F0E9DC]"
                    }`}
                  >
                    <p className="font-bold text-[#241F19]">{v.name}</p>
                    <p className="text-[#EE6C2E] font-semibold mt-1">₹{v.price.toFixed(2)}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Free modifiers (Onion, Cheese, Lettuce...) */}
          {!addOnsLoading && freeAddOns.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              {freeAddOns.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleFreeAddOn(a.id)}
                  className={`px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition ${
                    toggledFreeAddOnIds.includes(a.id)
                      ? "border-[#EE6C2E] bg-[#FFF1E6] text-[#EE6C2E]"
                      : "border-[#F0E9DC] text-[#8A8378]"
                  }`}
                >
                  {a.name}
                </button>
              ))}
            </div>
          )}

          {/* Priced add-ons, e.g. Sauces */}
          {!addOnsLoading && pricedAddOns.length > 0 && (
            <div className="mt-8">
              <h3 className="text-center font-bold text-[#241F19] mb-4">Add extra</h3>
              <div className="grid grid-cols-2 gap-4">
                {pricedAddOns.map((a) => (
                  <div key={a.id} className="rounded-2xl bg-[#F9F5EE] p-4 text-center">
                    <p className="font-semibold text-[#241F19] text-sm">{a.name}</p>
                    <p className="text-[#EE6C2E] font-bold text-sm mt-1">₹{a.price.toFixed(2)}</p>
                    <div className="flex items-center justify-center gap-3 mt-2">
                      <button
                        onClick={() => bumpPricedAddOn(a.id, -1)}
                        className="w-7 h-7 rounded-full bg-white text-[#8A8378] flex items-center justify-center"
                      >
                        <FiMinus size={12} />
                      </button>
                      <span className="font-bold text-sm w-4 text-center">
                        {pricedAddOnQty[a.id] || 0}
                      </span>
                      <button
                        onClick={() => bumpPricedAddOn(a.id, 1)}
                        className="w-7 h-7 rounded-full bg-[#EE6C2E] text-white flex items-center justify-center"
                      >
                        <FiPlus size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-sell / promotion */}
          {crossSellItems.length > 0 && (
            <div className="mt-8">
              <h3 className="text-center font-bold text-[#241F19] mb-4">Add to your order</h3>
              <div className="grid grid-cols-4 gap-3">
                {crossSellItems.map((ci) => (
                  <div key={ci.id} className="text-center">
                    <img
                      src={ci.image}
                      alt={ci.name}
                      className="w-full aspect-square object-cover rounded-xl"
                    />
                    <p className="text-xs font-semibold text-[#241F19] mt-1.5 truncate">{ci.name}</p>
                    <p className="text-xs text-[#EE6C2E] font-bold">₹{ci.price.toFixed(2)}</p>
                    <div className="flex items-center justify-center gap-2 mt-1.5">
                      <button
                        onClick={() => bumpCrossSell(ci.id, -1)}
                        className="w-6 h-6 rounded-full bg-[#F3ECE1] text-[#8A8378] flex items-center justify-center"
                      >
                        <FiMinus size={10} />
                      </button>
                      <span className="text-xs font-bold w-3 text-center">
                        {crossSellQty[ci.id] || 0}
                      </span>
                      <button
                        onClick={() => bumpCrossSell(ci.id, 1)}
                        className="w-6 h-6 rounded-full bg-[#EE6C2E] text-white flex items-center justify-center"
                      >
                        <FiPlus size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Done */}
          <button
            onClick={handleAdd}
            className="mt-10 w-full h-14 rounded-2xl bg-[#EE6C2E] text-white font-bold text-lg flex items-center justify-center gap-3"
          >
            Done · ₹{grandTotal.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ItemCustomizeModal;
