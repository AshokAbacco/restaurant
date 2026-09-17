// ==============================================
// src/landing/components/Wordmark.jsx
// ==============================================
//
// The public site's logo lockup.
//
// Deliberately not BrandMark: that one shows the logged-in outlet's own
// logo (Mehfil Arabic Restaurant, and so on). Out here there is no
// outlet yet — the brand on screen has to be the software's.
//
// Drawn as inline SVG rather than a PNG so it stays crisp, inherits
// currentColor for the dark footer, and costs no request.

import { Link } from "react-router-dom";

import { BRAND } from "../landing.config";

const Wordmark = ({ tone = "dark", showTag = true }) => {
  const wordColor = tone === "light" ? "text-[#F3F5EE]" : "text-[#171C17]";
  const tagColor = tone === "light" ? "text-[#9CA8A0]" : "text-[#6B7280]";

  return (
    <Link
      to="/"
      aria-label={`${BRAND.name} home`}
      className="group flex items-center gap-2.5"
    >
      <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#3FA34D] shadow-[0_6px_16px_-8px_rgba(63,163,77,0.9)]">
        {/* A cloche: the lid coming off a plate. Reads at 20px, which a
            fork-and-knife or a chef's hat does not. */}
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.9"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M3.5 16.5h17" />
          <path d="M5.6 16.5a6.4 6.4 0 0 1 12.8 0" />
          <path d="M12 8v-1.6" />
        </svg>
      </span>

      <span className="flex flex-col leading-none">
        <span
          className={`lp-title text-[19px] ${wordColor}`}
          style={{ letterSpacing: "-0.03em" }}
        >
          {BRAND.name}
        </span>

        {showTag && (
          <span className={`mt-1 text-[10.5px] font-medium ${tagColor}`}>
            {BRAND.tag}
          </span>
        )}
      </span>
    </Link>
  );
};

export default Wordmark;
