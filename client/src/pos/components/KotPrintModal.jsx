// src/pos/components/KotPrintModal.jsx
//
// Shown the moment an order reaches the kitchen.
//
// The print dialog is NOT opened automatically any more. An auto-opened
// dialog alongside a visible Print button is how the same ticket ends up
// queued twice — the operator sees a dialog they didn't ask for, dismisses
// it, then presses the button. One explicit button, one job.
import { useEffect, useState } from "react";
import { FiPrinter, FiX } from "react-icons/fi";
import { getKotsForOrder } from "../api/posApi";
import KotTicket from "./KotTicket";
import { printOnce } from "../../print/printing";

export default function KotPrintModal({ orderId, onClose }) {
  const [kots, setKots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    if (!orderId) return;
    (async () => {
      try {
        const data = await getKotsForOrder(orderId);
        if (!cancelled) setKots(Array.isArray(data) ? data : []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F2937]/40 dark:bg-black/60 p-4">
      <div className="flex max-h-[92vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl bg-white dark:bg-[#171C17] shadow-xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#E7EAE1] dark:border-[#262B24] px-4 py-3 print:hidden">
          <h3 className="font-bold text-[#1F2937] dark:text-white">
            Kitchen Ticket
            {kots.length > 1 ? ` (${kots.length} stations)` : ""}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => printOnce()}
              className="flex items-center gap-1.5 rounded-lg bg-[#3FA34D] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#358F42] dark:bg-[#43B75A]"
            >
              <FiPrinter size={14} />
              Print
            </button>
            <button
              onClick={onClose}
              className="text-[#9CA3AF] hover:text-[#6B7280]"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#F3F5EE] dark:bg-[#12160F] p-4">
          {loading ? (
            <p className="py-8 text-center text-sm text-[#9CA3AF]">
              Loading ticket…
            </p>
          ) : error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-[#EF5350]">
              {/* The order IS already with the kitchen at this point — only
                  the paper slip failed, so say so rather than implying the
                  food won't be cooked. */}
              The order was sent to the kitchen, but the ticket couldn't be
              loaded for printing: {error}
            </p>
          ) : (
            <KotTicket kots={kots} />
          )}
        </div>

        <div className="shrink-0 border-t border-[#E7EAE1] dark:border-[#262B24] px-4 py-3 print:hidden">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-[#E7EAE1] dark:border-[#262B24] py-2 text-sm font-semibold text-[#6B7280] dark:text-[#9CA8A0] hover:bg-[#F3F5EE] dark:hover:bg-white/5"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}