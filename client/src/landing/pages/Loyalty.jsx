import React, { useEffect, useRef, useState } from "react";
import { Wallet, Trophy, Gift, Layers, Zap } from "lucide-react";

/**
 * Loyalty — landing page section
 * --------------------------------------------------------------
 * Left: marketing copy (eyebrow, heading, description, feature list)
 * Right: a static card mockup of the loyalty balance a customer
 *        (or the counter staff) would see, matching the card style
 *        used across the other landing sections.
 *
 * Motion: one orchestrated reveal on scroll-into-view, the points
 * balance counts up, the tier progress bar fills to its value, the
 * membership badge gets a single shimmer, and the card border has
 * a slow rotating amber glow.
 * --------------------------------------------------------------
 */

const FEATURES = [
  {
    icon: Zap,
    title: "Points, calculated automatically",
    description:
      "Every bill earns points at the rate you set — no manual entry, no separate loyalty terminal at the counter.",
  },
  {
    icon: Layers,
    title: "Membership tiers",
    description:
      "Silver, Gold, Platinum. Customers move up automatically as their spend crosses the thresholds you define.",
  },
  {
    icon: Gift,
    title: "Redeemed in one tap",
    description:
      "Apply a customer's points balance straight onto the current bill at checkout — the discount is worked out for you.",
  },
];

const TIER_PROGRESS_PERCENT = 66; // Gold → Platinum, 155 pts remaining

function useCountUp(target, duration, start) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!start) return undefined;
    let raf;
    let startTime = null;
    const step = (ts) => {
      if (startTime === null) startTime = ts;
      const progress = Math.min((ts - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [start, target, duration]);
  return value;
}

export default function Loyalty() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return undefined;
    const t = setTimeout(() => setBarWidth(TIER_PROGRESS_PERCENT), 250);
    return () => clearTimeout(t);
  }, [visible]);

  const points = useCountUp(245, 1000, visible);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden px-6 py-20 sm:px-10 lg:px-16 bg-slate-50"
    >
      <style>{`
        @keyframes loyaltyRise {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes loyaltyShimmer {
          0% { background-position: -150% 0; }
          100% { background-position: 150% 0; }
        }
        @keyframes loyaltyGlowRotate {
          to { transform: rotate(360deg); }
        }
        .loyalty-rise { animation: loyaltyRise 0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .loyalty-shimmer {
          background-image: linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.75) 50%, transparent 60%);
          background-size: 200% 100%;
          animation: loyaltyShimmer 1.6s ease 1;
        }
        .loyalty-glow-border {
          position: relative;
          isolation: isolate;
        }
        .loyalty-glow-border::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          padding: 2px;
          background: conic-gradient(
            from 0deg,
            #f59e0b,
            #fcd34d,
            #fbbf24,
            #d97706,
            #fcd34d,
            #f59e0b
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: loyaltyGlowRotate 4s linear infinite;
          pointer-events: none;
          z-index: -1;
        }
        @media (prefers-reduced-motion: reduce) {
          .loyalty-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
          .loyalty-shimmer { animation: none !important; }
          .loyalty-glow-border::before { animation: none !important; }
        }
      `}</style>

      <div
        className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
        {/* Left on desktop stays the mockup here, copy on the right — a
            small rhythm change from the CRM section above it. */}
        <div
          className={`order-2 flex justify-center lg:order-1 lg:justify-start ${
            visible ? "loyalty-rise" : "opacity-0"
          }`}
        >
          <div className="loyalty-glow-border relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] transition-shadow duration-300 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.22)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  Rajesh Kumar
                </div>
                <div className="text-xs text-slate-400">7412589636</div>
              </div>
              <span className="loyalty-shimmer inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                <Trophy className="h-3 w-3" />
                Gold member
              </span>
            </div>

            <div className="mt-5 rounded-lg bg-slate-900 p-4 text-white">
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Wallet className="h-3.5 w-3.5" />
                Points balance
              </div>
              <div className="mt-1 text-3xl font-bold tabular-nums">
                {points} pts
              </div>
              <div className="mt-0.5 text-xs text-slate-400">
                Worth ₹{points} on the next bill
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Gold</span>
                <span>155 pts to Platinum</span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-amber-400 transition-[width] duration-[1200ms] ease-out"
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>

            <button className="mt-5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 hover:shadow-lg active:scale-[0.98]">
              <Gift className="h-4 w-4" />
              Redeem points on this bill
            </button>
          </div>
        </div>

        <div
          className={`order-1 lg:order-2 ${visible ? "loyalty-rise" : "opacity-0"}`}
          style={visible ? { animationDelay: "120ms" } : undefined}
        >
          <span className="text-sm font-medium text-emerald-700">
            Loyalty &amp; rewards
          </span>
          <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            Every rupee spent earns
            <br />
            a reason to come back.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-500">
            Loyalty runs on the same bill the customer already pays. Points
            build up on their own, tiers unlock on their own, and redeeming
            them takes one tap at checkout.
          </p>

          <div className="mt-10 divide-y divide-slate-200 border-t border-slate-200">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`group grid grid-cols-1 gap-3 py-4 sm:grid-cols-[180px_1fr] sm:gap-6 ${
                  visible ? "loyalty-rise" : "opacity-0"
                }`}
                style={visible ? { animationDelay: `${180 + i * 110}ms` } : undefined}
              >
                <div className="flex items-center gap-2.5 text-slate-900">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-600 transition-colors duration-200 group-hover:bg-amber-100">
                    <f.icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-medium">{f.title}</span>
                </div>
                <div className="text-sm leading-relaxed text-slate-500">
                  {f.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}