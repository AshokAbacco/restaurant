// ==============================================
// src/kiosk/KioskMenuExplore.jsx
// ==============================================

import React, { useMemo, useState } from "react";
import { FiChevronLeft, FiGlobe, FiTrendingUp, FiGrid } from "react-icons/fi";

// Importing local high-fidelity assets for dynamic contextual map matching
import burgerImg from "./images/burger.png";
import ramenImg from "./images/ramen.png"; // Chinese / Noodles fallback
import pastaImg from "./images/pasta.png";
import saladImg from "./images/salad.png"; // Starters / Salad fallback
import croissantImg from "./images/croissant.png";
import cakeImg from "./images/cake.png";

// Comprehensive fallback mapper updated to match your exact backend categories
const getAssetFallback = (name = "") => {
  const normalName = name.toLowerCase();
  if (normalName.includes("burg")) return burgerImg;
  if (
    normalName.includes("biryani") ||
    normalName.includes("rice") ||
    normalName.includes("course")
  )
    return ramenImg;
  if (
    normalName.includes("chinese") ||
    normalName.includes("manchurian") ||
    normalName.includes("nood")
  )
    return ramenImg;
  if (
    normalName.includes("past") ||
    normalName.includes("pizza") ||
    normalName.includes("ital")
  )
    return pastaImg;
  if (
    normalName.includes("start") ||
    normalName.includes("fry") ||
    normalName.includes("sal")
  )
    return saladImg;
  if (normalName.includes("crois") || normalName.includes("bak"))
    return croissantImg;
  if (
    normalName.includes("cake") ||
    normalName.includes("sweet") ||
    normalName.includes("dessert") ||
    normalName.includes("brownie")
  )
    return cakeImg;
  return ramenImg;
};

const KioskMenuExplore = ({
  categories = [],
  items = [],
  onBack,
  onSelectCategory,
}) => {
  const [tab, setTab] = useState("home");

  // Filter out standalone "all" tabs and sort categories using dynamic order rank from API
  const cleanCategories = useMemo(() => {
    return [...categories]
      .filter((c) => c.id !== "all" && c.name.toLowerCase() !== "all")
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [categories]);

  // Popular items derived cleanly from incoming props
  const popularItems = useMemo(() => {
    return [...items].sort((a, b) => b.price - a.price).slice(0, 8);
  }, [items]);

  return (
    <div className="h-screen max-w-7xl max-h-screen m-auto bg-[#FAFAFX] flex flex-col overflow-hidden relative font-sans antialiased text-[#1C1C1E]">
      {/* Structural Background Soft Radial Ambience */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-gradient-to-bl from-orange-100/30 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header Panel */}
      <div className="flex items-center justify-between px-6 sm:px-10 pt-6 pb-4 z-10 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm font-bold text-[#48484A] bg-white backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-black/[0.03] active:scale-95 transition-all"
        >
          <FiChevronLeft strokeWidth={2.5} className="text-[#EE6C2E]" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#EE6C2E] to-[#F4894A] flex items-center justify-center shadow-md shadow-orange-500/20">
            <span className="text-white text-xs font-black">R</span>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-[#1C1C1E]/40 uppercase hidden sm:inline">
            EXPLORE
          </span>
        </div>

        <button className="flex items-center gap-1.5 text-sm font-semibold text-[#48484A] bg-white/60 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-black/[0.03]">
          <FiGlobe size={14} className="text-[#8E8E93]" />
          <span>EN</span>
        </button>
      </div>

      {/* Title & Filter Controls Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 sm:px-10 mt-2 z-10 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#1C1C1E]">
            Explore our Menu
          </h1>
          <p className="text-xs text-[#8E8E93] font-medium mt-0.5">
            {tab === "home"
              ? `${cleanCategories.length} Categories available`
              : "Top requested selections"}
          </p>
        </div>

        {/* Premium Apple-Style Segment Switcher */}
        <div className="flex bg-black/[0.04] p-1 rounded-2xl self-start sm:self-auto border border-black/[0.02]">
          <button
            onClick={() => setTab("home")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold tracking-tight transition-all duration-200 ${
              tab === "home"
                ? "bg-white text-[#1C1C1E] shadow-sm"
                : "text-[#8E8E93] hover:text-[#48484A]"
            }`}
          >
            <FiGrid size={13} />
            Category Hub
          </button>
          <button
            onClick={() => setTab("popular")}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold tracking-tight transition-all duration-200 ${
              tab === "popular"
                ? "bg-white text-[#1C1C1E] shadow-sm"
                : "text-[#8E8E93] hover:text-[#48484A]"
            }`}
          >
            <FiTrendingUp size={13} />
            Popular Items
          </button>
        </div>
      </div>

      {/* Dynamic Content Grid Viewport - Optimized with strict bottom padding containment */}
      <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 scrollbar-none pb-40">
        {tab === "home" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6">
            {cleanCategories.map((cat) => {
              const displayImage = cat.image || getAssetFallback(cat.name);
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.name)}
                  className="group flex flex-col bg-white border border-black/[0.02] rounded-[32px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:border-orange-500/20 active:scale-[0.97] transition-all duration-300 text-left"
                >
                  {/* Image wrapper changed to full height object-cover to capture real food photos correctly */}
                  <div className="w-full aspect-[4/3] bg-[#FAFAFX] overflow-hidden relative border-b border-black/[0.02]">
                    <img
                      src={displayImage}
                      alt={cat.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = getAssetFallback(cat.name);
                      }}
                    />
                  </div>
                  <div className="p-5">
                    <span className="font-black text-base sm:text-lg text-[#1C1C1E] tracking-tight group-hover:text-[#EE6C2E] transition-colors line-clamp-1">
                      {cat.name}
                    </span>
                    {cat.description && (
                      <p className="text-xs text-[#8E8E93] font-medium mt-1 line-clamp-1">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-4 gap-4 sm:gap-6">
            {popularItems.map((item) => {
              const displayImage = item.image || getAssetFallback(item.name);
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectCategory(item.category)}
                  className="group flex flex-col bg-white border border-black/[0.02] rounded-[32px] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.02)] hover:border-orange-500/20 active:scale-[0.97] transition-all duration-300 text-left relative"
                >
                  {/* Absolute Badge for Pricing UI */}
                  <div className="absolute top-3 right-3 z-10 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-xl text-xs font-black text-[#EE6C2E] shadow-sm border border-black/[0.02]">
                    ₹{item.price}
                  </div>

                  <div className="w-full aspect-[4/3] bg-[#FAFAFX] overflow-hidden relative border-b border-black/[0.02]">
                    <img
                      src={displayImage}
                      alt={item.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        e.target.src = getAssetFallback(item.name);
                      }}
                    />
                  </div>

                  <div className="p-5">
                    <span className="block font-black text-sm sm:text-base text-[#1C1C1E] tracking-tight line-clamp-1 group-hover:text-[#EE6C2E] transition-colors">
                      {item.name}
                    </span>
                    <span className="block text-[10px] font-bold text-[#8E8E93] uppercase tracking-widest mt-1">
                      {item.category || "Main Menu"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KioskMenuExplore;
