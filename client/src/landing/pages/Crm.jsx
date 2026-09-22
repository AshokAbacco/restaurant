import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  TrendingUp,
  CalendarClock,
  Star,
  Users,
  RefreshCw,
  BellRing,
} from "lucide-react";

/**
 * CRM — landing page section
 * --------------------------------------------------------------
 * Left: marketing copy (eyebrow, heading, description, feature list)
 * Right: a static card mockup of the customer record the owner
 *        actually sees, matching the card style used across the
 *        other landing sections.
 *
 * Motion: the whole section reveals once, staggered, the moment it
 * scrolls into view (IntersectionObserver) — not per-hover fades on
 * every element. The stat numbers count up on reveal, the
 * "due today" reminder gets a single soft attention pulse, and the
 * card border has a slow rotating emerald glow.
 * --------------------------------------------------------------
 */

const FEATURES = [
  {
    icon: Users,
    title: "One profile per customer",
    description:
      "Name, mobile, orders, total spent, last visit and favourite items — built up automatically from every bill, with nothing to enter by hand.",
  },
  {
    icon: RefreshCw,
    title: "Segments that update themselves",
    description:
      "VIP, Regular, New, At risk. Customers move between segments on their own as visits and spend change, so the list is never stale.",
  },
  {
    icon: BellRing,
    title: "Follow-ups that don't get forgotten",
    description:
      "Birthdays, anniversaries and manual reminders sit in one place and stay open until someone marks them done.",
  },
];

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

export default function Crm() {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

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

  const orders = useCountUp(1, 600, visible);
  const spent = useCountUp(681, 900, visible);
  const avgBill = useCountUp(681, 900, visible);

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden px-6 py-20 sm:px-10 lg:px-16 bg-[#f3f5ee]"
    >
      <style>{`
        @keyframes crmRise {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes crmRingPulse {
          0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.35); }
          70% { box-shadow: 0 0 0 10px rgba(16,185,129,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
        }
        @keyframes crmGlowRotate {
          to { transform: rotate(360deg); }
        }
        .crm-rise { animation: crmRise 0.7s cubic-bezier(0.22,1,0.36,1) both; }
        .crm-glow-border {
          position: relative;
          isolation: isolate;
        }
        .crm-glow-border::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: inherit;
          padding: 2px;
          background: conic-gradient(
            from 0deg,
            #10b981,
            #6ee7b7,
            #34d399,
            #059669,
            #6ee7b7,
            #10b981
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          animation: crmGlowRotate 4s linear infinite;
          pointer-events: none;
          z-index: -1;
        }
        @media (prefers-reduced-motion: reduce) {
          .crm-rise { animation: none !important; opacity: 1 !important; transform: none !important; }
          .crm-glow-border::before { animation: none !important; }
        }
      `}</style>

      <div
        className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-2 lg:gap-20">
        <div className={visible ? "crm-rise" : "opacity-0"}>
          <span className="text-sm font-medium text-emerald-700">
            Customer relationships
          </span>
          <h2 className="mt-3 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
            Every regular, remembered
            <br />
            without asking twice.
          </h2>
          <p className="mt-5 max-w-md text-base leading-relaxed text-slate-500">
            Every bill quietly builds a customer history. Search a mobile
            number and see who they are, what they order and when they're
            due a call — before you even ask.
          </p>

          <div className="mt-10 divide-y divide-slate-200 border-t border-slate-200">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`group grid grid-cols-1 gap-3 py-4 sm:grid-cols-[180px_1fr] sm:gap-6 ${
                  visible ? "crm-rise" : "opacity-0"
                }`}
                style={visible ? { animationDelay: `${140 + i * 110}ms` } : undefined}
              >
                <div className="flex items-center gap-2.5 text-slate-900">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 transition-colors duration-200 group-hover:bg-emerald-100">
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

        {/* Right: customer record mockup */}
        <div
          className={`flex justify-center lg:justify-end ${
            visible ? "crm-rise" : "opacity-0"
          }`}
          style={visible ? { animationDelay: "120ms" } : undefined}
        >
          <div className="crm-glow-border relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.15)] transition-shadow duration-300 hover:shadow-[0_25px_60px_-15px_rgba(0,0,0,0.22)]">
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-sm text-slate-400">9876543210</span>
            </div>

            <div className="mt-4 flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                  R
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Rajesh Kumar
                  </div>
                  <div className="text-xs text-slate-400">7412589636</div>
                </div>
              </div>
              <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                New
              </span>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 rounded-lg bg-slate-50 p-3">
              <div>
                <div className="text-xs text-slate-400">Orders</div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                  {orders}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Total spent</div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                  ₹{spent}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400">Avg bill</div>
                <div className="mt-0.5 text-sm font-semibold tabular-nums text-slate-900">
                  ₹{avgBill}
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-sm text-slate-700">
              <Star className="h-3.5 w-3.5 text-amber-400" />
              Favourite: Mixed Grill Platter
            </div>

            <div
              className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5"
              style={
                visible
                  ? { animation: "crmRingPulse 2.2s ease-out 1.4s 2" }
                  : undefined
              }
            >
              <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
              <div className="text-xs text-emerald-700">
                Call about anniversary dinner — due today
              </div>
            </div>

            <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              <TrendingUp className="h-3.5 w-3.5" />
              Updated automatically from the POS
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}