// ==============================================
// src/landing/sections/Modules.jsx
// ==============================================

import {
  FiBox,
  FiCreditCard,
  FiLayers,
  FiMonitor,
  FiPrinter,
  FiTrendingUp,
  FiUsers,
  FiWifi,
  FiClipboard , 
} from "react-icons/fi";

import { MODULES } from "../landing.config";
import { useReveal } from "../hooks/useLandingMotion";

const ICONS = {
  ticket: FiClipboard ,
  printer: FiPrinter,
  box: FiBox,
  users: FiUsers,
  trending: FiTrendingUp,
  monitor: FiMonitor,
  wallet: FiCreditCard,
  wifi: FiWifi,
  layers: FiLayers,
};

const Modules = () => {
  const headingRef = useReveal();
  const gridRef = useReveal();

  return (
    <section id="modules" className="border-b border-[#e0e4d8] bg-[#f7f9f4]/50">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
        {/* Section Heading & Expanded Intro */}
        <div ref={headingRef} className="lp-reveal max-w-[42rem]">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-[#3FA34D] mb-3">
            Comprehensive Suite
          </span>
          <h2 className="lp-display text-[clamp(2rem,4.6vw,3.1rem)] text-[#171C17] tracking-tight">
            {MODULES.title}
          </h2>

          <p className="mt-5 text-[17px] leading-[1.7] text-[#4b5563]">
            {MODULES.intro} Designed thoughtfully to unify your entire dining room, back office, and management reporting under one fluid ecosystem.
          </p>
        </div>

        {/* Modules Grid with Neumorphism & Hover Borders */}
        <ul
          ref={gridRef}
          className="lp-reveal mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {MODULES.items.map((item) => {
            const Icon = ICONS[item.icon];

            return (
              <li
                key={item.title}
                className="group relative rounded-2xl bg-white p-7 transition-all duration-300 hover:-translate-y-1.5"
                style={{
                  boxShadow: "8px 8px 20px rgba(163, 177, 138, 0.15), -8px -8px 20px rgba(255, 255, 255, 0.8)",
                  border: "1px solid rgba(224, 228, 216, 0.6)",
                }}
              >
                {/* Subtle Hover Border Gradient Effect */}
                <div className="absolute inset-0 rounded-2xl border-2 border-transparent transition-all duration-300 group-hover:border-[#3FA34D]/40 pointer-events-none" />

                <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#3FA34D]/10 text-[#3FA34D] transition-transform duration-300 group-hover:scale-110">
                  {Icon && <Icon size={20} aria-hidden="true" />}
                </span>

                <h3 className="lp-title mt-5 text-[18px] font-semibold text-[#171C17]">
                  {item.title}
                </h3>

                <p className="mt-2.5 text-[14.5px] leading-[1.65] text-[#6B7280]">
                  {item.body}
                </p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};

export default Modules;