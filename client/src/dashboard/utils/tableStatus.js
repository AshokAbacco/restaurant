// ==============================================
// src/dashboard/utils/tableStatus.js
// ==============================================
//
// One place that decides what colour a table card is, so the legend, the
// card, and the filter counts can never disagree with each other.
//
// The five states, and what each one actually means in this system:
//
//   BLANK        Nothing on the table. No active order, nothing billed today
//                that hasn't been cleared.
//   RUNNING_KOT  An order exists and the kitchen is still working on it —
//                at least one ticket hasn't reached SERVED yet.
//   RUNNING      Everything the kitchen was sent has been served. The guests
//                are eating; the bill hasn't been raised.
//   PRINTED      An invoice exists but the money isn't fully in. Includes a
//                part-paid bill and a bill left on a customer's tab.
//   PAID         Invoice raised and covered in full. The card stays on the
//                board until someone clears it with Save.
//
// Kitchen progress is read from `order.kitchenStatus`, which the server
// derives from the LEAST advanced KitchenOrder on the order (see
// tables.service.js) — a table isn't served until every section's ticket is.

export const TABLE_STATE = {
  BLANK: "BLANK",
  RUNNING_KOT: "RUNNING_KOT",
  RUNNING: "RUNNING",
  PRINTED: "PRINTED",
  PAID: "PAID",
};

// Kitchen stages that mean the food has reached the table.
const SERVED_STAGES = new Set(["SERVED", "COMPLETED"]);

// Order statuses that mean the same thing, used as a fallback for orders
// with no kitchen tickets at all (e.g. a drinks-only order on an outlet
// with no beverage section configured — it would otherwise sit yellow
// forever, since there's no ticket that can ever reach SERVED).
const SERVED_ORDER_STATUSES = new Set(["SERVED", "OUT_FOR_DELIVERY"]);

// Money comparison tolerance. Totals arrive as Decimal strings and are
// summed as floats, so an exactly-settled bill can land a fraction of a
// paisa short and read as part-paid.
const PAYMENT_EPSILON = 0.5;

function isFullyPaid(order) {
  const total = Number(order?.grandTotal ?? 0);
  const paid = Number(order?.amountPaid ?? 0);
  if (total <= 0) return paid > 0;
  return paid >= total - PAYMENT_EPSILON;
}

/**
 * The order a card should describe: the live one if there is one, otherwise
 * today's settled bill that hasn't been cleared off the board yet.
 * Returns null for a blank table.
 */
export function cardOrder(table, clearedOrderIds) {
  if (table?.order) return table.order;

  const settled = table?.settledOrder;
  if (!settled) return null;
  if (clearedOrderIds?.has(settled.id)) return null;
  return settled;
}

export function deriveTableState(order) {
  if (!order) return TABLE_STATE.BLANK;

  if (order.invoice) {
    return isFullyPaid(order) ? TABLE_STATE.PAID : TABLE_STATE.PRINTED;
  }

  const servedInKitchen =
    order.kitchenStatus && SERVED_STAGES.has(order.kitchenStatus);
  const servedByStatus =
    !order.kitchenStatus && SERVED_ORDER_STATUSES.has(order.status);

  return servedInKitchen || servedByStatus
    ? TABLE_STATE.RUNNING
    : TABLE_STATE.RUNNING_KOT;
}

// Kitchen stages ordered least- to most-advanced. A takeaway or delivery
// order carries its raw KitchenOrder rows rather than the single
// `kitchenStatus` the tables board derives server-side, so the same
// "least advanced ticket wins" rule has to be applied here: an order isn't
// served until every section's ticket is.
const KITCHEN_STAGE_ORDER = [
  "NEW",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "SERVED",
  "COMPLETED",
];

/**
 * Reshapes an order from GET /pos/orders into what deriveTableState reads.
 *
 * That endpoint returns `payments` and `kitchenOrders` where the tables
 * board returns pre-computed `amountPaid` and `kitchenStatus`, and it
 * doesn't include the invoice at all. COMPLETED stands in for "invoice
 * raised" here, which holds because completeBilling is the only thing that
 * closes an order — nothing else moves an order to COMPLETED without
 * generating an invoice.
 */
export function normalizeCounterOrder(order) {
  if (!order) return null;

  const amountPaid = (order.payments || [])
    .filter((p) => p.status === "PAID")
    .reduce((total, p) => total + Number(p.amount), 0);

  const stages = (order.kitchenOrders || [])
    .map((k) => KITCHEN_STAGE_ORDER.indexOf(k.status))
    .filter((i) => i >= 0);

  const kitchenStatus = stages.length
    ? KITCHEN_STAGE_ORDER[Math.min(...stages)]
    : null;

  return {
    ...order,
    amountPaid,
    kitchenStatus,
    invoice: order.status === "COMPLETED" ? { id: order.id } : null,
  };
}

