// ==============================================
// src/dashboard/components/NewOrderTile.jsx
// ==============================================
//
// The last tile in the Takeaway and Delivery rows: tap to start an order of
// that kind. Sized and shaped like a blank table card, because that's what
// it is — an empty slot you tap to begin. The reference POS does the same
// thing with its permanent Parcel 1–15 slots.
//
// It's what stops an empty section from being dead space. A "Takeaway"
// heading with nothing under it tells you there are no takeaway orders; a
// heading with a tappable slot under it also tells you where to make one.

import { FiPlus } from "react-icons/fi";

const NewOrderTile = ({ label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex min-h-[104px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#D8DED2] bg-[#F7F8F4] text-[#6B7280] transition-colors hover:border-[#3FA34D] hover:text-[#3FA34D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#3FA34D] dark:border-[#333B33] dark:bg-[#151A14] dark:text-[#7E8A7E] dark:hover:border-[#43B75A] dark:hover:text-[#43B75A]"
  >
    <FiPlus size={16} />
    <span className="px-1 text-center text-[12px] font-medium leading-tight">
      {label}
    </span>
  </button>
);

export default NewOrderTile;