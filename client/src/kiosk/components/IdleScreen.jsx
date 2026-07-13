// ==============================================
// src/kiosk/components/IdleScreen.jsx
// ==============================================

import React, { useEffect, useState } from "react";
import { FiArrowRight, FiClock } from "react-icons/fi";

// Local premium visual assets — swap the file extension below if yours
// aren't .png (e.g. .jpg / .webp).
import image1 from "../images/image-1.jpg";
import image2 from "../images/image-2.jpg";
import image3 from "../images/image-3.jpg";
import image4 from "../images/image-4.jpg";
import image5 from "../images/image-5.jpg";

const banners = [
  {
    id: 1,
    title: "Crafted to Perfection",
    subtitle: "Signature Flame-Grilled Burger",
    price: "₹199",
    tagline: "Chef's Choice",
    image: image1,
  },
  {
    id: 2,
    title: "Authentic Flavors",
    subtitle: "House Special Shoyu Ramen",
    price: "₹299",
    tagline: "Warm & Comforting",
    image: image2,
  },
  {
    id: 3,
    title: "Italian Classics",
    subtitle: "Slow-Cooked Tomato & Basil Pasta",
    price: "₹249",
    tagline: "Freshly Made Daily",
    image: image3,
  },
  {
    id: 4,
    title: "Garden Fresh",
    subtitle: "Seasonal Harvest Salad Bowl",
    price: "₹179",
    tagline: "Light & Vibrant",
    image: image4,
  },
  {
    id: 5,
    title: "Sweet Finish",
    subtitle: "Warm Butter Croissant",
    price: "₹129",
    tagline: "Baked Fresh Daily",
    image: image5,
  },
];

const IdleScreen = ({ onStart }) => {
  const [currentBanner, setCurrentBanner] = useState(0);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const slider = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 6000); // 6 seconds for a relaxed, premium pacing

    const clock = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => {
      clearInterval(slider);
      clearInterval(clock);
    };
  }, []);

  const banner = banners[currentBanner];

  return (
    <div
      onClick={onStart}
      className="w-screen h-screen overflow-hidden relative bg-[#FAF9F6] cursor-pointer select-none font-sans antialiased text-[#1C1C1E]"
    >
      {/* Full-bleed hero photo. Legibility for the text panel now comes
          from the glass card wrapping the text itself (below), not from
          washing out the photo — so the photo stays fully visible. */}
      <div className="absolute inset-0">
        <img
          key={banner.id}
          src={banner.image}
          alt={banner.title}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms]"
        />
        {/* Faint bottom vignette only, so the footer CTA row keeps contrast
            without dimming the rest of the photo. */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-black/5" />
      </div>

      {/* Top Header Panel (Glassmorphic, light) */}
      <div className="absolute top-0 left-0 right-0 px-12 py-8 flex justify-between items-center z-20">
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-black/[0.03] shadow-[0_4px_12px_rgba(0,0,0,0.03)]">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#EE6C2E] to-[#F4894A] flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-white text-sm font-black">R</span>
          </div>
          <div>
            <h1 className="text-sm font-black tracking-widest text-[#1C1C1E] uppercase">
              RESTAURANT
            </h1>
            <p className="text-[10px] font-bold tracking-wider text-[#8E8E93] uppercase">
              Self Ordering Kiosk
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-black/[0.03] shadow-[0_4px_12px_rgba(0,0,0,0.03)] text-[#48484A] font-semibold text-sm tracking-wide">
          <FiClock className="text-orange-500" />
          {time.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      </div>

      {/* Editorial-style text block, now in a frosted glass card so it
          stays readable over any part of the photo without washing the
          photo itself out. */}
      <div className="absolute bottom-40 left-12 max-w-xl z-20">
        <div className="bg-white/30 backdrop-blur-2xl rounded-[32px] border border-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.15)] px-9 py-8">
          <span className="inline-block bg-gradient-to-r from-[#EE6C2E] to-[#F4894A] text-white px-4 py-1.5 rounded-full font-bold text-xs tracking-wider uppercase mb-4 shadow-sm">
            {banner.tagline}
          </span>

          <h2 className="text-5xl font-black tracking-tight text-[#1C1C1E] leading-tight">
            {banner.title}
          </h2>

          <h3 className="text-2xl font-semibold text-[#3A3A3C] mt-2">
            {banner.subtitle}
          </h3>

          <div className="mt-4 text-3xl font-extrabold tracking-tight bg-gradient-to-r from-[#EE6C2E] to-[#E25C1D] bg-clip-text text-transparent">
            Starting at {banner.price}
          </div>
        </div>
      </div>

      {/* Footer / Interaction CTA Block */}
      <div className="absolute bottom-12 left-0 right-0 px-12 flex items-center justify-between z-20">
        {/* Pagination Dots */}
        <div className="flex gap-2">
          {banners.map((_, index) => (
            <div
              key={index}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                currentBanner === index ? "w-8 bg-[#EE6C2E]" : "w-2 bg-black/10"
              }`}
            />
          ))}
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-4 bg-gradient-to-r from-[#EE6C2E] to-[#F4894A] text-white pl-8 pr-6 py-4 rounded-full shadow-[0_24px_48px_rgba(238,108,46,0.3)] active:scale-95 transition-all duration-300">
          <span className="text-base font-extrabold tracking-tight uppercase">
            Touch Screen To Order
          </span>
          <div className="w-8 h-8 rounded-full bg-white/25 flex items-center justify-center text-white animate-pulse">
            <FiArrowRight size={16} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default IdleScreen;