// ==============================================
// PALETTE
// ==============================================
//
// Deliberately NOT the app's green/amber semantic colours: on this screen
// green means "invoice printed", not "good", and yellow means "kitchen is
// cooking", not "warning". They're status codes staff learn by position on
// the legend, so they need to read as their own vocabulary.

export const TABLE_STATE_META = {
  [TABLE_STATE.BLANK]: {
    label: "Blank Table",
    swatch: "bg-[#D8DED2] dark:bg-[#3A423A]",
    card: "border-dashed border-[#D8DED2] dark:border-[#333B33] bg-[#F7F8F4] dark:bg-[#151A14]",
    text: "text-[#6B7280] dark:text-[#7E8A7E]",
    accent: "text-[#6B7280] dark:text-[#7E8A7E]",
  },
  [TABLE_STATE.RUNNING_KOT]: {
    label: "Running KOT",
    swatch: "bg-[#F4C430]",
    card: "border-[#EBD27A] dark:border-[#8A7420] bg-[#FDF6DC] dark:bg-[#332C10]",
    text: "text-[#5C4A0C] dark:text-[#F0DC96]",
    accent: "text-[#8A6D0B] dark:text-[#F4C430]",
  },
  [TABLE_STATE.RUNNING]: {
    label: "Running Table",
    swatch: "bg-[#4AA8E0]",
    card: "border-[#A8D4EE] dark:border-[#2C6488] bg-[#E8F4FB] dark:bg-[#0F2836]",
    text: "text-[#134A69] dark:text-[#B8DEF3]",
    accent: "text-[#1B6E9C] dark:text-[#6FC0EA]",
  },
  [TABLE_STATE.PRINTED]: {
    label: "Printed Table",
    swatch: "bg-[#5FC97A]",
    card: "border-[#A8E0B8] dark:border-[#2F7A44] bg-[#E4F7E9] dark:bg-[#0F2E1A]",
    text: "text-[#16512C] dark:text-[#B6E9C4]",
    accent: "text-[#1F7A3D] dark:text-[#6FD98C]",
  },
  [TABLE_STATE.PAID]: {
    label: "Paid Table",
    swatch: "bg-[#F5C08A]",
    card: "border-[#F0CCA6] dark:border-[#8A5C2C] bg-[#FDF0E2] dark:bg-[#33230F]",
    text: "text-[#6B4212] dark:text-[#F2D3B0]",
    accent: "text-[#9A5F1C] dark:text-[#F5B77E]",
  },
};

// Legend order — matches the reference layout, and reads as the actual
// lifecycle a table moves through from left to right.
export const TABLE_STATE_ORDER = [
  TABLE_STATE.BLANK,
  TABLE_STATE.RUNNING,
  TABLE_STATE.RUNNING_KOT,
  TABLE_STATE.PRINTED,
  TABLE_STATE.PAID,
];

// ==============================================
// ELAPSED TIME
// ==============================================

export function minutesSince(iso) {
  if (!iso) return null;
  const started = new Date(iso).getTime();
  if (Number.isNaN(started)) return null;
  return Math.max(0, Math.floor((Date.now() - started) / 60000));
}

// "0 Min" through "59 Min", then hours — a card is only ~90px wide, so
// "127 Min" would push the amount out of alignment with its neighbours.
export function formatElapsed(minutes) {
  if (minutes === null || minutes === undefined) return "";
  if (minutes < 60) return `${minutes} Min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} Hr` : `${hours}h ${rest}m`;
}

export function formatAmount(value) {
  const amount = Number(value ?? 0);
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// ==============================================
// CLEARED CARDS
// ==============================================
//
// Which settled bills have been dismissed from the board with Save.
//
// This is local to the device, and deliberately so for now: the order is
// already closed, invoiced, and visible on the Payments page before Save is
// ever pressed — Save acknowledges the card, it doesn't change any
// server-side state. Making it shared across terminals means a real column
// on Order (a `clearedAt`), which is a migration; see the note in
// Dashboard.jsx.
//
// Entries are keyed by day so this can't grow without bound, and yesterday's
// keys are dropped on read.

const STORAGE_KEY = "pos-cleared-tables";

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function readClearedOrderIds() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (parsed?.day !== todayKey()) return new Set();
    return new Set(parsed.ids || []);
  } catch {
    // Private browsing, a quota error, or someone hand-edited the value —
    // an unreadable acknowledgement list just means every settled card
    // shows, which is the safe direction to fail in.
    return new Set();
  }
}

export function writeClearedOrderIds(ids) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ day: todayKey(), ids: [...ids] }),
    );
  } catch {
    // Non-fatal: the card stays cleared for this session either way.
  }
}