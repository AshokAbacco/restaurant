// src/pos/components/CounterPicker.jsx
//
// Phase 2.2 — shown on the POS order screen whenever this device hasn't
// picked a counter/terminal identity yet (see counterContext.js). A thin
// banner, not a blocking modal — orders can still be placed without a
// counter selected (counterId is optional end-to-end), this is just how
// staff opt into Counter Summary reporting being accurate for this device.
import { useEffect, useState } from "react";
import { MapPin, ChevronDown } from "lucide-react";
import { getCounters } from "../api/posApi";
import { getSelectedCounter, setSelectedCounter } from "../api/counterContext";

export default function CounterPicker({ onSelect }) {
  const [current, setCurrent] = useState(getSelectedCounter());
  const [counters, setCounters] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || counters.length > 0) return;
    setLoading(true);
    getCounters({ activeOnly: true })
      .then(setCounters)
      .catch(() => setCounters([]))
      .finally(() => setLoading(false));
  }, [open, counters.length]);

  function handlePick(counter) {
    setSelectedCounter(counter);
    setCurrent(counter);
    setOpen(false);
    onSelect?.(counter);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          current
            ? "border-slate-200 text-slate-600 hover:bg-slate-50"
            : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
        }`}
        title="Which physical counter/terminal is this?"
      >
        <MapPin className="h-3.5 w-3.5" />
        {current ? current.name : "Select counter"}
        <ChevronDown className="h-3 w-3" />
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
          {loading ? (
            <p className="px-2 py-1.5 text-xs text-slate-400">Loading…</p>
          ) : counters.length === 0 ? (
            <p className="px-2 py-1.5 text-xs text-slate-400">
              No counters set up yet — add one in Settings.
            </p>
          ) : (
            counters.map((c) => (
              <button
                key={c.id}
                onClick={() => handlePick(c)}
                className={`block w-full rounded-md px-2 py-1.5 text-left text-xs font-medium ${
                  current?.id === c.id
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {c.name}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}