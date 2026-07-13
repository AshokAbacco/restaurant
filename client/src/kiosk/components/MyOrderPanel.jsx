// ==============================================
// src/kiosk/components/MyOrderPanel.jsx
// ==============================================

import React from "react";
import { FiPlus, FiMinus, FiTrash2, FiShoppingBag } from "react-icons/fi";

const MyOrderPanel = ({
  cart = [],
  orderType,
  onChangeOrderType,
  onUpdateQuantity,
  onRemove,
}) => {
  return (
    <div className="w-full bg-white rounded-t-[36px] shadow-[0_-20px_60px_rgba(0,0,0,0.04)] border-t border-x border-black/[0.02] relative transform transition-transform duration-300">
      {/* 
        The pb-8 (padding-bottom) here is crucial. 
        It ensures the content doesn't crash into the floating chevron button from the BottomBar.
      */}
      <div className="w-full max-w-7xl mx-auto px-6 sm:px-10 pt-8 pb-8">
        {/* Header & Order Type Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-black/[0.04] pb-5 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#EE6C2E] flex items-center justify-center">
              <FiShoppingBag size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight text-[#1C1C1E]">
                My Order
              </h2>
              <p className="text-xs font-bold text-[#8E8E93] uppercase tracking-wider">
                {cart.length} {cart.length === 1 ? "Item" : "Items"} in basket
              </p>
            </div>
          </div>

          {/* Premium Glassmorphic Segment Control */}
          <div className="flex bg-black/[0.03] p-1 rounded-xl border border-black/[0.02] self-start sm:self-auto">
            <button
              onClick={() => onChangeOrderType("DINE_IN")}
              className={`px-5 py-2 rounded-lg text-xs font-bold tracking-tight transition-all duration-200 ${
                orderType === "DINE_IN"
                  ? "bg-white text-[#EE6C2E] shadow-sm"
                  : "text-[#8E8E93] hover:text-[#48484A]"
              }`}
            >
              Eat In
            </button>
            <button
              onClick={() => onChangeOrderType("TAKEAWAY")}
              className={`px-5 py-2 rounded-lg text-xs font-bold tracking-tight transition-all duration-200 ${
                orderType === "TAKEAWAY"
                  ? "bg-white text-[#EE6C2E] shadow-sm"
                  : "text-[#8E8E93] hover:text-[#48484A]"
              }`}
            >
              Take Out
            </button>
          </div>
        </div>

        {/* Cart Line Items Viewport */}
        <div className="max-h-[35vh] overflow-y-auto scrollbar-none mt-2 pt-2">
          {cart.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-black/[0.02] rounded-full flex items-center justify-center text-[#8E8E93]/30 mb-3">
                <FiShoppingBag size={28} strokeWidth={2} />
              </div>
              <p className="text-[#8E8E93] font-bold text-sm">
                Your basket is currently empty.
              </p>
              <p className="text-[#8E8E93]/60 font-medium text-xs mt-1">
                Tap an item to add it to your order.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map((line) => (
                <div
                  key={line.cartLineId}
                  className="flex items-center justify-between bg-white border border-black/[0.03] p-4 rounded-2xl hover:border-orange-500/20 transition-colors shadow-sm"
                >
                  <div className="flex-1 pr-4">
                    <h3 className="font-black text-[#1C1C1E] tracking-tight line-clamp-1 text-base">
                      {line.name}
                    </h3>
                    <p className="text-xs font-bold text-[#EE6C2E] mt-0.5">
                      ₹{line.price.toFixed(2)}{" "}
                      <span className="text-[#8E8E93] font-medium ml-1">
                        each
                      </span>
                    </p>

                    {/* Add-ons rendering if applicable */}
                    {line.addOnIds && line.addOnIds.length > 0 && (
                      <p className="text-[10px] text-[#8E8E93] font-bold uppercase tracking-wider mt-1.5">
                        + {line.addOnIds.length} Customization(s)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Line Total */}
                    <p className="font-black text-lg text-[#1C1C1E]">
                      ₹{(line.price * line.quantity).toFixed(2)}
                    </p>

                    {/* Modern Quantity Controls */}
                    <div className="flex items-center bg-black/[0.03] rounded-xl border border-black/[0.02] p-1">
                      <button
                        onClick={() =>
                          onUpdateQuantity(line.cartLineId, line.quantity - 1)
                        }
                        className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#1C1C1E] shadow-sm hover:text-red-500 active:scale-90 transition-all"
                      >
                        {line.quantity === 1 ? (
                          <FiTrash2 size={14} />
                        ) : (
                          <FiMinus size={14} strokeWidth={3} />
                        )}
                      </button>

                      <span className="w-10 text-center font-black text-sm text-[#1C1C1E]">
                        {line.quantity}
                      </span>

                      <button
                        onClick={() =>
                          onUpdateQuantity(line.cartLineId, line.quantity + 1)
                        }
                        className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-[#1C1C1E] shadow-sm hover:text-[#EE6C2E] active:scale-90 transition-all"
                      >
                        <FiPlus size={14} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyOrderPanel;
