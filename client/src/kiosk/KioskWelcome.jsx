import React, { useEffect, useState } from "react";

// Local high-quality food illustrations from your project workspace
import image1 from "./images/image-1.jpg";
import image2 from "./images/image-2.jpg";
import image4 from "./images/image-4.jpg";
import image5 from "./images/image-5.jpg";

const KioskWelcome = ({ onSelect }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#FAF9F6] flex flex-col justify-between overflow-x-hidden relative font-sans antialiased text-[#1C1C1E] select-none p-4 sm:p-6 md:p-10">
      {}
      {/* Background Soft Blurs for High-End Depth */}
      <div className="absolute top-[-10%] left-[-10%] w-[65vw] h-[65vw] bg-gradient-to-br from-orange-200/20 via-amber-100/10 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[55vw] h-[55vw] bg-gradient-to-tl from-orange-100/20 to-transparent rounded-full blur-[120px] pointer-events-none" />

      {}
      {/* Top Header */}
      <div className="flex items-center justify-between z-10 w-full mb-6">
        {/* Live Clock Button */}
        <span className="flex items-center gap-2 text-[11px] sm:text-xs font-extrabold tracking-wider text-[#8E8E93] bg-white/80 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-black/[0.03]">
          <svg
            className="w-3.5 h-3.5 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>

        {/* Brand identity mark */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-tr from-[#EE6C2E] to-[#F4894A] flex items-center justify-center shadow-lg shadow-orange-500/20">
            <span className="text-white text-base sm:text-lg font-black tracking-tighter">
              R
            </span>
          </div>
          <span className="text-[10px] sm:text-xs font-black tracking-[0.2em] sm:tracking-[0.25em] text-[#1C1C1E]/60 uppercase">
            RESTAURANT
          </span>
        </div>

        {/* Language Selection Switcher - FIXED duplicate stroke property here */}
        <button className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-extrabold text-[#48484A] bg-white/80 backdrop-blur-md px-4 sm:px-5 py-2.5 sm:py-3 rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.02)] border border-black/[0.03] active:scale-95 transition-all">
          <svg
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          <span>ENGLISH</span>
        </button>
      </div>

      {}
      {/* Welcome Message */}
      <div className="text-center px-4 z-10 my-4">
        <span className="text-[9px] sm:text-[10px] font-black tracking-[0.25em] sm:tracking-[0.3em] bg-orange-100/60 text-[#EE6C2E] px-4 py-1.5 sm:py-2 rounded-full uppercase border border-orange-500/10">
          CHOOSE YOUR EXPERIENCE
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-black tracking-tight text-[#1C1C1E] leading-[1.12] mt-4 sm:mt-5">
          How will you
          <br />
          <span className="bg-gradient-to-r from-[#EE6C2E] via-[#F4894A] to-[#E25C1D] bg-clip-text text-transparent">
            dine with us today?
          </span>
        </h1>
      </div>

      {}
      {/* Choice cards grid - dynamically stacks on mobile & portrait screens */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-10 sm:gap-8 md:gap-12 px-4 sm:px-14 my-auto z-10 w-full max-w-5xl mx-auto py-4">
        {/* Eat In Card */}
        <button
          onClick={() => onSelect("DINE_IN")}
          className="group relative w-full max-w-[280px] sm:max-w-[260px] md:max-w-[300px] h-[240px] sm:h-[340px] md:h-[380px] rounded-[36px] sm:rounded-[48px] bg-white p-6 sm:p-8 md:p-9 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.02)] hover:shadow-[0_30px_60px_rgba(238,108,46,0.08)] border border-black/[0.03] hover:border-orange-500/20 hover:-translate-y-2 sm:hover:-translate-y-4 active:scale-[0.97] transition-all duration-500 ease-out text-left overflow-visible"
        >
          <div className="absolute inset-0 rounded-[36px] sm:rounded-[48px] bg-gradient-to-b from-orange-500/[0.01] to-orange-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Glassmorphic Icon Badge */}
          <div className="self-start w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl sm:rounded-3xl bg-orange-50/70 border border-orange-500/10 flex items-center justify-center shadow-inner z-10 group-hover:scale-110 transition-all duration-500">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-[#EE6C2E]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>

          {/* Overlapping 3D Food Plate */}
          <div className="absolute top-[4%] sm:top-[8%] right-[-15px] sm:right-[-40px] md:right-[-45px] w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 pointer-events-none group-hover:scale-115 group-hover:rotate-[12deg] transition-all duration-500 ease-out z-20">
            <div className="w-full h-full relative">
              <img
                src={image2}
                alt="Eat In"
                className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.18)]"
              />
            </div>
          </div>

          <div className="z-10 mt-auto pr-20 sm:pr-6 md:pr-8">
            <p className="text-[#EE6C2E] text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">
              DINE IN
            </p>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-[#1C1C1E]">
              Eat In
            </h2>
            <p className="text-[#8E8E93] text-[10px] sm:text-xs font-semibold mt-1 leading-relaxed">
              Beautifully plated meals served hot straight to your table.
            </p>
          </div>
        </button>

        {}
        {/* Take Out Card (Dark Obsidian Theme) */}
        <button
          onClick={() => onSelect("TAKEAWAY")}
          className="group relative w-full max-w-[280px] sm:max-w-[260px] md:max-w-[300px] h-[240px] sm:h-[340px] md:h-[380px] rounded-[36px] sm:rounded-[48px] bg-[#121214] p-6 sm:p-8 md:p-9 flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.12)] hover:shadow-[0_35px_70px_rgba(0,0,0,0.25)] hover:-translate-y-2 sm:hover:-translate-y-4 active:scale-[0.97] transition-all duration-500 ease-out text-left overflow-visible"
        >
          <div className="absolute inset-0 rounded-[36px] sm:rounded-[48px] bg-gradient-to-tr from-[#EE6C2E]/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Glassmorphic Icon Badge */}
          <div className="self-start w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl sm:rounded-3xl bg-white/10 border border-white/5 flex items-center justify-center shadow-inner z-10 group-hover:scale-110 transition-all duration-500">
            <svg
              className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
              />
            </svg>
          </div>

          {/* Overlapping 3D Handheld Food */}
          <div className="absolute top-[4%] sm:top-[8%] right-[-15px] sm:right-[-40px] md:right-[-45px] w-32 h-32 sm:w-44 sm:h-44 md:w-52 md:h-52 pointer-events-none group-hover:scale-115 group-hover:rotate-[-10deg] transition-all duration-500 ease-out z-20">
            <div className="w-full h-full relative">
              <img
                src={image1}
                alt="Takeaway"
                className="absolute inset-0 w-full h-full object-contain filter drop-shadow-[0_25px_40px_rgba(0,0,0,0.3)]"
              />
            </div>
          </div>

          <div className="z-10 mt-auto pr-20 sm:pr-6 md:pr-8">
            <p className="text-white/50 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mb-1">
              TAKEAWAY
            </p>
            <h2 className="text-xl sm:text-3xl font-black tracking-tight text-white">
              To Go
            </h2>
            <p className="text-white/50 text-[10px] sm:text-xs font-semibold mt-1 leading-relaxed">
              Carefully wrapped & packed to stay perfectly hot and fresh.
            </p>
          </div>
        </button>
      </div>

      {}
      {/* Background elements - hidden on small tablets & mobile to guarantee uncluttered interactivity */}
      <div className="hidden md:block absolute left-[-60px] bottom-[-20px] w-40 h-40 opacity-30 rotate-[20deg] pointer-events-none transition-transform animate-pulse [animation-duration:8s]">
        <div className="w-full h-full relative">
          <img
            src={image5}
            alt="Decoration"
            className="absolute inset-0 w-full h-full object-contain filter blur-[0.5px]"
          />
        </div>
      </div>
      <div className="hidden md:block absolute right-[-50px] bottom-[8%] w-44 h-44 opacity-25 rotate-[-18deg] pointer-events-none transition-transform animate-pulse [animation-duration:11s]">
        <div className="w-full h-full relative">
          <img
            src={image4}
            alt="Decoration"
            className="absolute inset-0 w-full h-full object-contain filter blur-[0.5px]"
          />
        </div>
      </div>

      {}
      {/* Footer Label */}
      <div className="py-4 text-center z-10 w-full">
        <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.25em] sm:tracking-[0.3em] text-[#8E8E93]/60 uppercase">
          Freshly made, every order • Crafted with passion
        </p>
      </div>
    </div>
  );
};

export default KioskWelcome;
