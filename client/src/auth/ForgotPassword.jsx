// src/auth/ForgotPassword.jsx
//
// UI matches Register.jsx / Login.jsx (green palette, Inter font, dotted
// grid, bottom waves, the /Res/res.png product art either side of the card,
// dark-mode toggle) so all public auth pages read as one product.
//
// Backend integration is UNCHANGED: same state, same validation, same
// authService.forgotPassword(email) call and success/error handling.
import React, { useState } from "react";
import { Link } from "react-router-dom";
import authService from "./authService";
import { useTheme } from "../context/ThemeContext";
import {
  FiArrowLeft,
  FiMail,
  FiSend,
  FiCheckCircle,
  FiShield,
  FiSun,
  FiMoon,
  FiKey,
} from "react-icons/fi";
import { FaUtensils } from "react-icons/fa";

// Scoped font loader, same as Register.jsx / Login.jsx.
function ForgotFonts() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    `}</style>
  );
}

// Decorative dotted grid, matching the register page.
function DotGrid({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-[radial-gradient(circle,currentColor_1.5px,transparent_1.5px)] [background-size:14px_14px] ${className}`}
    />
  );
}

// Same background art as Register.jsx: the /Res/res.png hero split into two
// halves that fade toward the card. CARD_HALF tracks this page's card width
// (max-w-md = 448px, so half is 224) — widen both together.
const CARD_HALF = 224;
const ART_TUCK = 30; // how far each crop hides under the card

function SideArt({ side }) {
  const isLeft = side === "left";
  const DISPLAY_W = 700;
  const width = isLeft ? 330 : 324;
  const offset = isLeft ? 0 : -376;

  const fade = `linear-gradient(to ${
    isLeft ? "left" : "right"
  }, transparent 0%, #000 46%)`;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 hidden -translate-y-1/2 overflow-hidden xl:block"
      style={{
        width,
        [isLeft ? "right" : "left"]: `calc(50% + ${CARD_HALF - ART_TUCK}px)`,
        maskImage: fade,
        WebkitMaskImage: fade,
      }}
    >
      <img
        src="/Res/res.png"
        alt=""
        draggable="false"
        className="max-w-none select-none"
        style={{ width: DISPLAY_W, height: "580px", marginLeft: offset }}
      />
    </div>
  );
}

// Soft green wave band across the bottom of the page.
function BottomWaves() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[260px] overflow-hidden"
    >
      <svg
        viewBox="0 0 1440 260"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <path
          d="M0 120 C 220 60, 420 170, 700 130 C 950 95, 1180 175, 1440 110 L1440 260 L0 260 Z"
          className="fill-[#E8F6EC] dark:fill-[#12241A]"
          opacity="0.85"
        />
        <path
          d="M0 175 C 260 120, 500 215, 780 175 C 1030 140, 1230 210, 1440 165 L1440 260 L0 260 Z"
          className="fill-[#D8F0E0] dark:fill-[#16301F]"
          opacity="0.75"
        />
      </svg>
    </div>
  );
}

