// ==============================================
// src/landing/sections/MenuOrdering.jsx
// ==============================================
//
// Menu and ordering.
//
// The illustration is drawn in markup rather than dropped in as a
// screenshot: it stays sharp on any display, it re-flows on a phone
// instead of becoming an unreadable 320px-wide picture of a screen, and
// it can't quietly go out of date the next time the POS is restyled.
//
// The points are a bordered list, not three shadowed cards. A card says
// "these things are separate"; these are three facts about one screen.

import { MENU_SECTION } from "../landing.config";
import { useReveal } from "../hooks/useLandingMotion";

// ==============================================
// ORDER SCREEN MINIATURE
// ==============================================

const OrderScreen = ({ ticket }) => (
  <figure className="overflow-hidden rounded-[26px] border border-[#e0e4d8] bg-white shadow-[0_36px_80px_-52px_rgba(23,28,23,0.7)]">
    <div className="flex items-center justify-between border-b border-[#e0e4d8] bg-[#F3F5EE] px-5 py-3.5">
      <span className="lp-title text-[15px] text-[#171C17]">
        {ticket.heading}
      </span>

      <span className="rounded-full bg-white px-2.5 py-1 text-[11.5px] font-medium text-[#6B7280]">
        Dine in
      </span>
    </div>

    <ul className="divide-y divide-[#eef1e8]">
      {ticket.lines.map((line) => (
        <li key={line.name} className="flex items-start gap-3 px-5 py-3.5">
          <span className="lp-nums mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-[#3FA34D]/10 text-[12.5px] font-bold text-[#3FA34D]">
            {line.qty}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14.5px] font-medium text-[#1F2937]">
              {line.name}
            </span>

            {line.note && (
              <span className="mt-0.5 block text-[12.5px] text-[#8a5a07]">
                {line.note}
              </span>
            )}
          </span>

          <span className="lp-nums shrink-0 text-[14px] font-semibold text-[#171C17]">
            {line.price}
          </span>
        </li>
      ))}
    </ul>

    <div className="flex items-center justify-between border-t border-[#e0e4d8] px-5 py-4">
      <span className="text-[13px] text-[#6B7280]">Total</span>

      <span className="lp-nums lp-title text-[19px] text-[#171C17]">
        {ticket.total}
      </span>
    </div>

    {/* Not real buttons: this is a picture of a screen, and a keyboard
        user tabbing through a marketing page shouldn't land on controls
        that do nothing. */}
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-2 border-t border-[#e0e4d8] bg-[#F3F5EE] p-3"
    >
      <span className="rounded-xl bg-white py-2.5 text-center text-[13.5px] font-semibold text-[#171C17]">
        Save
      </span>

      <span className="rounded-xl bg-[#3FA34D] py-2.5 text-center text-[13.5px] font-semibold text-white">
        Send to kitchen
      </span>
    </div>

    <figcaption className="border-t border-[#e0e4d8] px-5 py-3 text-[12.5px] text-[#6B7280]">
      The order screen a waiter sees at the table.
    </figcaption>
  </figure>
);

// ==============================================
// SECTION
// ==============================================

const MenuOrdering = () => {
  const copyRef = useReveal();
  const artRef = useReveal();

  return (
    <section id="menu"   className="relative border-b border-[#e0e4d8] bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/Menu.png')",
        }}
      
    >
      <div className="mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-20 lg:py-28">
        <div ref={copyRef} className="lp-reveal">
          <p className="text-[13.5px] font-semibold text-[#3FA34D]">
            {MENU_SECTION.eyebrow}
          </p>

          <h2 className="lp-display mt-3 max-w-[20ch] text-[clamp(2rem,4.6vw,3.1rem)] text-[#171C17]">
            {MENU_SECTION.title}
          </h2>

          <p className="mt-5 max-w-[34rem] text-[16.5px] leading-[1.7] text-[#4b5563]">
            {MENU_SECTION.body}
          </p>

          <dl className="mt-10 border-t border-[#e0e4d8]">
            {MENU_SECTION.points.map((point) => (
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

        <div
          ref={artRef}
          className="lp-reveal lg:pl-6"
          style={{ "--lp-delay": "0.1s" }}
        >
          <OrderScreen ticket={MENU_SECTION.ticket} />
        </div>
      </div>
    </section>
  );
};

export default MenuOrdering;
