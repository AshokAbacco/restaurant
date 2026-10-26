// src/auth/ResetPassword.jsx
//
// UI matches Register.jsx / ForgotPassword.jsx (green palette, Inter font,
// dotted grid, bottom waves, the /Res/res.png product art either side of the
// card, dark-mode toggle) so all public auth pages read as one product.
//
// Backend integration is UNCHANGED: same token from ?token=, same strength
// scoring, same validation rules and the same
// authService.resetPassword(token, password) call and result handling.
import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import authService from "./authService";
import { useTheme } from "../context/ThemeContext";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiShield,
  FiSun,
  FiMoon,
  FiAlertCircle,
  FiKey,
} from "react-icons/fi";
import { FaUtensils } from "react-icons/fa";

// Scoped font loader, same as Register.jsx / Login.jsx.
function ResetFonts() {
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

// Shared input shell — the leading icon sits in its own tinted cell, same
// structure as Register.jsx's Field.
function Field({ label, name, icon, error, trailing = null, children }) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-1.5 block text-[13px] font-bold text-[#1C2620] dark:text-white"
      >
        {label}
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
          {icon}
        </span>

        {children}

        {trailing}
      </div>

      {error && <p className="mt-1.5 text-[13px] text-[#D64545]">{error}</p>}
    </div>
  );
}

const inputClasses =
  "min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[15px] text-[#1C2620] outline-none placeholder:text-[#9CA3AF] dark:text-white dark:placeholder:text-[#6B7280]";

const eyeButtonClasses =
  "px-3.5 text-[#6B7280] transition-colors hover:text-[#22B368] dark:text-[#9FB0A3] dark:hover:text-[#59C97A]";

