// ==============================================
// src/landing/sections/LiveRail.jsx
// ==============================================

import { useMemo, useState } from "react";

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

  const now = useMemo(
    () =>
      new Date().toLocaleTimeString([], {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      }),
    []
  );

  return (
    <section
      aria-label="What the system handles during a service"
      className="relative z-30 border-y border-[#EAE5D6] bg-[#FBFAF5]"
    >
      <div className="mx-auto flex w-full max-w-8l flex-nowrap items-center gap-4 overflow-x-auto px-5 py-3.5 sm:px-8">
        
        {/* Live clock */}
        <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#E3DEC9] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[#171C17] shadow-[0_1px_2px_rgba(23,28,23,0.04)]">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#3FA34D] opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#3FA34D]" />
          </span>
          {now}
        </span>

        {/* Items */}
        <div className="flex min-w-0 flex-1 flex-nowrap items-center gap-x-5 gap-y-3">
          {RAIL_ITEMS.map((item, i) => (
            <div key={item.label} className="flex shrink-0 items-center gap-4">
              
              <div
                className="relative flex items-center gap-2"
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                onFocus={() => setHoveredIndex(i)}
                onBlur={() => setHoveredIndex(null)}
                tabIndex={0}
              >
                <img
                  src={item.img}
                  alt={item.label}
                  className="h-7 w-7 shrink-0 rounded-full object-cover"
                />

                <span className="whitespace-nowrap text-[13.5px] font-semibold text-[#171C17]">
                  {item.label}
                </span>

                {/* ✅ FIXED TOOLTIP */}
                {hoveredIndex === i && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute bottom-full left-1/2 z-[999] mb-3 w-max max-w-[220px] -translate-x-1/2 rounded-lg border border-[#E3DEC9] bg-white px-3 py-2 text-center text-[12px] font-medium leading-snug text-green-800 shadow-[0_4px_12px_rgba(23,28,23,0.18)]"
                  >
                    <span className="mr-1">{item.emoji}</span>
                    {item.tooltip}

                    {/* ✅ FIXED ARROW */}
                    <span className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 rotate-45 bg-white border-r border-b border-[#E3DEC9]" />
                  </div>
                )}
              </div>

              {/* Divider */}
              {i < RAIL_ITEMS.length - 1 && (
                <span className="block h-4 w-px shrink-0 bg-[#EAE5D6]" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LiveRail;