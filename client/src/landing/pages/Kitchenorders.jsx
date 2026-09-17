import React from "react";
import { ChefHat, Clock, ListChecks, Circle, CheckCircle2, ChevronRight } from "lucide-react";

/**
 * Kitchen orders — landing page section
 * --------------------------------------------------------------
 * Left: marketing copy (eyebrow, heading, description, feature list)
 * Right: a static card mockup of what the kitchen actually sees,
 *        matching the "Table 12 · Order" card style from the
 *        Menu & ordering section.
 * --------------------------------------------------------------
 */

const FEATURES = [
  {
    title: "Grouped by station",
    description:
      "Grill, beverage, main kitchen — each ticket only shows the items that station has to cook.",
  },
  {
    title: "Status in one tap",
    description:
      "Pending, ready, served. One button moves the order along and the waiter's screen updates instantly.",
  },
  {
    title: "Delay timers built in",
    description:
      "Every ticket shows how long it's been sitting, so nothing quietly falls behind during a rush.",
  },
];

const ORDER_ITEMS = [
  { qty: 1, name: "Mixed Grill Platter" },
  { qty: 1, name: "Chicken Shawarma" },
  { qty: 2, name: "Kunafa" },
];

export default function KitchenOrders() {
  return (
    <section className="bg-[#FAF9F5] px-6 py-20 sm:px-10 lg:px-16">
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
        {/* Left: copy */}
        <div>
          <span className="text-sm font-medium text-emerald-700">Kitchen orders</span>
          <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            One tap, one order,
            <br />
            no shouting across the pass.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-500">
            Every order placed at the table, counter or online lands on the
            kitchen screen the moment it's sent — split by station, timed
            from the second it arrives.
          </p>

          <div className="mt-10 divide-y divide-slate-200 border-t border-slate-200">
            {FEATURES.map((f) => (
              <div key={f.title} className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[180px_1fr] sm:gap-6">
                <div className="font-small text-slate-900">{f.title}</div>
                <div className="text-sm leading-relaxed text-slate-500">{f.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: kitchen card mockup */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <ChefHat className="h-4 w-4 text-emerald-600" />
                  ORD-000019
                </div>
                <div className="mt-0.5 text-xs text-slate-400">
                  KOT-000035 · KOT-000036 · 4 items
                </div>
              </div>
              <div className="flex items-center gap-1 text-sm font-semibold text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                05:42
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700">
                Delivery
              </span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                Online
              </span>
            </div>

            <div className="mt-4 space-y-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Grill Station
                </div>
                <ul className="mt-1 space-y-0.5">
                  {ORDER_ITEMS.slice(0, 1).map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-sm text-slate-700">
                      <ListChecks className="h-3.5 w-3.5 text-slate-300" />
                      {item.qty} × {item.name}
                    </li>
                  ))}
                  {ORDER_ITEMS.slice(1, 2).map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-sm text-slate-700">
                      <ListChecks className="h-3.5 w-3.5 text-slate-300" />
                      {item.qty} × {item.name}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Main Kitchen
                </div>
                <ul className="mt-1 space-y-0.5">
                  {ORDER_ITEMS.slice(2, 3).map((item, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-sm text-slate-700">
                      <ListChecks className="h-3.5 w-3.5 text-slate-300" />
                      {item.qty} × {item.name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mt-4">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <Circle className="h-3 w-3" />
                Ready
              </span>
            </div>

            <button className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white">
              Mark served
              <ChevronRight className="h-4 w-4" />
            </button>
            <p className="mt-1.5 text-center text-xs text-slate-400">
              Applies to all 2 station tickets
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}