const ResetPassword = () => {
  // ===========================
  // TOKEN (from the emailed link, e.g. /reset-password?token=...)
  // ===========================

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  // ===========================
  // STATES
  // ===========================

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const [errors, setErrors] = useState({});

  const { theme, toggleTheme } = useTheme();

  // ===========================
  // PASSWORD STRENGTH (scoring unchanged)
  // ===========================

  const passwordStrength = useMemo(() => {
    const password = formData.password;

    let score = 0;

    if (password.length >= 6) score++;

    if (/[A-Z]/.test(password)) score++;

    if (/[a-z]/.test(password)) score++;

    if (/[0-9]/.test(password)) score++;

    if (/[^A-Za-z0-9]/.test(password)) score++;

    return score;
  }, [formData.password]);

  const strengthColor = () => {
    if (passwordStrength <= 2) return "bg-[#D64545]";

    if (passwordStrength === 3) return "bg-[#E0A24C]";

    if (passwordStrength === 4) return "bg-[#59C97A]";

    return "bg-[#22B368]";
  };

  const strengthTextColor = () => {
    if (passwordStrength <= 2) return "text-[#D64545]";

    if (passwordStrength === 3) return "text-[#C98A2E]";

    return "text-[#22B368] dark:text-[#59C97A]";
  };

  const strengthText = () => {
    if (passwordStrength <= 2) return "Weak";

    if (passwordStrength === 3) return "Medium";

    if (passwordStrength === 4) return "Strong";

    return "Very Strong";
  };

  // ===========================
  // HANDLE CHANGE
  // ===========================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  // ===========================
  // VALIDATION (unchanged)
  // ===========================

  const validate = () => {
    const newErrors = {};

    if (!token) {
      newErrors.form =
        "This reset link is invalid or missing a token. Please request a new one.";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    if (formData.password.length < 6) {
      newErrors.password = "Password must contain at least 6 characters";
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Confirm password is required";
    }

    if (
      formData.password &&
      formData.confirmPassword &&
      formData.password !== formData.confirmPassword
    ) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // ===========================
  // SUBMIT (unchanged)
  // ===========================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    try {
      setLoading(true);

      const result = await authService.resetPassword(token, formData.password);

      if (!result.success) {
        setErrors({ form: result.message || "Unable to reset password." });
        return;
      }

      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  const requirements = [
    { label: "Minimum 6 characters", met: formData.password.length >= 6 },
    { label: "One uppercase letter", met: /[A-Z]/.test(formData.password) },
    { label: "One number", met: /[0-9]/.test(formData.password) },
    {
      label: "One special character",
      met: /[^A-Za-z0-9]/.test(formData.password),
    },
  ];

  // ===========================
  // UI
  // ===========================

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white font-body transition-colors dark:bg-[#10140F]">
      <ResetFonts />

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
            Choose a new password and get back to{" "}
            <span className="font-semibold text-[#22B368] dark:text-[#59C97A]">
              work
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
                {success ? "Password Updated" : "Reset Password"}
              </h2>
              <p className="mt-0.5 text-sm text-[#5B6B5F] dark:text-[#9FB0A3]">
                {success
                  ? "You can now log in with it."
                  : "Create a strong password to secure your account"}
              </p>
            </div>
          </div>

          {!success ? (
            <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
              {errors.form && (
                <div className="flex items-start gap-3 rounded-2xl border border-[#E7B4B0] bg-[#FDF3F2] px-4 py-3.5 dark:border-[#5A2A26] dark:bg-[#2A1D1B]">
                  <FiAlertCircle className="mt-0.5 shrink-0 text-lg text-[#C0392B] dark:text-[#E5786A]" />
                  <p className="text-[13px] leading-5 text-[#C0392B] dark:text-[#E5786A]">
                    {errors.form}
                  </p>
                </div>
              )}

              {/* New Password */}

              <Field
                label="New password"
                name="password"
                icon={<FiLock />}
                error={errors.password}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className={eyeButtonClasses}
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                }
              >
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  className={inputClasses}
                />
              </Field>

              {/* Password Strength */}

              <div>
                <div className="mb-2 flex justify-between">
                  <span className="text-[13px] font-medium text-[#5B6B5F] dark:text-[#9FB0A3]">
                    Password strength
                  </span>

                  <span className={`text-[13px] font-bold ${strengthTextColor()}`}>
                    {formData.password ? strengthText() : "—"}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-[#EDEFE7] dark:bg-[#262B24]">
                  <div
                    className={`h-full rounded-full ${strengthColor()} transition-all duration-300`}
                    style={{
                      width: `${passwordStrength * 20}%`,
                    }}
                  />
                </div>
              </div>

              {/* Confirm Password */}

              <Field
                label="Confirm password"
                name="confirmPassword"
                icon={<FiLock />}
                error={errors.confirmPassword}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                    className={eyeButtonClasses}
                  >
                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                }
              >
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  autoComplete="new-password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className={inputClasses}
                />
              </Field>

              {/* Password Requirements */}

              <div className="rounded-xl bg-[#F2FBF5] px-4 py-4 dark:bg-[#132118]">
                <p className="flex items-center gap-2 text-sm font-bold text-[#22B368] dark:text-[#59C97A]">
                  <FiShield />
                  Password requirements
                </p>

                <ul className="mt-2.5 grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
                  {requirements.map((req) => (
                    <li
                      key={req.label}
                      className={`flex items-center gap-2 transition-colors ${
                        req.met
                          ? "text-[#1C2620] dark:text-white"
                          : "text-[#5B6B5F] dark:text-[#9FB0A3]"
                      }`}
                    >
                      <FiCheckCircle
                        className={`shrink-0 ${
                          req.met
                            ? "text-[#22B368] dark:text-[#59C97A]"
                            : "text-[#B9C2B4] dark:text-[#4B5A4E]"
                        }`}
                      />
                      {req.label}
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="!mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[#22B368] py-3.5 font-semibold text-white shadow-lg shadow-[#22B368]/25 transition-all duration-300 hover:bg-[#1C9457] hover:shadow-xl disabled:bg-[#22B368]/50 dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] dark:disabled:bg-[#43B75A]/50"
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
                    Updating Password...
                  </>
                ) : (
                  <>
                    <FiKey size={17} />
                    Reset Password
                  </>
                )}
              </button>
            </form>
          ) : (
            <>
              <div className="mt-8 rounded-2xl border border-[#B7E3C6] bg-[#F2FBF5] px-5 py-6 text-center dark:border-[#2A5A3C] dark:bg-[#132118]">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E9F8EE] dark:bg-[#1D2B20]">
                  <FiCheckCircle className="text-4xl text-[#22B368] dark:text-[#59C97A]" />
                </div>

                <h3 className="mt-4 text-lg font-bold text-[#1C2620] dark:text-white">
                  Password changed successfully
                </h3>

                <p className="mt-2 text-sm leading-6 text-[#5B6B5F] dark:text-[#9FB0A3]">
                  Your password has been successfully updated. You can now
                  login using your new password.
                </p>
              </div>

              <Link
                to="/login"
                className="mt-6 flex w-full items-center justify-center gap-3 rounded-xl bg-[#22B368] py-3.5 font-semibold text-white shadow-lg shadow-[#22B368]/25 transition-all duration-300 hover:bg-[#1C9457] hover:shadow-xl dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
              >
                <FiArrowLeft />
                Back to Login
              </Link>
            </>
          )}

          {/* Security tips */}

          <div className="mt-6 flex items-start gap-3 rounded-xl bg-[#F2FBF5] px-4 py-4 dark:bg-[#132118]">
            <span className="mt-0.5 shrink-0 text-lg text-[#22B368] dark:text-[#59C97A]">
              <FiShield />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#22B368] dark:text-[#59C97A]">
                Password security tips
              </p>
              <ul className="mt-1.5 space-y-1.5 text-[13px] leading-5 text-[#5B6B5F] dark:text-[#9FB0A3]">
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="mt-[3px] shrink-0 text-[#22B368] dark:text-[#59C97A]" />
                  Never share your password with anyone.
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="mt-[3px] shrink-0 text-[#22B368] dark:text-[#59C97A]" />
                  Use a unique password for your restaurant account.
                </li>
                <li className="flex items-start gap-2">
                  <FiCheckCircle className="mt-[3px] shrink-0 text-[#22B368] dark:text-[#59C97A]" />
                  Change your password periodically for better security.
                </li>
              </ul>
            </div>
          </div>

          {/* Back to login (form state only — success state has its own button) */}

          {!success && (
            <div className="mt-6 border-t border-[#EDEFE7] pt-5 dark:border-[#262B24]">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-sm font-bold text-[#22B368] transition-colors hover:text-[#178F4A] dark:text-[#59C97A] dark:hover:text-[#7BDB98]"
              >
                <FiArrowLeft />
                Back to Login
              </Link>
            </div>
          )}
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

export default ResetPassword;