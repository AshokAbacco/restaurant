// ==============================================
// src/kiosk/components/OrderBottomBar.jsx
// ==============================================

import React from "react";
import { FiChevronUp, FiChevronDown, FiShoppingBag } from "react-icons/fi";

const OrderBottomBar = ({
  expanded,
  onToggleExpand,
  itemCount,
  total,
  onOrderNow,
  onRestart,
  placingOrder,
}) => {
  return (
    <div className="w-full bg-white border-t border-black/[0.04] relative shrink-0">
      {/* Premium Centered Interaction Handle Toggle Badge */}
      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50">
        <button
          onClick={onToggleExpand}
          className="w-10 h-10 rounded-full bg-white border border-black/[0.05] shadow-[0_8px_20px_rgba(0,0,0,0.06)] flex items-center justify-center text-[#48484A] hover:text-[#EE6C2E] active:scale-90 transition-all"
        >
          {expanded ? (
            <FiChevronDown size={20} strokeWidth={2.5} />
          ) : (
            <FiChevronUp size={20} strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* Main Bar Wrapper - Centered perfectly to align with max-7xl grids */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-6 sm:px-10 py-5">
        {/* Left Side Navigation Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onRestart}
            className="px-5 py-3.5 rounded-2xl border border-black/[0.08] text-[#48484A] hover:bg-black/[0.02] font-bold text-sm transition-all active:scale-95"
          >
            Restart Menu
          </button>

          <button
            onClick={onOrderNow}
            disabled={itemCount === 0 || placingOrder}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#EE6C2E] to-[#F4894A] text-white font-black text-sm shadow-lg shadow-orange-500/10 disabled:opacity-40 flex items-center gap-2.5 transition-all active:scale-95 uppercase tracking-wide"
          >
            <FiShoppingBag size={15} strokeWidth={2.5} />
            <span>{placingOrder ? "Placing Order..." : "Order Now"}</span>

            {itemCount > 0 && !placingOrder && (
              <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-white text-[#EE6C2E] text-xs font-black flex items-center justify-center shadow-sm">
                {itemCount}
              </span>
            )}
          </button>
        </div>

        {/* Right Side Pricing Panel */}
        <div className="text-right">
          <span className="text-[#8E8E93] text-xs font-bold uppercase tracking-wider mr-2">
            Total Basket
          </span>
          <span className="text-2xl font-black tracking-tight text-[#1C1C1E]">
            ₹{total.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OrderBottomBar;
