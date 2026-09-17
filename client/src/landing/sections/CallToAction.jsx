// ==============================================
// src/landing/sections/CallToAction.jsx
// ==============================================


import { Link } from "react-router-dom";

import { CTA } from "../landing.config";
import { useReveal } from "../hooks/useLandingMotion";

const CallToAction = () => {
  const ref = useReveal();

  return (
    <section className="bg-[#F3F5EE]">
      <div className="mx-auto w-full max-w-[1240px] px-5 py-20 sm:px-8 lg:py-28">
        <div
          ref={ref}
          className="lp-reveal relative overflow-hidden rounded-[32px] bg-[#3fa34d] px-6 py-16 text-center sm:px-12"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-full h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[#3FA34D]/25 blur-[100px]"
          />

          <div className="relative mx-auto max-w-[34rem]">
            <h2 className="lp-display text-[clamp(2rem,5vw,3.2rem)] text-[#fff]">
              {CTA.title}
            </h2>

            <p className="mx-auto mt-5 max-w-[30rem] text-[16.5px] leading-[1.7] text-gray-100">
              {CTA.body}
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <Link
                to={CTA.primary.to}
                className="rounded-full bg-[#43B75A] px-7 py-3.5 text-[15px] font-semibold text-[#0d100d] transition-transform duration-200 hover:-translate-y-0.5"
              >
                {CTA.primary.label}
              </Link>

              <Link
                to={CTA.secondary.to}
                className="rounded-full border border-white/25 px-7 py-3.5 text-[15px] font-semibold text-[#F3F5EE] transition-colors hover:border-white/60"
              >
                {CTA.secondary.label}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