const ForgotPassword = () => {
  // ==========================
  // STATES
  // ==========================

  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const [error, setError] = useState("");

  const { theme, toggleTheme } = useTheme();

  // ==========================
  // SUBMIT  (unchanged)
  // ==========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email.trim()) {
      setError("Please enter your registered email.");
      return;
    }

    try {
      setLoading(true);

      const result = await authService.forgotPassword(email);

      if (!result.success) {
        setError(result.message || "Something went wrong.");
        return;
      }

      setSuccess(true);
    } catch (err) {
      console.log(err);

      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // UI
  // ==========================

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white font-body transition-colors dark:bg-[#10140F]">
      <ForgotFonts />

      {/* ============ BACKGROUND DECORATION ============ */}

      <BottomWaves />

      <DotGrid className="absolute left-8 top-8 hidden h-16 w-24 text-[#D8E6DB] dark:text-[#1E271F] sm:block" />
      <DotGrid className="absolute right-16 top-24 hidden h-14 w-28 text-[#D8E6DB] dark:text-[#1E271F] sm:block" />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-[#EAF7EE] opacity-70 dark:bg-[#14241A] dark:opacity-40"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-6 top-1/3 hidden h-28 w-28 rounded-full bg-[#EAF7EE] opacity-70 dark:bg-[#14241A] dark:opacity-40 lg:block"
      />

      <SideArt side="left" />
      <SideArt side="right" />

      {/* ============ THEME TOGGLE (TOP RIGHT) ============ */}

      <button
        onClick={toggleTheme}
        aria-label="Toggle light / dark theme"
        title={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
        className="fixed right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E0D2] bg-white shadow-sm transition-colors hover:border-[#22B368]/40 dark:border-[#262B24] dark:bg-[#171C17] dark:hover:border-[#59C97A]/40 sm:right-6 sm:top-6 sm:h-11 sm:w-11"
      >
        {theme === "dark" ? (
          <FiSun size={18} className="text-[#E0A24C]" />
        ) : (
          <FiMoon size={18} className="text-[#22B368]" />
        )}
      </button>

      {/* ============ PAGE CONTENT ============ */}

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-6">
        {/* ---------- Brand header ---------- */}

        <div className="mb-7 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#22B368] shadow-lg shadow-[#22B368]/25 dark:bg-[#43B75A]">
            <FaUtensils className="text-white" size={22} />
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1C2620] dark:text-white sm:text-4xl">
            <a href="/" className="inline-flex items-center gap-1">
              Restaurant{" "}
              <span className="text-[#22B368] dark:text-[#59C97A]">ERP</span>
            </a>
          </h1>

          <p className="mt-2 text-sm text-[#5B6B5F] dark:text-[#9FB0A3] sm:text-base">
            Get back into your account in{" "}
            <span className="font-semibold text-[#22B368] dark:text-[#59C97A]">
              a few clicks
            </span>
            .
          </p>
        </div>

        {/* ---------- Card ---------- */}

        <div className="w-full max-w-md rounded-3xl border border-[#EDEFE7] bg-white px-5 py-7 shadow-2xl shadow-black/5 transition-colors dark:border-[#262B24] dark:bg-[#171C17] sm:px-8 sm:py-8">
          {/* Card header */}

          <div className="flex items-center justify-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E9F8EE] text-[#22B368] dark:bg-[#1D2B20] dark:text-[#59C97A]">
              {success ? <FiCheckCircle size={22} /> : <FiKey size={22} />}
            </span>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1C2620] dark:text-white sm:text-[1.6rem]">
                {success ? "Check your inbox" : "Forgot Password"}
              </h2>
              <p className="mt-0.5 text-sm text-[#5B6B5F] dark:text-[#9FB0A3]">
                {success
                  ? "Reset instructions are on their way."
                  : "We'll email you a link to reset it"}
              </p>
            </div>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} noValidate className="mt-8">
              <label
                htmlFor="email"
                className="mb-1.5 block text-[13px] font-bold text-[#1C2620] dark:text-white"
              >
                Email address
              </label>

              <div
                className={`flex items-stretch overflow-hidden rounded-xl border bg-white transition-colors dark:bg-[#1D231D] ${
                  error
                    ? "border-[#D64545]"
                    : "border-[#E4E0D2] focus-within:border-[#22B368] dark:border-[#262B24] dark:focus-within:border-[#59C97A]"
                }`}
              >
                <span
                  className={`flex w-12 shrink-0 items-center justify-center border-r text-[17px] text-[#22B368] dark:text-[#59C97A] ${
                    error
                      ? "border-[#D64545]/40 bg-[#FDF3F2] dark:bg-[#2A1D1B]"
                      : "border-[#EDEFE7] bg-[#F6FBF8] dark:border-[#262B24] dark:bg-[#1A211B]"
                  }`}
                >
                  <FiMail />
                </span>

                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your registered email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError("");
                  }}
                  className="min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[15px] text-[#1C2620] outline-none placeholder:text-[#9CA3AF] dark:text-white dark:placeholder:text-[#6B7280]"
                />
              </div>

              {error ? (
                <p className="mt-1.5 text-[13px] text-[#D64545]">{error}</p>
              ) : (
                <p className="mt-1.5 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                  Use the email you signed up or log in with
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[#22B368] py-3.5 font-semibold text-white shadow-lg shadow-[#22B368]/25 transition-all duration-300 hover:bg-[#1C9457] hover:shadow-xl disabled:bg-[#22B368]/50 dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] dark:disabled:bg-[#43B75A]/50"
              >
                {loading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        opacity="0.25"
                      />
                      <path
                        d="M22 12a10 10 0 00-10-10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    </svg>
                    Sending Reset Link...
                  </>
                ) : (
                  <>
                    <FiSend size={17} />
                    Send Reset Link
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="mt-8 rounded-2xl border border-[#B7E3C6] bg-[#F2FBF5] px-5 py-6 text-center dark:border-[#2A5A3C] dark:bg-[#132118]">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E9F8EE] dark:bg-[#1D2B20]">
                <FiCheckCircle className="text-4xl text-[#22B368] dark:text-[#59C97A]" />
              </div>

              <h3 className="mt-4 text-lg font-bold text-[#1C2620] dark:text-white">
                Email Sent Successfully
              </h3>

              <p className="mt-2 text-sm leading-6 text-[#5B6B5F] dark:text-[#9FB0A3]">
                If an account exists with{" "}
                <span className="font-semibold text-[#1C2620] dark:text-white">
                  {email}
                </span>
                , you'll receive password reset instructions shortly.
              </p>
            </div>
          )}

          {/* Security tips */}

          <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#F2FBF5] px-4 py-4 dark:bg-[#132118]">
            <span className="mt-0.5 shrink-0 text-lg text-[#22B368] dark:text-[#59C97A]">
              <FiShield />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#22B368] dark:text-[#59C97A]">
                Security tips
              </p>
              <ul className="mt-1.5 space-y-1.5 text-[13px] leading-5 text-[#5B6B5F] dark:text-[#9FB0A3]">
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="mt-[3px] shrink-0 text-[#22B368] dark:text-[#59C97A]" />
                  Use your registered email address to reset your password.
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="mt-[3px] shrink-0 text-[#22B368] dark:text-[#59C97A]" />
                  Never share your password with anyone.
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="mt-[3px] shrink-0 text-[#22B368] dark:text-[#59C97A]" />
                  Change your password regularly to keep your account secure.
                </li>
              </ul>
            </div>
          </div>

          {/* Back to login */}

          <div className="mt-6 border-t border-[#EDEFE7] pt-5 dark:border-[#262B24]">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm font-bold text-[#22B368] transition-colors hover:text-[#178F4A] dark:text-[#59C97A] dark:hover:text-[#7BDB98]"
            >
              <FiArrowLeft />
              Back to Login
            </Link>
          </div>
        </div>

        {/* ---------- Footer ---------- */}

        <div className="mt-6 text-center">
          <p className="flex items-center justify-center gap-2 text-sm text-[#5B6B5F] dark:text-[#9FB0A3]">
            <FiShield className="text-[#22B368] dark:text-[#59C97A]" />
            Restaurant ERP Management System
          </p>
          <p className="mt-1 text-sm text-[#5B6B5F] dark:text-[#9FB0A3]">
            © {new Date().getFullYear()} All Rights Reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;