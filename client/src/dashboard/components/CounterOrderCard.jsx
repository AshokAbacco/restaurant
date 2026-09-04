// ==============================================
// src/dashboard/components/CounterOrderCard.jsx
// ==============================================
//
// A takeaway or delivery order on the Table View. Same size, colours and
// action buttons as a table card, because to the person working the counter
// these are the same kind of object: an open order with money on it and a
// kitchen ticket somewhere. The only difference is what identifies it —
// an order number instead of a table name.

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

const CounterOrderCard = ({
  order,
  state,
  elapsedMinutes,
  onPrint,
  onView,
  onSave,
}) => {
  const meta = TABLE_STATE_META[state];
  const isPaid = state === TABLE_STATE.PAID;

  const buttonTone =
    "border-black/10 bg-white/70 hover:bg-white dark:border-white/15 dark:bg-black/25 dark:hover:bg-black/40";

  // The order number's meaningful part. "ORD-000047" in a 90px card wraps or
  // truncates to something unreadable; the digits are what anyone actually
  // reads out or matches against a token.
  const shortNumber = (order.orderNumber || "").split("-").pop();

  return (
    <div
      className={`flex min-h-[104px] flex-col justify-between rounded-lg border p-2 transition-colors ${meta.card}`}
    >
      <div className="text-center">
        <p className={`text-[12px] leading-tight ${meta.text}`}>
          {formatElapsed(elapsedMinutes)}
        </p>

        <p
          className={`truncate text-[14px] font-semibold leading-snug ${meta.text}`}
          title={order.orderNumber}
        >
          #{shortNumber}
        </p>

        <p className={`text-[12px] font-semibold leading-tight ${meta.accent}`}>
          {formatAmount(order.grandTotal)}
        </p>

        {/* Who it's for, where there's a name to show. A delivery order
            without a customer is normal — the platform holds that. */}
        {order.customer?.name && (
          <p
            className={`truncate text-[12px] leading-tight ${meta.text} opacity-70`}
            title={order.customer.name}
          >
            {order.customer.name}
          </p>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5">
        {isPaid ? (
          <ActionButton
            label="Save and clear this order"
            onClick={onSave}
            tone={buttonTone}
          >
            <FiSave size={13} className={meta.accent} />
          </ActionButton>
        ) : (
          <>
            <ActionButton label="Print bill" onClick={onPrint} tone={buttonTone}>
              <FiPrinter size={13} className={meta.accent} />
            </ActionButton>

            <ActionButton
              label="View order"
              onClick={onView}
              tone={buttonTone}
            >
              <FiEye size={13} className={meta.accent} />
            </ActionButton>
          </>
        )}
      </div>
    </div>
  );
};

export default CounterOrderCard;