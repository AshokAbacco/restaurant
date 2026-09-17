// ==============================================
// src/landing/sections/Hero.jsx
// ==============================================
//
// One background image, the copy sitting on top of it. No slides, no
// orbit, no ticket. Everything that can change is in the block below.

import { Link } from "react-router-dom";

// public/images/Home.jsx.png  ->  served from /images/Home.jsx.png
const BG_IMAGE = "/images/Home1.png";
// const BG_IMAGE = "/images/Home.jsx.png";

const EYEBROW = "All-in-one solution";

// Each entry is a line. The second one takes the green.
const HEADLINE = [
  { text: "Smart Restaurant", accent: false },
  { text: "Management", accent: true },
  { text: "Made Simple", accent: false },
];

const INTRO = [
  "Manage orders, tables, kitchen, menu and billing — all in one",
  "restaurant ERP. Run the floor from a single screen, even when",
  "the internet drops.",
];

const PRIMARY = { label: "Start Now", to: "/login" };
const SECONDARY = { label: "Book Demo", to: "/contact-us" };

const HIGHLIGHTS = [
  { title: "Smart POS", sub: "Orders & billing" },
  { title: "Table & Floor", sub: "Live seating map" },
  { title: "Kitchen Display", sub: "Tickets to the pass" },
  { title: "Reports", sub: "Sales & stock" },
];

// ==============================================
// ICONS
// ==============================================

const Arrow = () => (
  <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
    <path
      d="M3.5 10h12m0 0-4.5-4.5M15.5 10 11 14.5"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const Play = () => (
  <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
    <circle cx="10" cy="10" r="9" fill="currentColor" opacity="0.12" />
    <path d="M8.2 6.6 13.4 10l-5.2 3.4V6.6Z" fill="currentColor" />
  </svg>
);

// ==============================================
// HERO
// ==============================================

const Hero = () => (
  <section className="relative isolate overflow-hidden">
    {/* The picture. Held behind everything and never in the tab order. */}
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-20 bg-cover bg-center bg-no-repeat w-full h-[calc(100%+32px)]"
      style={{ backgroundImage: `url(${BG_IMAGE})` }}
    />

    {/* A wash from the left so the words stay readable over whatever the
        photo is doing behind them. Fades out before the right edge. */}
    <div
      aria-hidden="true"
      className="absolute inset-0 -z-10  "
    />

    <div className="mx-auto w-full max-w-7xl px-5 pb-20 pt-16 sm:px-8 lg:pb-28 lg:pt-24">
      <div className="max-w-[48rem]">
        <span className="inline-flex items-center gap-2 rounded-full border border-[#cfe3c6] bg-white/80 px-4 py-1.5 text-[12px] font-semibold tracking-[0.14em] text-[#2E7D32] backdrop-blur-sm">
          <span className="block h-1.5 w-1.5 rounded-full bg-[#3FA34D]" />
          {EYEBROW}
        </span>

        <h1 className="lp-display mt-6 text-[clamp(2.6rem,7vw,4.6rem)] leading-[1.04] text-[#171C17]">
          {HEADLINE.map((line) => (
            <span
              key={line.text}
              className={line.accent ? "block text-[#3FA34D]" : "block"}
            >
              {line.text}
            </span>
          ))}
        </h1>

        <p className="mt-6 text-[16px] leading-[1.75] text-[#4B5563]">
          {INTRO.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link
            to={PRIMARY.to}
            className="inline-flex items-center gap-2 rounded-full bg-[#3FA34D] px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_18px_34px_-18px_rgba(63,163,77,0.9)] transition-colors hover:bg-[#348A40] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171C17]"
          >
            {PRIMARY.label}
            <Arrow />
          </Link>

          <Link
            to={SECONDARY.to}
            className="inline-flex items-center gap-2 rounded-full border border-[#3FA34D] bg-white/80 px-7 py-3.5 text-[15px] font-semibold text-[#2E7D32] backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#171C17]"
          >
            <Play />
            {SECONDARY.label}
          </Link>
        </div>

        {/* Four words on what the product actually does. Delete this list
            if the hero should carry nothing but the headline. */}
        <ul className="mt-14 grid max-w-[34rem] grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-4 sm:gap-x-4">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title}>
              <p className="text-[14px] font-semibold text-[#171C17]">
                {item.title}
              </p>
              <p className="mt-1 text-[12.5px] leading-[1.45] text-[#6B7280]">
                {item.sub}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  </section>
);

export default Hero;