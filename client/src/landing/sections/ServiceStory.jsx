// ==============================================
// src/landing/sections/ServiceStory.jsx
// ==============================================
//
// "How it works" — content-height layout with richer motion.
//
// Motion & hover in this version
// - Photo frame tilts gently in 3D toward the cursor, with a soft light
//   glare that follows the pointer. Resets smoothly on leave.
// - Active photo does a slow "Ken Burns" zoom; photos crossfade with a
//   slight blur so the switch feels soft, not abrupt.
// - Prev / next arrows and step dots fade in on the photo on hover.
// - Glass card and its chips rise in with a short stagger on every step.
// - Step counter number rolls up when it changes.
// - Step rows: green accent bar grows from the left edge, number ring
//   lights up, title nudges right, arrow gets a tinted circle.
// - Active step body fades + slides in after the row opens.
// - Progress bar has a glowing tip.
// - Everything uses one easing curve for a consistent feel, and all of it
//   switches off under prefers-reduced-motion (tilt is also skipped on
//   touch screens).
//
// Layout notes (responsive fix)
// - Previously the section forced `lg:min-h-[calc(100svh-6rem)]` with
//   `items-center`, so on any screen where the content was shorter than
//   the viewport it got vertically centered inside a full-viewport box —
//   producing the large empty bands above/below the content seen at
//   1440px, 1024px and 2560px. The section now simply sizes to its
//   content with normal, breakpoint-scaled padding.
// - The photo frame's height was `min(calc(100svh-12rem), 640px)` — tied
//   to viewport *height*, which shifts with browser chrome/zoom/devtools
//   and caused the frame (and therefore the whole row) to jump around.
//   It's now sized from viewport *width* via `clamp()`, which is stable
//   and predictable across devices.
//
// Reads the same STORY object from landing.config — no config changes.

import { useCallback, useEffect, useRef, useState } from "react";
import { STORY } from "../landing.config";
import { useReveal } from "../hooks/useLandingMotion";

const STEP_DURATION_MS = 6500;
const MAX_TILT_DEG = 5;

