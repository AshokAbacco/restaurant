// ==============================================
// src/kiosk/KioskCategoryView.jsx
// ==============================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiGlobe,
  FiCircle,
} from "react-icons/fi";

// Importing local high-fidelity fallback assets matching getAssetFallback keys
import burgerImg from "./images/burger.png";
import ramenImg from "./images/ramen.png";
import pastaImg from "./images/pasta.png";
import saladImg from "./images/salad.png";
import croissantImg from "./images/croissant.png";
import cakeImg from "./images/cake.png";

const getAssetFallback = (name = "") => {
  const normalName = name.toLowerCase();
  if (normalName.includes("burg")) return burgerImg;
  if (
    normalName.includes("biryani") ||
    normalName.includes("rice") ||
    normalName.includes("course") ||
    normalName.includes("chine")
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

const KioskCategoryView = ({
  categories = [],
  items = [],
  activeCategoryName,
  onChangeCategory,
  onBack,
  onSelectItem,
}) => {
  const stripRef = useRef(null);

  // Syncing with exact text category names directly matching your API state definitions
  const categoryItems = useMemo(
    () => items.filter((i) => i.category === activeCategoryName),
    [items, activeCategoryName],
  );

  const subCategories = useMemo(() => {
    const names = [
      ...new Set(categoryItems.map((i) => i.subCategory).filter(Boolean)),
    ];
    return names;
  }, [categoryItems]);

  const [activeSubCategory, setActiveSubCategory] = useState(null);
  const [filterTab, setFilterTab] = useState("All");

  useEffect(() => {
    setActiveSubCategory(null);
    setFilterTab("All");
  }, [activeCategoryName]);

  const scrollStrip = (dir) => {
    stripRef.current?.scrollBy({ left: dir * 160, behavior: "smooth" });
  };

  // Modernized filter maps matched directly to your API's foodType: "VEG" | "NON_VEG" format
  const filterOptions = useMemo(() => {
    if (subCategories.length) return null;
    const hasNonVeg = categoryItems.some((i) => i.foodType === "NON_VEG");
    return hasNonVeg ? ["All", "Veg", "Non-Veg"] : null;
  }, [categoryItems, subCategories]);

  const visibleItems = useMemo(() => {
    let list = categoryItems;
    if (activeSubCategory) {
      list = list.filter((i) => i.subCategory === activeSubCategory);
    }
    if (filterTab === "Veg") list = list.filter((i) => i.foodType === "VEG");
    if (filterTab === "Non-Veg")
      list = list.filter((i) => i.foodType === "NON_VEG");
    return list;
  }, [categoryItems, activeSubCategory, filterTab]);

  const showingSubCategoryTiles =
    subCategories.length > 0 && !activeSubCategory;

  return (
    <div className="h-screen w-screen max-h-screen bg-[#FAFAFX] flex flex-col overflow-hidden relative font-sans antialiased text-[#1C1C1E]">
      {/* Premium Ambient Background Decoration */}
      <div className="absolute top-0 right-0 w-[35vw] h-[35vw] bg-gradient-to-bl from-orange-100/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Container constrained neatly to max-7xl width context */}
      <div className="w-full max-w-7xl mx-auto flex flex-col h-full overflow-hidden">
        {/* Header Strip Section */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3 shrink-0 z-10">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm font-bold text-[#48484A] bg-white backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-black/[0.03] active:scale-95 transition-all"
          >
            <FiChevronLeft strokeWidth={2.5} className="text-[#EE6C2E]" />
            <span>Categories</span>
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-[#EE6C2E] to-[#F4894A] flex items-center justify-center shadow-md shadow-orange-500/10">
              <span className="text-white text-xs font-black">R</span>
            </div>
            <span className="text-[10px] font-black tracking-widest text-[#1C1C1E]/30 uppercase">
              {activeCategoryName}
            </span>
          </div>

          <button className="flex items-center gap-1.5 text-sm font-semibold text-[#48484A] bg-white/60 backdrop-blur-md px-4 py-2 rounded-full shadow-sm border border-black/[0.03]">
            <FiGlobe size={14} className="text-[#8E8E93]" />
            <span>EN</span>
          </button>
        </div>

        {/* Categories Strip Slider Viewport */}
        <div className="flex items-center gap-2 px-4 shrink-0 mt-2 z-10">
          <button
            onClick={() => scrollStrip(-1)}
            className="w-9 h-9 shrink-0 rounded-full bg-white border border-black/[0.04] flex items-center justify-center text-[#48484A] shadow-sm active:scale-90 transition-transform"
          >
            <FiChevronLeft size={18} strokeWidth={2.5} />
          </button>

          <div
            ref={stripRef}
            className="flex-1 flex gap-3 overflow-x-auto scrollbar-none py-2"
          >
            {categories
              .filter((c) => c.id !== "all" && c.name.toLowerCase() !== "all")
              .map((cat) => {
                const active = cat.name === activeCategoryName;
                const fallbackImage = getAssetFallback(cat.name);
                return (
                  <button
                    key={cat.id}
                    onClick={() => onChangeCategory(cat.name)}
                    className={`shrink-0 flex items-center gap-3 rounded-2xl px-4 py-2.5 border-2 transition-all duration-300 text-left ${
                      active
                        ? "border-[#EE6C2E] bg-white shadow-[0_10px_25px_rgba(238,108,74,0.06)]"
                        : "border-transparent bg-white/50 hover:bg-white border-black/[0.01]"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-[#FAFAFX] overflow-hidden flex items-center justify-center shrink-0 border border-black/[0.03]">
                      <img
                        src={cat.image || fallbackImage}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = fallbackImage;
                        }}
                      />
                    </div>
                    <span
                      className={`text-sm font-black tracking-tight ${active ? "text-[#EE6C2E]" : "text-[#48484A]"}`}
                    >
                      {cat.name}
                    </span>
                  </button>
                );
              })}
          </div>

          <button
            onClick={() => scrollStrip(1)}
            className="w-9 h-9 shrink-0 rounded-full bg-white border border-black/[0.04] flex items-center justify-center text-[#48484A] shadow-sm active:scale-90 transition-transform"
          >
            <FiChevronRight size={18} strokeWidth={2.5} />
          </button>
        </div>

        {/* Dynamic Context Secondary Menu Filters Bar */}
        <div className="flex items-center justify-between px-6 mt-6 shrink-0 z-10">
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-[#1C1C1E]">
              {activeSubCategory || activeCategoryName}
            </h2>
            <p className="text-xs text-[#8E8E93] font-medium mt-0.5">
              {showingSubCategoryTiles
                ? `${subCategories.length} sections found`
                : `${visibleItems.length} delicacies ready`}
            </p>
          </div>

          {filterOptions && (
            <div className="flex bg-black/[0.04] p-1 rounded-xl border border-black/[0.01]">
              {filterOptions.map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterTab(f)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all duration-200 ${
                    filterTab === f
                      ? "bg-white text-[#1C1C1E] shadow-sm"
                      : "text-[#8E8E93] hover:text-[#48484A]"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          )}

          {activeSubCategory && (
            <button
              onClick={() => setActiveSubCategory(null)}
              className="text-xs font-black tracking-tight text-[#EE6C2E] bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-500/10 active:scale-95 transition-all"
            >
              ← View All {activeCategoryName}
            </button>
          )}
        </div>

        {/* Content Display Port - Resized to crisp, compact dimensions */}
        <div className="flex-1 overflow-y-auto px-6 py-4 mt-2 scrollbar-none pb-44">
          {showingSubCategoryTiles ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {subCategories.map((sub) => {
                const preview = categoryItems.find(
                  (i) => i.subCategory === sub,
                );
                const fallbackImage = getAssetFallback(
                  sub || activeCategoryName,
                );
                return (
                  <button
                    key={sub}
                    onClick={() => setActiveSubCategory(sub)}
                    className="group flex flex-col bg-white border border-black/[0.02] rounded-[28px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.02)] hover:border-orange-500/20 active:scale-[0.97] transition-all duration-300 text-left"
                  >
                    <div className="w-full aspect-[4/3] bg-[#FAFAFX] overflow-hidden relative border-b border-black/[0.02]">
                      <img
                        src={preview?.image || fallbackImage}
                        alt={sub}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = fallbackImage;
                        }}
                      />
                    </div>
                    <div className="p-4">
                      <span className="font-black text-sm text-[#1C1C1E] tracking-tight group-hover:text-[#EE6C2E] transition-colors line-clamp-1">
                        {sub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
              {visibleItems.map((item) => {
                const fallbackImage = getAssetFallback(
                  item.name || activeCategoryName,
                );
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectItem(item)}
                    className="group flex flex-col bg-white border border-black/[0.02] rounded-[28px] overflow-hidden shadow-[0_8px_24px_rgba(0,0,0,0.02)] hover:border-orange-500/20 active:scale-[0.97] transition-all duration-300 text-left relative"
                  >
                    {/* Food Type Indicator Dot (Veg/Non-Veg indicator context) */}
                    <div className="absolute top-3 left-3 z-10 bg-white/90 backdrop-blur-md p-1.5 rounded-lg border border-black/[0.03] shadow-sm flex items-center justify-center">
                      <div
                        className={`w-2 h-2 rounded-full ${item.foodType === "VEG" ? "bg-emerald-500" : "bg-red-500"}`}
                      />
                    </div>

                    {/* Compact Item Image Box */}
                    <div className="w-full aspect-[4/3] bg-[#FAFAFX] overflow-hidden relative border-b border-black/[0.02]">
                      <img
                        src={item.image || fallbackImage}
                        alt={item.name}
                        className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          e.target.src = fallbackImage;
                        }}
                      />
                    </div>

                    <div className="p-4 flex flex-col justify-between flex-1">
                      <span className="block font-black text-sm text-[#1C1C1E] tracking-tight line-clamp-2 group-hover:text-[#EE6C2E] transition-colors leading-tight">
                        {item.name}
                      </span>
                      <span className="block text-sm font-black text-[#EE6C2E] mt-2">
                        ₹{item.price}
                      </span>
                    </div>
                  </button>
                );
              })}

              {visibleItems.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16 text-center w-full">
                  <FiCircle
                    className="text-[#8E8E93]/40 animate-pulse mb-3"
                    size={28}
                  />
                  <p className="text-sm font-bold text-[#8E8E93]">
                    No dynamic matches in this section yet.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KioskCategoryView;
