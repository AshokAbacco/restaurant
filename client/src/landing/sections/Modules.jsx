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
} from "react-icons/fi";

import { MODULES } from "../landing.config";
import { useReveal } from "../hooks/useLandingMotion";

const ICONS = {
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
    <section id="modules" className="border-b border-[#e0e4d8]">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
        <div ref={headingRef} className="lp-reveal max-w-[38rem]">
          <h2 className="lp-display text-[clamp(2rem,4.6vw,3.1rem)] text-[#171C17]">
            {MODULES.title}
          </h2>

          <p className="mt-5 max-w-[34rem] text-[16.5px] leading-[1.7] text-[#4b5563]">
            {MODULES.intro}
          </p>
        </div>

        <ul
          ref={gridRef}
          className="lp-reveal mt-12 grid grid-cols-1 border-l border-t border-[#e0e4d8] sm:grid-cols-2 lg:grid-cols-4"
        >
          {MODULES.items.map((item) => {
            const Icon = ICONS[item.icon];

            return (
              <li
                key={item.title}
                className="group border-b border-r border-[#e0e4d8] bg-white/40 p-6 transition-colors duration-300 hover:bg-white"
              >
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#3FA34D]/10 text-[#3FA34D]">
                  <Icon size={17} aria-hidden="true" />
                </span>

                <h3 className="lp-title mt-4 text-[17px] text-[#171C17]">
                  {item.title}
                </h3>

                <p className="mt-2 text-[14px] leading-[1.65] text-[#6B7280]">
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
