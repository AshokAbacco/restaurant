// src/pos/components/SuccessToast.jsx
import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

// Slide-in-from-right success toast. Controlled via `show` — mount it once
// near the top of a screen and flip `show` to true whenever you want it to
// fire. It handles its own enter/exit animation and auto-dismiss timing;
// `onClose` is called both when the timer runs out and when the user taps
// the × button, so the parent can reset `show` back to false either way.
export default function SuccessToast({
  show,
  title = "Order sent to Kitchen successfully!",
  message,
  duration = 3500,
  onClose,
}) {
  // `visible` keeps the toast mounted (so the exit transition can play);
  // `entered` is what actually drives the translate-x animation.
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!show) return;

    setVisible(true);
    // Mount off-screen first, then flip to "entered" on the next frame so
    // the browser has a starting state to transition from.
    const raf = requestAnimationFrame(() => setEntered(true));
    const timer = setTimeout(() => dismiss(), duration);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, duration]);

  function dismiss() {
    setEntered(false); // triggers slide-out
    setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, 300); // matches the transition duration below
  }

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed right-4 top-45 z-[100]">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto relative flex w-[320px] max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-2xl border border-blue-100 bg-white p-4 shadow-lg shadow-blue-900/10 ring-1 ring-black/5 transition-all duration-300 ease-out ${
          entered ? "translate-x-0 opacity-100" : "translate-x-[130%] opacity-0"
        }`}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2.4} />
        </span>

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {message && <p className="mt-0.5 truncate text-xs text-slate-400">{message}</p>}
        </div>

        <button
          onClick={dismiss}
          aria-label="Dismiss notification"
          className="mt-0.5 shrink-0 rounded-lg p-1 text-slate-300 transition-colors hover:bg-slate-100 hover:text-slate-500"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>

        {/* Progress bar — subtle visual cue for the auto-dismiss countdown */}
        <div className="absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-2xl bg-slate-100">
          <div
            className="h-full bg-emerald-500"
            style={{
              animation: entered ? `success-toast-shrink ${duration}ms linear forwards` : "none",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes success-toast-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}