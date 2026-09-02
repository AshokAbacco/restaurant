// src/auth/Login.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
  FiArrowRight,
  FiShoppingCart,
  FiBox,
  FiUsers,
  FiCheckCircle,
  FiSun,
  FiMoon,
  FiAlertCircle,
  FiX,
  FiMapPin,
  FiChevronRight,
} from "react-icons/fi";
import { FaUtensils } from "react-icons/fa";

// Loads the single body face used on this screen only. Scoped here
// rather than touching the global stylesheet/index.html.
function LoginFonts() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    `}</style>
  );
}

// Soft dotted grid used in the corner of the hero panel — purely decorative.
function DotGrid({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-[radial-gradient(circle,currentColor_1.5px,transparent_1.5px)] [background-size:14px_14px] ${className}`}
    />
  );
}

// Small self-contained error toast for this screen. Deliberately separate
// from the field-level red text below the inputs — that stays for
// accessibility/focus purposes, but a failed login is easy to miss if the
// only feedback is a thin line of red text under one field, especially
// since the password field itself gets no visual error state at all
// (see note on `errors.email` below). The toast makes "this failed" obvious
// regardless of which field currently has focus.
function ErrorToast({ message, onClose }) {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (!message) return;
    setEntered(false);
    const raf = requestAnimationFrame(() => setEntered(true));
    const timer = setTimeout(() => onClose(), 5000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed left-4 right-4 top-20 sm:left-auto sm:right-6 sm:top-6 z-[100] font-body">
      <div
        role="alert"
        aria-live="assertive"
        className={`pointer-events-auto flex w-full sm:w-[320px] max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-2xl border border-[#E7B4B0] bg-white p-4 shadow-lg shadow-[#7A1F1F]/10 ring-1 ring-black/5 transition-all duration-300 ease-out dark:border-[#5A2A26] dark:bg-[#1B211A] ${
          entered ? "translate-y-0 sm:translate-x-0 opacity-100" : "-translate-y-[130%] sm:translate-y-0 sm:translate-x-[130%] opacity-0"
        }`}
      >
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FBE9E7] dark:bg-[#3A2320]">
          <FiAlertCircle className="text-lg text-[#C0392B] dark:text-[#E5786A]" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-[#1C2620] dark:text-white">
            Sign in failed
          </p>
          <p className="mt-0.5 text-xs text-[#5B6B5F] dark:text-[#9FB0A3]">
            {message}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Dismiss"
          className="mt-0.5 shrink-0 rounded-lg p-1 text-[#B9C2B4] transition-colors hover:bg-[#F1EDE1] hover:text-[#5B6B5F] dark:hover:bg-white/10"
        >
          <FiX className="text-base" />
        </button>
      </div>
    </div>
  );
}

const Login = () => {
  // ==========================
  // STATES
  // ==========================

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({});

  // Toast message shown for login failures — separate from `errors` (which
  // still drives the inline red field state) so both can coexist.
  const [toastMessage, setToastMessage] = useState("");

  const navigate = useNavigate();

  const { login, selectOutlet, pendingOutletSelection } = useAuth();

  const { theme, toggleTheme } = useTheme();

  // FEATURE (multi-tenancy): outlet-selection step. selectingOutletId
  // tracks which outlet button is mid-request (for its own spinner) —
  // separate from the form's `loading`, since this screen replaces the
  // form entirely rather than sharing its submit button.
  const [selectingOutletId, setSelectingOutletId] = useState(null);
  const [outletError, setOutletError] = useState("");

  // ==========================
  // FEATURES LIST
  // ==========================

  const features = [
    {
      icon: <FiShoppingCart />,
      title: "Point of Sale",
      description: "Fast and easy billing",
    },
    {
      icon: <FiBox />,
      title: "Inventory",
      description: "Track stock in real time",
    },
    {
      icon: <FaUtensils />,
      title: "Kitchen Management",
      description: "Streamline kitchen operations",
    },
    {
      icon: <FiUsers />,
      title: "Staff Control",
      description: "Manage roles and access",
    },
  ];

  // ==========================
  // HANDLE INPUT CHANGE
  // ==========================

  const handleChange = (e) => {
    const { name, value, checked, type } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  // ==========================
  // VALIDATION
  // ==========================

  const validateForm = () => {
    let newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // ==========================
  // LOGIN
  // ==========================

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setToastMessage("");

    // FIX: this previously had no try/catch. If `login()` ever threw
    // (network error, unexpected response shape, etc.) instead of
    // resolving to { success: false }, execution would jump out of this
    // function entirely — setLoading(false) never ran, so the button stayed
    // stuck mid-submit and nothing visible happened, which is exactly what
    // reads as "the page just refreshed / did nothing" on a wrong password.
    try {
      const result = await login(formData.email, formData.password);

      if (!result.success) {
        // Backend intentionally returns one generic message for both a
        // wrong email/username AND a wrong password (see auth.service.js) —
        // this prevents the login form from being usable to check which
        // emails are registered (user enumeration). Surface it clearly via
        // toast rather than a thin line of red text that's easy to miss.
        const message = result.message || "Invalid email or password.";
        setErrors({ email: message });
        setToastMessage(message);
        return;
      }

      // FEATURE (multi-tenancy): password was correct but this account has
      // more than one outlet — AuthContext has stashed the pending
      // selection and this component will re-render showing the outlet
      // picker below instead of the form. Don't navigate yet.
      if (result.requiresOutletSelection) {
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      const message = err?.message || "Something went wrong. Please try again.";
      setErrors({ email: message });
      setToastMessage(message);
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // SELECT OUTLET (second step, multi-outlet accounts only)
  // ==========================

  const handleSelectOutlet = async (outletId) => {
    setSelectingOutletId(outletId);
    setOutletError("");

    try {
      const result = await selectOutlet(outletId);

      if (!result.success) {
        setOutletError(result.message || "Unable to select that outlet.");
        return;
      }

      navigate("/dashboard", { replace: true });
    } catch (err) {
      setOutletError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSelectingOutletId(null);
    }
  };

  // ==========================
  // UI
  // ==========================

  return (
    <div className="min-h-screen bg-white dark:bg-[#10140F] flex relative overflow-x-hidden transition-colors font-body">
      <LoginFonts />
      <ErrorToast message={toastMessage} onClose={() => setToastMessage("")} />

      {/* ============ FULL-WIDTH BOTTOM BLOB (page-level decoration) ============ */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 left-0 w-full h-64 bg-[#DFF3E3] dark:bg-[#12241A] rounded-[100%] opacity-70 dark:opacity-40 z-0"
      />

      {/* ============ THEME TOGGLE (TOP RIGHT) ============ */}

      <button
        onClick={toggleTheme}
        aria-label="Toggle light / dark theme"
        title={
          theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
        }
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-20 w-10 h-10 sm:w-11 sm:h-11 rounded-full border border-[#E4E0D2] dark:border-[#262B24] bg-white dark:bg-[#171C17] shadow-sm flex items-center justify-center hover:border-[#22B368]/40 dark:hover:border-[#59C97A]/40 transition-colors"
      >
        {theme === "dark" ? (
          <FiSun size={18} className="text-[#E0A24C]" />
        ) : (
          <FiMoon size={18} className="text-[#22B368]" />
        )}
      </button>

      {/* ================= LEFT SIDE (HERO) ================= */}
      {/* Hidden below lg — mobile/tablet users only see the sign-in card. */}

      <div className="hidden lg:flex w-1/2 relative overflow-hidden z-10 min-h-screen">
        {/* dotted grid accent, top-left corner */}
        <DotGrid className="absolute top-6 left-10 w-24 h-16 text-[#D8E6DB] dark:text-[#1E271F]" />

        <div className="relative z-10 flex flex-col justify-center px-10 lg:px-12 xl:px-20 w-full py-10">
          <p className="text-[#22B368] dark:text-[#59C97A] text-3xl xl:text-4xl font-extrabold tracking-tight mb-5.5">
            Restaurant ERP
          </p>

          <h1 className="text-xl lg:text-2xl xl:text-[1.85rem] font-extrabold leading-[1.15] text-[#1C2620] dark:text-white">
            Manage your restaurant 
           
            <span className="text-[#22B368] dark:text-[#59C97A]"> smarter,</span>{" "}
            not harder.
          </h1>

          <p className="mt-2.5 text-[#5B6B5F] dark:text-[#9FB0A3] text-sm leading-6 max-w-sm mb-4.5">
            All-in-one solution for POS, Inventory, Billing, Kitchen,
            Employees, CRM, Reports and Profit &amp; Loss.
          </p>

          <div className="mt-2.5 flex items-center gap-2" aria-hidden="true">
            <span className="h-1 w-10 rounded-full bg-[#22B368] dark:bg-[#59C97A]" />
            <span className="h-1 w-1 rounded-full bg-[#22B368] dark:bg-[#59C97A]" />
          </div>

          {/* Product illustration — swap the file at public/Res/res1.png to update */}
          <img
            src="/Res/res.png"
            alt="Restaurant ERP illustration"
            className="w-full max-w-[180px] lg:max-w-[260px] xl:max-w-[400px] mx-auto my-3 select-none"
            draggable="false"
          />

          {/* feature strip — 2 cols while the panel is narrow (lg), 4 once there's room (xl+) */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 bg-white dark:bg-[#171C17] rounded-2xl shadow-xl shadow-black/5 border border-[#EDEFE7] dark:border-[#262B24] px-4 py-4">
            {features.map((feature, index) => (
              <div key={index} className="min-w-0">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E9F8EE] dark:bg-[#1D2B20] text-[#22B368] dark:text-[#59C97A] text-sm mb-2">
                  {feature.icon}
                </span>
                <h3 className="font-bold text-xs text-[#1C2620] dark:text-white leading-tight">
                  {feature.title}
                </h3>
                <p className="text-[#5B6B5F] dark:text-[#9FB0A3] mt-1 text-[11px] leading-4">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE ================= */}

      <div className="flex-1 flex justify-center items-center p-4 sm:p-6 lg:p-8 relative z-10 min-h-screen">
        <div className="w-full max-w-md">
          {/* Mobile wordmark (left panel is hidden below lg) */}
          <div className="mb-4 flex items-center justify-center gap-2.5 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#22B368]/10 dark:bg-[#59C97A]/10 text-[#22B368] dark:text-[#59C97A]">
              <FaUtensils size={15} />
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-[#1C2620] dark:text-white">
              Restaurant ERP
            </span>
          </div>

          <div className="rounded-2xl sm:rounded-3xl shadow-2xl shadow-black/5 border border-[#EDEFE7] dark:border-[#262B24] bg-white dark:bg-[#171C17] px-5 py-6 sm:px-8 sm:py-7 transition-colors">
            <div className="text-center">
              <div className="mx-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#22B368] dark:bg-[#43B75A] flex items-center justify-center shadow-lg">
                <FaUtensils className="text-white" size={18} />
              </div>

              <h2 className="mt-3 text-lg sm:text-xl font-extrabold text-[#1C2620] dark:text-white">
                {pendingOutletSelection ? "Choose an outlet" : "Welcome back!"}
              </h2>

              <p className="mt-1.5 text-sm text-[#5B6B5F] dark:text-[#9FB0A3]">
                {pendingOutletSelection
                  ? "Your account has access to more than one outlet — pick one to continue."
                  : "Sign in to continue to your dashboard"}
              </p>
            </div>

            {pendingOutletSelection ? (
              // ==========================
              // OUTLET PICKER (multi-outlet accounts, second login step)
              // ==========================
              <div className="mt-6 sm:mt-8 space-y-3">
                {outletError && (
                  <p className="text-[#C0392B] dark:text-[#E5786A] text-sm text-center mb-2">
                    {outletError}
                  </p>
                )}

                {pendingOutletSelection.outlets.map((outlet) => (
                  <button
                    key={outlet.id}
                    type="button"
                    disabled={selectingOutletId !== null}
                    onClick={() => handleSelectOutlet(outlet.id)}
                    className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl border border-[#E4E0D2] dark:border-[#262B24] bg-[#FBF9F3] dark:bg-[#1D231D] hover:border-[#22B368] dark:hover:border-[#59C97A] disabled:opacity-50 transition-all text-left"
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22B368]/10 dark:bg-[#59C97A]/10">
                        <FiMapPin className="text-[#22B368] dark:text-[#59C97A]" />
                      </span>
                      <span className="font-semibold text-[#1C2620] dark:text-white truncate">
                        {outlet.name}
                      </span>
                    </span>
                    {selectingOutletId === outlet.id ? (
                      <svg
                        className="animate-spin h-5 w-5 text-[#22B368] dark:text-[#59C97A] shrink-0"
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
                    ) : (
                      <FiChevronRight className="text-[#9CA3AF] dark:text-[#6B7280] shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <form onSubmit={handleLogin} className="mt-5 space-y-3.5">
                {/* Email */}

                <div>
                  <label className="block text-sm font-semibold text-[#1C2620] dark:text-white mb-1.5">
                    Email address
                  </label>

                  <div className="relative">
                    <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#22B368] dark:text-[#59C97A] text-lg" />

                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="you@restaurant.com"
                      className={`w-full pl-12 pr-4 py-3 rounded-xl border bg-white dark:bg-[#1D231D] text-[#1C2620] dark:text-white outline-none transition-all ${
                        errors.email
                          ? "border-[#D64545]"
                          : "border-[#E4E0D2] dark:border-[#262B24] focus:border-[#22B368] dark:focus:border-[#59C97A]"
                      }`}
                    />
                  </div>

                  {errors.email && (
                    <p className="text-[#D64545] text-sm mt-2">
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Password */}

                <div>
                  <label className="block text-sm font-semibold text-[#1C2620] dark:text-white mb-2">
                    Password
                  </label>

                  <div className="relative">
                    <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#22B368] dark:text-[#59C97A] text-lg" />

                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="Enter your password"
                      className={`w-full pl-12 pr-14 py-3.5 rounded-xl border bg-white dark:bg-[#1D231D] text-[#1C2620] dark:text-white outline-none transition-all ${
                        errors.password
                          ? "border-[#D64545]"
                          : "border-[#E4E0D2] dark:border-[#262B24] focus:border-[#22B368] dark:focus:border-[#59C97A]"
                      }`}
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6B7280] dark:text-[#9FB0A3]"
                    >
                      {showPassword ? <FiEyeOff /> : <FiEye />}
                    </button>
                  </div>

                  {errors.password && (
                    <p className="text-[#D64545] text-sm mt-2">
                      {errors.password}
                    </p>
                  )}
                </div>

                {/* Remember Me & Forgot Password */}

                <div className="flex items-center justify-between flex-wrap gap-y-2">
                  <label className="flex items-center gap-2 text-sm text-[#5B6B5F] dark:text-[#9FB0A3] cursor-pointer">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={formData.remember}
                      onChange={handleChange}
                      className="w-4 h-4 accent-[#22B368] dark:accent-[#59C97A]"
                    />
                    Remember me
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-[#22B368] dark:text-[#59C97A] hover:text-[#178F4A] dark:hover:text-[#7BDB98] transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>

                {/* Login Button */}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#22B368] hover:bg-[#1C9457] disabled:bg-[#22B368]/50 dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] dark:disabled:bg-[#43B75A]/50 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg shadow-[#22B368]/25 hover:shadow-xl"
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
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
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <FiArrowRight />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Footer */}

            <div className="mt-6 sm:mt-8">
              {/* <div className="flex items-center gap-3" aria-hidden="true">
                <span className="h-px flex-1 bg-[#E4E0D2] dark:bg-[#262B24]" />
                <span className="text-xs text-[#9CA3AF] dark:text-[#6B7280]">
                  or
                </span>
                <span className="h-px flex-1 bg-[#E4E0D2] dark:bg-[#262B24]" />
              </div>

              <div className="mt-5 w-full flex items-center justify-center gap-2 rounded-xl border border-[#E4E0D2] dark:border-[#262B24] py-3 text-[#22B368] dark:text-[#59C97A] text-sm font-medium">
                <FiCheckCircle />
                Secure login
              </div> */}

              {/* Entry point to the public Owner signup. Without this link
                  /register is unreachable from the UI — a new restaurant
                  owner has no logged-in account to be invited from, so this
                  is the only way in. Hidden during the outlet-selection
                  step, where the user is already mid-login and offering
                  "create an account" would just be confusing. */}
              {!pendingOutletSelection && (
                <p className="mt-4 text-center text-sm text-[#5B6B5F] dark:text-[#9FB0A3]">
                  New to Restaurant ERP?{" "}
                  <Link
                    to="/register"
                    className="font-semibold text-[#22B368] dark:text-[#59C97A] hover:text-[#178F4A] dark:hover:text-[#7BDB98] transition-colors"
                  >
                    Create an owner account
                  </Link>
                </p>
              )}

              <p className="text-center text-[#5B6B5F] dark:text-[#9FB0A3] text-xs mt-5 leading-6">
                Restaurant ERP Management System
                <br />© {new Date().getFullYear()} All Rights Reserved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;