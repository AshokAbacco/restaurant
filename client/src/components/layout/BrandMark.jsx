// ==============================================
// src/components/layout/BrandMark.jsx
// ==============================================
//
// The outlet's logo where one has been uploaded in Settings → Restaurant
// Profile, and the restaurant's initial where one hasn't.
//
// Its own file because the header and the sidebar both show it, and they
// need to degrade identically: a logo URL that 404s (deleted from storage,
// or an outlet restored from a backup) falls back to the initial rather
// than leaving a torn-image icon in the app's chrome.

import { useState } from "react";

const BrandMark = ({ logoUrl, restaurantName = "", size = "h-11 w-11" }) => {
  // Which URL failed, rather than a boolean — so a new logo uploaded after
  // a broken one gets a fresh attempt without an effect to reset the flag.
  const [failedUrl, setFailedUrl] = useState(null);
  const failed = failedUrl === logoUrl;

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={restaurantName}
        onError={() => setFailedUrl(logoUrl)}
        className={`${size} shrink-0 rounded-xl object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${size} flex shrink-0 items-center justify-center rounded-xl bg-[#3FA34D]/10 text-lg font-bold text-[#3FA34D] dark:bg-[#43B75A]/10 dark:text-[#43B75A]`}
    >
      {(restaurantName.charAt(0) || "R").toUpperCase()}
    </span>
  );
};

export default BrandMark;