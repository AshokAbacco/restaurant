// ==============================================
// src/landing/sections/LiveRail.jsx
// ==============================================

import { useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";

const RAIL_ITEMS = [
  {
    label: "Restaurant",
    emoji: "🍽️",
    tooltip: "Control your entire restaurant from one place",
    img: "../liveRail/res.png",
  },
  {
    label: "Order",
    emoji: "🧾",
    tooltip: "Create and manage customer orders instantly",
    img: "../liveRail/order.png",
  },
  {
    label: "Tables",
    emoji: "🪑",
    tooltip: "View and manage table availability live",
    img: "../liveRail/table.png",
  },
  {
    label: "Kitchen",
    emoji: "👨‍🍳",
    tooltip: "Send orders directly to kitchen display",
    img: "../liveRail/kitchen.png",
  },
  {
    label: "Billing",
    emoji: "💳",
    tooltip: "Generate fast and accurate bills",
    img: "../liveRail/bill.png",
  },
  {
    label: "Expenses",
    emoji: "📊",
    tooltip: "Monitor and control daily expenses",
    img: "../liveRail/ex.png",
  },
  {
    label: "Payments",
    emoji: "💰",
    tooltip: "Handle secure and smooth transactions",
    img: "../liveRail/pay.png",
  },
  {
    label: "Employee Management",
    emoji: "👥",
    tooltip: "Manage staff roles, shifts, and access",
    img: "../liveRail/emp.png",
  },
];

const LiveRail = () => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const refs = useRef([]);

  const now = useMemo(
    () =>
      new Date().toLocaleTimeString([], {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

const handleMouseEnter = (i) => {
  const rect = refs.current[i].getBoundingClientRect();

  setTooltipPos({
    x: rect.left + rect.width / 2, // ✅ relative to item
    y: rect.top,
  });

  setHoveredIndex(i);
};

  return (
    <section className="relative z-30 border-y border-[#EAE5D6] bg-[#FBFAF5]">
      
      {/* ✅ OUTER CONTAINER CENTERED */}
      <div className="mx-auto w-full max-w-8xl px-5 py-3.5 sm:px-8">
        
        {/* ✅ FLEX WRAPPER CENTER */}
        <div className="flex items-center justify-center gap-4 overflow-x-auto">
          
          {/* Clock */}
          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E3DEC9] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#171C17]">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3FA34D] opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3FA34D]" />
            </span>
            {now}
          </span>

          {/* Items */}
          <div className="flex flex-nowrap items-center justify-center gap-x-5">
            {RAIL_ITEMS.map((item, i) => (
              <div key={item.label} className="flex shrink-0 items-center gap-4">
                
                <div
                  ref={(el) => (refs.current[i] = el)}
                  className="flex items-center gap-2 cursor-pointer"
                  onMouseEnter={() => handleMouseEnter(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <img
                    src={item.img}
                    alt={item.label}
                    className="h-7 w-7 rounded-full object-cover"
                  />

                  <span className="whitespace-nowrap text-[13.5px] font-semibold text-[#171C17]">
                    {item.label}
                  </span>
                </div>

                {/* Divider */}
                {i < RAIL_ITEMS.length - 1 && (
                  <span className="block h-4 w-px bg-[#EAE5D6]" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ✅ TOOLTIP (TOP CENTER, PORTAL) */}
      {hoveredIndex !== null &&
        createPortal(
          <div
            className="fixed z-[9999] -translate-x-1/2 -translate-y-full rounded-lg border border-[#E3DEC9] bg-white px-3 py-2 text-[12px] font-medium text-green-800 shadow-[0_8px_20px_rgba(23,28,23,0.2)]"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y - 10,
            }}
          >
            <span className="mr-1">{RAIL_ITEMS[hoveredIndex].emoji}</span>
            {RAIL_ITEMS[hoveredIndex].tooltip}

            {/* Arrow */}
            <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 bg-white border-r border-b border-[#E3DEC9]" />
          </div>,
          document.body
        )}
    </section>
  );
};

export default LiveRail;