const ServiceStory = () => {
  const steps = STORY.steps;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef(null);
  const tiltRef = useRef(null);
  const frameRef = useRef(0);
  const allowTilt = useRef(false);
  const headingRef = useReveal();

  // Only auto-advance while the section is on screen.
  useEffect(() => {
    const node = sectionRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // Tilt only for fine pointers with motion allowed.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)"
    );
    const update = () => (allowTilt.current = mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => {
      mq.removeEventListener?.("change", update);
      cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const handlePointerMove = useCallback((e) => {
    if (!allowTilt.current || !tiltRef.current) return;
    const el = tiltRef.current;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width; // 0 → 1
    const y = (e.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      el.style.setProperty("--ry", `${(x - 0.5) * MAX_TILT_DEG * 2}deg`);
      el.style.setProperty("--rx", `${(0.5 - y) * MAX_TILT_DEG * 2}deg`);
      el.style.setProperty("--gx", `${x * 100}%`);
      el.style.setProperty("--gy", `${y * 100}%`);
      el.style.setProperty("--glare", "1");
    });
  }, []);

  const handlePointerLeave = useCallback(() => {
    const el = tiltRef.current;
    if (!el) return;
    cancelAnimationFrame(frameRef.current);
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--glare", "0");
  }, []);

  const goTo = (index) =>
    setActive((index + steps.length) % steps.length);
  const goNext = () => goTo(active + 1);
  const goPrev = () => goTo(active - 1);

  const running = inView && !paused;
  const current = steps[active];
  const chips = current.meta
    .split("·")
    .map((c) => c.trim())
    .filter(Boolean);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      aria-label={STORY.title}
      className="relative overflow-hidden bg-[#FBFAF5] text-[#171C17]"
    >
      <style>{`
        .ss-root { --ss-ease: cubic-bezier(0.22, 1, 0.36, 1); }

        @keyframes ss-progress { from { width: 0%; } to { width: 100%; } }
        @keyframes ss-kenburns { from { transform: scale(1.08); } to { transform: scale(1); } }
        @keyframes ss-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
        @keyframes ss-pop { from { opacity: 0; transform: translateY(6px) scale(0.92); } to { opacity: 1; transform: none; } }
        @keyframes ss-roll { from { opacity: 0; transform: translateY(70%); } to { opacity: 1; transform: none; } }
        @keyframes ss-float { 0%,100% { transform: translate(0,-50%) scale(1); } 50% { transform: translate(24px,-46%) scale(1.06); } }

        .ss-progress { width: 0%; animation: ss-progress ${STEP_DURATION_MS}ms linear forwards; }
        .ss-kenburns { animation: ss-kenburns ${STEP_DURATION_MS + 1500}ms var(--ss-ease) forwards; }
        .ss-rise { animation: ss-rise 600ms var(--ss-ease) both; }
        .ss-pop { animation: ss-pop 500ms var(--ss-ease) both; }
        .ss-roll { display: inline-block; animation: ss-roll 450ms var(--ss-ease) both; }
        .ss-blob { animation: ss-float 14s ease-in-out infinite; }

        .ss-tilt {
          --rx: 0deg; --ry: 0deg; --gx: 50%; --gy: 50%; --glare: 0;
          transform: perspective(1200px) rotateX(var(--rx)) rotateY(var(--ry));
          transition: transform 500ms var(--ss-ease), box-shadow 500ms var(--ss-ease);
          will-change: transform;
        }
        .ss-glare {
          background: radial-gradient(420px circle at var(--gx) var(--gy), rgba(255,255,255,0.28), transparent 45%);
          opacity: var(--glare);
          transition: opacity 400ms var(--ss-ease);
        }
        .ss-ease { transition-timing-function: var(--ss-ease) !important; }

        @media (prefers-reduced-motion: reduce) {
          .ss-progress { animation: none; width: 100%; }
          .ss-kenburns, .ss-rise, .ss-pop, .ss-roll, .ss-blob { animation: none; }
          .ss-tilt { transform: none; transition: none; }
          .ss-root *, .ss-root *::before, .ss-root *::after { transition-duration: 0.01ms !important; }
        }
      `}</style>

      {/* Slowly drifting green wash behind the photo */}
      <div
        aria-hidden="true"
        className="ss-blob pointer-events-none absolute -left-40 top-1/2 h-[560px] w-[560px] rounded-full bg-[#3FA34D]/[0.08] blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-32 top-10 h-[320px] w-[320px] rounded-full bg-[#F2C94C]/[0.10] blur-3xl"
      />

      {/*
        Content-driven container: no forced viewport-height min-height and
        no vertical centering of the whole row within a tall box. Padding
        scales gently across breakpoints instead.
      */}
      <div className="ss-root relative mx-auto w-full max-w-[1240px] px-5 py-12 sm:px-8 sm:py-16 lg:py-20 xl:py-24">
        <div
          className="grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] lg:gap-16"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
          }}
        >
          {/* ==========================================
              LEFT — IMAGE FRAME
          ========================================== */}

          <div
            className="order-2 lg:order-1"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
          >
            <div
              ref={tiltRef}
              className="ss-tilt group relative aspect-[4/3] w-full overflow-hidden rounded-[24px] bg-[#EEEBE0] shadow-[0_2px_4px_rgba(23,28,23,0.04),0_30px_60px_-30px_rgba(23,28,23,0.35)] ring-1 ring-[#171C17]/5 hover:shadow-[0_2px_4px_rgba(23,28,23,0.05),0_40px_80px_-30px_rgba(23,28,23,0.45)] lg:aspect-auto lg:h-[clamp(420px,34vw,600px)]"
            >
              {steps.map((step, index) => {
                const isActive = index === active;
                return (
                  <img
                    key={isActive ? `${step.id}-on-${active}` : step.id}
                    src={step.image.src}
                    alt={isActive ? step.image.alt : ""}
                    aria-hidden={!isActive}
                    loading={index === 0 ? "eager" : "lazy"}
                    decoding="async"
                    draggable={false}
                    className={`ss-ease absolute inset-0 h-full w-full select-none object-cover transition-[opacity,filter] duration-700 ${
                      isActive
                        ? "ss-kenburns opacity-100 blur-0"
                        : "scale-[1.08] opacity-0 blur-sm"
                    }`}
                  />
                );
              })}

              {/* Cursor-following light */}
              <div aria-hidden="true" className="ss-glare pointer-events-none absolute inset-0 mix-blend-soft-light" />

              {/* Bottom fade for legibility */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/60 via-black/15 to-transparent"
              />

              {/* Step counter */}
              <div className="absolute left-5 top-5 flex items-center gap-2 overflow-hidden rounded-full bg-white/90 px-3 py-1.5 text-[12.5px] font-semibold text-[#171C17] shadow-sm backdrop-blur transition-transform duration-300 ss-ease group-hover:scale-[1.03]">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full bg-[#3FA34D] opacity-60 ${
                      running ? "animate-ping" : ""
                    }`}
                  />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[#3FA34D]" />
                </span>
                <span>
                  Step{" "}
                  <span key={active} className="ss-roll lp-nums">
                    {active + 1}
                  </span>{" "}
                  of {steps.length}
                </span>
              </div>

              {/* Prev / next — appear on hover or keyboard focus */}
              <div className="absolute right-5 top-5 flex gap-2 opacity-0 transition-all duration-300 ss-ease -translate-y-1 group-hover:translate-y-0 group-hover:opacity-100 focus-within:translate-y-0 focus-within:opacity-100">
                {[
                  { label: "Previous step", onClick: goPrev, d: "M12.5 5l-5 5 5 5" },
                  { label: "Next step", onClick: goNext, d: "M7.5 5l5 5-5 5" },
                ].map((btn) => (
                  <button
                    key={btn.label}
                    type="button"
                    onClick={btn.onClick}
                    aria-label={btn.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#171C17] shadow-sm backdrop-blur transition-all duration-300 ss-ease hover:scale-110 hover:bg-[#3FA34D] hover:text-white active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <svg viewBox="0 0 20 20" className="h-4 w-4" aria-hidden="true">
                      <path d={btn.d} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>

              {/* Glass card — re-keyed so it animates in on every step */}
              <div
                key={current.id}
                className="ss-rise absolute inset-x-5 bottom-5 rounded-2xl border border-white/25 bg-white/15 p-4 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.4)] backdrop-blur-md transition-transform duration-500 ss-ease group-hover:-translate-y-1 sm:inset-x-6 sm:bottom-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-[15px] font-semibold leading-snug">
                    {current.title}
                  </p>

                  {/* Step dots */}
                  <div className="flex shrink-0 items-center gap-1.5 pt-1.5">
                    {steps.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => goTo(i)}
                        aria-label={`Go to step ${i + 1}`}
                        aria-current={i === active ? "step" : undefined}
                        className={`h-1.5 rounded-full transition-all duration-500 ss-ease focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                          i === active
                            ? "w-6 bg-white"
                            : "w-1.5 bg-white/50 hover:w-3 hover:bg-white/80"
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <ul className="mt-3 flex flex-wrap gap-2">
                  {chips.map((chip, i) => (
                    <li
                      key={chip}
                      style={{ animationDelay: `${150 + i * 80}ms` }}
                      className="ss-pop cursor-default rounded-full bg-white/90 px-3 py-1 text-[12px] font-medium text-[#1E3A22] transition-all duration-300 ss-ease hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                    >
                      {chip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* ==========================================
              RIGHT — HEADING + STEPS
          ========================================== */}

          <div className="order-1 flex flex-col lg:order-2">
            <div ref={headingRef} className="lp-reveal">
              <p className="inline-flex items-center gap-2 rounded-full border border-[#3FA34D]/25 bg-[#3FA34D]/[0.08] px-3 py-1 text-[12.5px] font-semibold text-[#2E7D3A] transition-colors duration-300 hover:bg-[#3FA34D]/[0.14]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3FA34D]" />
                How it works
              </p>

              <h2 className="lp-display mt-4 text-[clamp(1.9rem,3.2vw,2.75rem)] leading-[1.08] text-[#171C17]">
                {STORY.title}
              </h2>

              <p className="mt-3 max-w-[30rem] text-[15.5px] leading-[1.65] text-[#5B6156]">
                {STORY.intro}
              </p>
            </div>

            <ol className="mt-7 divide-y divide-[#E7E2D2] overflow-hidden rounded-[20px] border border-[#E7E2D2] bg-white shadow-[0_1px_2px_rgba(23,28,23,0.04)] transition-shadow duration-500 ss-ease hover:shadow-[0_1px_2px_rgba(23,28,23,0.04),0_24px_48px_-28px_rgba(23,28,23,0.25)] lg:mt-8">
              {steps.map((step, index) => {
                const isActive = index === active;
                const panelId = `story-panel-${step.id}`;

                return (
                  <li key={step.id} className="group relative">
                    {/* Left accent bar */}
                    <span
                      aria-hidden="true"
                      className={`absolute left-0 top-0 z-10 h-full w-[3px] origin-center rounded-r-full bg-[#3FA34D] transition-transform duration-500 ss-ease ${
                        isActive ? "scale-y-100" : "scale-y-0 group-hover:scale-y-50"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => goTo(index)}
                      aria-expanded={isActive}
                      aria-controls={panelId}
                      className={`relative flex w-full items-center gap-4 px-5 py-4 text-left transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#3FA34D] sm:px-6 ${
                        isActive ? "bg-[#F4F9F2]" : "hover:bg-[#F8FAF5]"
                      }`}
                    >
                      <span
                        className={`lp-nums flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-all duration-300 ss-ease ${
                          isActive
                            ? "scale-100 bg-[#3FA34D] text-white shadow-[0_6px_14px_-6px_rgba(63,163,77,0.8)]"
                            : "border border-[#E3DEC9] bg-white text-[#9AA08E] group-hover:scale-110 group-hover:border-[#3FA34D] group-hover:text-[#3FA34D] group-hover:shadow-[0_0_0_4px_rgba(63,163,77,0.12)]"
                        }`}
                      >
                        {step.index}
                      </span>

                      <span
                        className={`lp-title flex-1 text-[clamp(1.05rem,1.5vw,1.25rem)] transition-all duration-300 ss-ease ${
                          isActive
                            ? "text-[#171C17]"
                            : "text-[#5B6156] group-hover:translate-x-1 group-hover:text-[#171C17]"
                        }`}
                      >
                        {step.title}
                      </span>

                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ss-ease ${
                          isActive
                            ? "bg-[#3FA34D]/[0.12] text-[#3FA34D]"
                            : "text-[#9AA08E] group-hover:bg-[#3FA34D]/10 group-hover:text-[#3FA34D]"
                        }`}
                      >
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 20 20"
                          className={`h-5 w-5 transition-transform duration-500 ss-ease ${
                            isActive ? "rotate-180" : "group-hover:translate-y-0.5"
                          }`}
                        >
                          <path d="M5 7.5l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </button>

                    {/* Expanding body */}
                    <div
                      id={panelId}
                      className={`grid transition-[grid-template-rows] duration-500 ss-ease ${
                        isActive ? "grid-rows-[1fr] bg-[#F4F9F2]" : "grid-rows-[0fr]"
                      }`}
                    >
                      <div className="overflow-hidden">
                        <p
                          className={`px-5 pb-5 pl-[4.5rem] text-[15px] leading-[1.7] text-[#5B6156] transition-all duration-500 ss-ease sm:px-6 sm:pl-[4.75rem] ${
                            isActive
                              ? "translate-y-0 opacity-100 delay-150"
                              : "-translate-y-2 opacity-0"
                          }`}
                        >
                          {step.body}
                        </p>
                      </div>
                    </div>

                    {/* Auto-advance progress with glowing tip */}
                    {isActive && (
                      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] bg-[#3FA34D]/10">
                        <span
                          key={`${step.id}-${active}`}
                          onAnimationEnd={goNext}
                          style={{ animationPlayState: running ? "running" : "paused" }}
                          className="ss-progress relative block h-full bg-gradient-to-r from-[#3FA34D]/70 to-[#3FA34D] after:absolute after:right-0 after:top-1/2 after:h-2 after:w-2 after:-translate-y-1/2 after:rounded-full after:bg-[#3FA34D] after:shadow-[0_0_10px_2px_rgba(63,163,77,0.6)]"
                        />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ServiceStory;