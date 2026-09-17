// ==============================================
// src/landing/sections/TableFloor.jsx
// ==============================================
//
// Table management.
//
// Mirrored against the section above — picture on the left this time —
// so the page has a rhythm instead of a column of identical rows.
//
// Every tile states its condition in words as well as colour. A floor
// plan that only speaks in colour is unusable for the roughly one in
// twelve men who can't reliably separate the red one from the green one,
// and this is a working tool, not a chart.

import { TABLES_SECTION } from "../landing.config";
import { useReveal } from "../hooks/useLandingMotion";

const STATE_LABELS = {
  free: "Free",
  seated: "Seated",
  ordered: "Ordered",
  billed: "Billed",
  reserved: "Reserved",
};

// ==============================================
// FLOOR PLAN MINIATURE
// ==============================================

const FloorPlan = ({ tables, legend }) => (
  <figure className="overflow-hidden rounded-[26px] border border-[#e0e4d8] bg-white shadow-[0_36px_80px_-52px_rgba(23,28,23,0.7)]">
    <div className="flex items-center justify-between border-b border-[#e0e4d8] bg-[#F3F5EE] px-5 py-3.5">
      <span className="lp-title text-[15px] text-[#171C17]">
        Ground floor
      </span>

      <span className="flex items-center gap-2 text-[12px] text-[#6B7280]">
        <span className="lp-pulse block h-1.5 w-1.5 rounded-full bg-[#3FA34D]" />
        Live
      </span>
    </div>

    <ul className="grid grid-cols-3 gap-2.5 p-4 sm:grid-cols-4">
      {tables.map((table) => (
        <li
          key={table.label}
          data-state={table.state}
          className="lp-table rounded-xl border px-2.5 py-3 text-center"
        >
          <span className="lp-nums block text-[14px] font-bold">
            {table.label}
          </span>

          <span className="mt-1 block text-[11px] font-medium">
            {STATE_LABELS[table.state]}
          </span>

          <span className="lp-nums mt-0.5 block text-[10.5px] opacity-70">
            {table.seats} seats
          </span>
        </li>
      ))}
    </ul>

    <ul className="flex flex-wrap gap-x-4 gap-y-2 border-t border-[#e0e4d8] px-5 py-3.5">
      {legend.map((item) => (
        <li
          key={item.state}
          className="flex items-center gap-1.5 text-[12px] text-[#6B7280]"
        >
          <span
            data-state={item.state}
            aria-hidden="true"
            className="lp-table block h-3 w-3 rounded-[5px] border"
          />
          {item.label}
        </li>
      ))}
    </ul>

    <figcaption className="border-t border-[#e0e4d8] px-5 py-3 text-[12.5px] text-[#6B7280]">
      The floor plan at the counter, updating as service runs.
    </figcaption>
  </figure>
);

// ==============================================
// SECTION
// ==============================================

const TableFloor = () => {
  const copyRef = useReveal();
  const artRef = useReveal();

  return (
    <section id="tables" className="border-b border-[#e0e4d8] bg-white/50">
      <div className="mx-auto grid w-full max-w-[1240px] grid-cols-1 items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-20 lg:py-28">
        <div ref={artRef} className="lp-reveal lg:order-1 lg:pr-6">
          <FloorPlan
            tables={TABLES_SECTION.floor}
            legend={TABLES_SECTION.legend}
          />
        </div>

        <div
          ref={copyRef}
          className="lp-reveal lg:order-2"
          style={{ "--lp-delay": "0.1s" }}
        >
          <p className="text-[13.5px] font-semibold text-[#3FA34D]">
            {TABLES_SECTION.eyebrow}
          </p>

          <h2 className="lp-display mt-3 max-w-[20ch] text-[clamp(2rem,4.6vw,3.1rem)] text-[#171C17]">
            {TABLES_SECTION.title}
          </h2>

          <p className="mt-5 max-w-[34rem] text-[16.5px] leading-[1.7] text-[#4b5563]">
            {TABLES_SECTION.body}
          </p>

          <dl className="mt-10 border-t border-[#e0e4d8]">
            {TABLES_SECTION.points.map((point) => (
              <div
                key={point.title}
                className="border-b border-[#e0e4d8] py-5 sm:grid sm:grid-cols-[13rem_1fr] sm:gap-6"
              >
                <dt className="text-[15px] font-semibold text-[#171C17]">
                  {point.title}
                </dt>

                <dd className="mt-1.5 max-w-[34rem] text-[14.5px] leading-[1.65] text-[#6B7280] sm:mt-0">
                  {point.body}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
};

export default TableFloor;
