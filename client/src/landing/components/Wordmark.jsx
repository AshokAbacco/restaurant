// ==============================================
// src/landing/components/Wordmark.jsx
// ==============================================

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
      {/* ✅ Logo Image (Replaced SVG) */}
      <span className="grid h-9 w-9 place-items-center rounded-[11px] bg-[#3FA34D] overflow-hidden shadow-[0_6px_16px_-8px_rgba(63,163,77,0.9)]">
        <img
          src="/Logo/icon.png"
          alt="logo"
          className="h-8 w-8 object-contain"
        />
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