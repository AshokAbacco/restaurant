// ==============================================
// src/dashboard/components/FloorTableCard.jsx
// ==============================================
//
// One table on the floor view. Compact by design — a full restaurant is
// 60+ of these on screen at once, so the card carries only what someone
// scanning the room needs: which table, how long it's been sitting, what
// it owes, and what they can do about it.

import { FiPrinter, FiEye, FiSave } from "react-icons/fi";

import {
  TABLE_STATE,
  TABLE_STATE_META,
  formatAmount,
  formatElapsed,
} from "../utils/tableStatus";

function ActionButton({ label, onClick, disabled, children, tone }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3FA34D] disabled:cursor-not-allowed disabled:opacity-40 ${tone}`}
    >
      {children}
    </button>
  );
}

const FloorTableCard = ({
  table,
  order,
  state,
  elapsedMinutes,
  onPrint,
  onView,
  onSave,
  onOpen,
  saving,
}) => {
  const meta = TABLE_STATE_META[state];
  const isBlank = state === TABLE_STATE.BLANK;
  const isPaid = state === TABLE_STATE.PAID;

  // A paid table's bill is closed — reopening it in the POS or re-raising
  // the invoice would work against a completed order. Save is the only
  // move left, and it just clears the card.
  const canPrint = !isBlank && !isPaid;
  const canView = !isBlank && !isPaid;

  const buttonTone = isBlank
    ? "border-[#D8DED2] dark:border-[#333B33] bg-white dark:bg-[#1B211A] text-[#6B7280] dark:text-[#7E8A7E]"
    : "border-black/10 dark:border-white/15 bg-white/70 dark:bg-black/25 hover:bg-white dark:hover:bg-black/40";

  return (
    <div
      role={isBlank ? "button" : "group"}
      tabIndex={isBlank ? 0 : undefined}
      onClick={isBlank ? onOpen : undefined}
      onKeyDown={
        isBlank
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen?.();
              }
            }
          : undefined
      }
      className={`flex min-h-[104px] flex-col justify-between rounded-lg border p-2 transition-colors ${meta.card} ${
        isBlank
          ? "cursor-pointer hover:border-[#3FA34D] dark:hover:border-[#43B75A] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3FA34D]"
          : ""
      }`}
    >
      {/* ============ TIME / NAME / AMOUNT ============ */}

      <div className="text-center">
        {!isBlank && (
          <p className={`text-[12px] leading-tight ${meta.text}`}>
            {formatElapsed(elapsedMinutes)}
          </p>
        )}

        <p
          className={`truncate text-[14px] font-semibold leading-snug ${meta.text}`}
          title={table.name}
        >
          {table.name}
        </p>

        {!isBlank && (
          <p className={`text-[12px] font-semibold leading-tight ${meta.accent}`}>
            {formatAmount(order?.grandTotal)}
          </p>
        )}
      </div>

      {/* ============ ACTIONS ============ */}

      {isBlank ? (
        // Reservations are the one thing worth knowing about an empty
        // table, so the badge takes the space the buttons would have used.
        table.upcomingReservation ? (
          <p className="truncate text-center text-[12px] text-[#8A7420] dark:text-[#C9A94A]">
            Reserved{" "}
            {new Date(table.upcomingReservation.reservedFor).toLocaleTimeString(
              "en-IN",
              { hour: "numeric", minute: "2-digit" },
            )}
          </p>
        ) : (
          <span className="sr-only">Free — open in POS</span>
        )
      ) : (
        <div className="flex items-center justify-center gap-1.5">
          {isPaid ? (
            <ActionButton
              label="Save and clear this table"
              onClick={onSave}
              disabled={saving}
              tone={buttonTone}
            >
              <FiSave size={13} className={meta.accent} />
            </ActionButton>
          ) : (
            <>
              <ActionButton
                label="Print bill"
                onClick={onPrint}
                disabled={!canPrint}
                tone={buttonTone}
              >
                <FiPrinter size={13} className={meta.accent} />
              </ActionButton>

              <ActionButton
                label="View order"
                onClick={onView}
                disabled={!canView}
                tone={buttonTone}
              >
                <FiEye size={13} className={meta.accent} />
              </ActionButton>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FloorTableCard;