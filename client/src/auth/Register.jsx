// src/auth/Register.jsx
//
// Public Owner signup. Only the OWNER role can register here — the role is
// never sent from this form; the backend hardcodes it (see
// auth.service.js's registerOwner). Once an owner has registered and logged
// in, they create staff accounts from inside the app (Employees module),
// which writes to UserAccount.
//
// Layout is a single centered column (not Login.jsx's split hero) — the
// form has enough fields that a two-column card reads better than one long
// scroll. Palette, dark-mode tokens, and the toast are kept identical to
// Login.jsx so the two public pages still read as one product.
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
  FiUser,
  FiUserPlus,
  FiPhone,
  FiHome,
  FiMapPin,
  FiShield,
  FiArrowRight,
  FiCheckCircle,
  FiSun,
  FiMoon,
  FiAlertCircle,
  FiX,
} from "react-icons/fi";
import { FaUtensils, FaUniversity } from "react-icons/fa";

// Scoped font loader, same as Login.jsx — kept local to the screen rather
// than added to the global stylesheet.
function RegisterFonts() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
      .font-body { font-family: 'Inter', ui-sans-serif, system-ui, sans-serif; }
    `}</style>
  );
}

// Decorative dotted grid, matching the login hero.
function DotGrid({ className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-[radial-gradient(circle,currentColor_1.5px,transparent_1.5px)] [background-size:14px_14px] ${className}`}
    />
  );
}

// The two product shots flanking the card are the SAME asset as the login
// hero (/Res/res.png), cropped into two halves rather than duplicated —
// showing the whole composition twice would read as a mistake. The left
// crop lands on the cup/hat/cloche, the right on the clipboard and leaves.
//
// The objects in that PNG physically overlap (the clipboard sits behind the
// cloche), so no split point exists that cleanly separates them — whichever
// column you cut on, something gets sliced. The fix is positional rather
// than pictorial: each crop is anchored so its CUT edge faces the card and
// slides ~30px underneath it. The card paints on top, so the slice is never
// visible and the artwork reads as continuing behind the panel. The
// viewport trims the outer edges, exactly as in the mockup.
//
// CARD_HALF must therefore track the card's own max-width (max-w-3xl =
// 768px, so half is 384). If you widen the card, widen this to match or the
// cut edges will crawl out from behind it.
const CARD_HALF = 384;
const ART_TUCK = 30; // how far each crop hides under the card

function SideArt({ side }) {
  const isLeft = side === "left";

  // Crop windows in DISPLAYED pixels (the source is 558px wide, shown at
  // DISPLAY_W, so 1 source px ≈ 1.25 displayed px).
  //
  // Measuring the asset: the cloche's silver ends at source x≈461 and the
  // clipboard's frame at x≈467 — they occupy nearly the same columns and
  // are separated only vertically (clipboard above, dome below). So NO
  // horizontal cut can put one in each half; cutting late enough to drop
  // the dome also decapitates the clipboard's checklist.
  //
  // Hence a soft edge instead of a hard one: each half is masked so it
  // dissolves toward the card. The leftover dome fragment on the right sits
  // exactly in that dissolve, so it fades out instead of duplicating, and
  // neither half ever shows a cut line.
  const DISPLAY_W = 700;
  const width = isLeft ? 330 : 324;
  const offset = isLeft ? 0 : -376;

  // Fade runs from the card-facing edge inward.
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

// Same toast as Login.jsx, with the heading parameterised so it can report
// a success as well as a failure. This form is long enough that inline
// field errors alone are easy to miss — the offending input can easily be
// scrolled out of view when the submit button is at the bottom.
function Toast({ message, tone = "error", onClose }) {
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

  const isError = tone === "error";

  return (
    <div className="pointer-events-none fixed left-4 right-4 top-20 z-[100] font-body sm:left-auto sm:right-6 sm:top-6">
      <div
        role="alert"
        aria-live="assertive"
        className={`pointer-events-auto flex w-full max-w-[calc(100vw-2rem)] items-start gap-3 overflow-hidden rounded-2xl border bg-white p-4 shadow-lg ring-1 ring-black/5 transition-all duration-300 ease-out dark:bg-[#1B211A] sm:w-[320px] ${
          isError
            ? "border-[#E7B4B0] shadow-[#7A1F1F]/10 dark:border-[#5A2A26]"
            : "border-[#B7E3C6] shadow-[#1C9457]/10 dark:border-[#2A5A3C]"
        } ${
          entered
            ? "translate-y-0 opacity-100 sm:translate-x-0"
            : "-translate-y-[130%] opacity-0 sm:translate-y-0 sm:translate-x-[130%]"
        }`}
      >
        <span
          className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isError
              ? "bg-[#FBE9E7] dark:bg-[#3A2320]"
              : "bg-[#E9F8EE] dark:bg-[#1D2B20]"
          }`}
        >
          {isError ? (
            <FiAlertCircle className="text-lg text-[#C0392B] dark:text-[#E5786A]" />
          ) : (
            <FiCheckCircle className="text-lg text-[#22B368] dark:text-[#59C97A]" />
          )}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-[#1C2620] dark:text-white">
            {isError ? "Registration failed" : "Account created"}
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

// Column heading ("Restaurant Details" / "Security Details") with the
// two-tone rule underneath — a short green segment sitting on a full-width
// neutral line.
function SectionHeading({ icon, title }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 text-[#22B368] dark:text-[#59C97A]">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      </div>

      <div
        aria-hidden="true"
        className="relative mt-2.5 h-[2px] w-full rounded-full bg-[#EDEFE7] dark:bg-[#262B24]"
      >
        <span className="absolute left-0 top-0 h-full w-14 rounded-full bg-[#22B368] dark:bg-[#59C97A]" />
      </div>
    </div>
  );
}

// Shared input shell. The leading icon sits in its own tinted cell divided
// off from the text area — repeating that structure inline for seven fields
// is how this page and Login.jsx would drift apart over time.
function Field({
  label,
  name,
  icon,
  error,
  hint = null,
  trailing = null,
  children,
}) {
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

      {error ? (
        <p className="mt-1.5 text-[13px] text-[#D64545]">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-[#9CA3AF] dark:text-[#6B7280]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

const inputClasses =
  "min-w-0 flex-1 bg-transparent px-3.5 py-3 text-[15px] text-[#1C2620] outline-none placeholder:text-[#9CA3AF] dark:text-white dark:placeholder:text-[#6B7280]";

const INITIAL_FORM = {
  restaurantName: "",
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  address: "",
};

const Register = () => {
  // ==========================
  // STATES
  // ==========================

  const [formData, setFormData] = useState(INITIAL_FORM);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);

  const [errors, setErrors] = useState({});

  const [toast, setToast] = useState({ message: "", tone: "error" });

  // Set once registration succeeds. The card swaps to a confirmation panel
  // instead of navigating immediately — an instant redirect to /login makes
  // it look like the form silently reset, which reads as failure.
  const [registeredEmail, setRegisteredEmail] = useState("");

  const navigate = useNavigate();

  const { register } = useAuth();

  const { theme, toggleTheme } = useTheme();

  // ==========================
  // HANDLE INPUT CHANGE
  // ==========================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({ ...prev, [name]: value }));

    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ==========================
  // VALIDATION
  // Mirrors registerSchema in server/src/auth/auth.validation.js so the
  // user gets instant feedback, but the server's copy is the one that
  // actually protects the database — this is convenience, not a guarantee.
  // confirmPassword is the one field that exists ONLY here; the API doesn't
  // take it, since a mistyped password is a UI concern.
  // ==========================

  const validateForm = () => {
    const newErrors = {};

    if (!formData.restaurantName.trim()) {
      newErrors.restaurantName = "Restaurant name is required";
    } else if (formData.restaurantName.trim().length < 2) {
      newErrors.restaurantName =
        "Restaurant name must be at least 2 characters";
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Owner name is required";
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = "Owner name must be at least 2 characters";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^[+]?[\d\s()-]{7,20}$/.test(formData.phone.trim())) {
      newErrors.phone = "Enter a valid phone number";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = "Enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    } else if (formData.address.trim().length < 5) {
      newErrors.address = "Address must be at least 5 characters";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  // ==========================
  // REGISTER
  // ==========================

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setToast({ message: "", tone: "error" });

    try {
      // confirmPassword is stripped here — it's a UI-only field and the
      // backend schema doesn't accept it.
      const { confirmPassword, ...payload } = formData;

      const result = await register(payload);

      if (!result.success) {
        // validate.js returns a per-field issue list on a 400. Map it back
        // onto the inputs so the specific bad field turns red, rather than
        // only surfacing one generic message at the top.
        if (result.errors?.length) {
          const fieldErrors = {};
          result.errors.forEach((issue) => {
            if (issue.field) fieldErrors[issue.field] = issue.message;
          });
          setErrors(fieldErrors);
        }

        setToast({
          message: result.message || "Registration failed. Please try again.",
          tone: "error",
        });
        return;
      }

      setRegisteredEmail(formData.email.trim().toLowerCase());
      setToast({
        message: "You can now sign in with your email and password.",
        tone: "success",
      });
      setFormData(INITIAL_FORM);
    } catch (err) {
      // Same guard as Login.jsx: without this, a thrown error (offline,
      // unexpected response shape) skips the finally block's
      // setLoading(false) and the button stays stuck mid-submit, which
      // reads as "nothing happened".
      setToast({
        message: err?.message || "Something went wrong. Please try again.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // ==========================
  // UI
  // ==========================

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-white font-body transition-colors dark:bg-[#10140F]">
      <RegisterFonts />
      <Toast
        message={toast.message}
        tone={toast.tone}
        onClose={() => setToast({ message: "", tone: "error" })}
      />

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
      {/* Not in the mockup, but the app has a global theme and Login.jsx
          offers the same control — dropping it here would strand anyone who
          switched to dark mode on the previous screen. */}

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
            Restaurant{" "}
            <span className="text-[#22B368] dark:text-[#59C97A]">ERP</span>
          </h1>

          <p className="mt-2 text-sm text-[#5B6B5F] dark:text-[#9FB0A3] sm:text-base">
            Set up your restaurant in{" "}
            <span className="font-semibold text-[#22B368] dark:text-[#59C97A]">
              minutes
            </span>
            , not weeks.
          </p>
        </div>

        {/* ---------- Card ---------- */}

        <div className="w-full max-w-3xl rounded-3xl border border-[#EDEFE7] bg-white px-5 py-7 shadow-2xl shadow-black/5 transition-colors dark:border-[#262B24] dark:bg-[#171C17] sm:px-9 sm:py-8">
          {/* Card header */}

          <div className="flex items-center justify-center gap-3.5">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#E9F8EE] text-[#22B368] dark:bg-[#1D2B20] dark:text-[#59C97A]">
              {registeredEmail ? (
                <FiCheckCircle size={22} />
              ) : (
                <FiUser size={22} />
              )}
            </span>

            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-[#1C2620] dark:text-white sm:text-[1.6rem]">
                {registeredEmail ? "You're all set!" : "Create Owner Account"}
              </h2>
              <p className="mt-0.5 text-sm text-[#5B6B5F] dark:text-[#9FB0A3]">
                {registeredEmail
                  ? "Your restaurant has been created."
                  : "Register your restaurant to get started"}
              </p>
            </div>
          </div>

          {registeredEmail ? (
            // ==========================
            // SUCCESS PANEL
            // Shown instead of an immediate redirect, so the user gets an
            // explicit confirmation and sees which email to sign in with.
            // ==========================
            <div className="mx-auto mt-7 max-w-md">
              <div className="rounded-2xl border border-[#B7E3C6] bg-[#F2FBF5] px-5 py-5 text-center dark:border-[#2A5A3C] dark:bg-[#132118]">
                <p className="text-sm leading-6 text-[#5B6B5F] dark:text-[#9FB0A3]">
                  Sign in with
                  <br />
                  <span className="break-all font-bold text-[#1C2620] dark:text-white">
                    {registeredEmail}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
                className="mt-5 flex w-full items-center justify-center gap-3 rounded-xl bg-[#22B368] py-3.5 font-semibold text-white shadow-lg shadow-[#22B368]/25 transition-all duration-300 hover:bg-[#1C9457] hover:shadow-xl dark:bg-[#43B75A] dark:hover:bg-[#3AA34E]"
              >
                Continue to sign in
                <FiArrowRight />
              </button>

              <p className="mt-4 text-center text-xs leading-5 text-[#5B6B5F] dark:text-[#9FB0A3]">
                You can add staff accounts, outlets, and your menu once
                you&apos;re signed in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="mt-7">
              {/* Two columns on lg, stacked below. The divider is a border
                  on the right column so it can't outlive the split layout. */}
              <div className="grid grid-cols-1 gap-x-9 gap-y-8 lg:grid-cols-2">
                {/* ============ RESTAURANT DETAILS ============ */}

                <div className="lg:pr-1">
                  <SectionHeading
                    icon={<FaUniversity />}
                    title="Restaurant Details"
                  />

                  <div className="space-y-3.5">
                    <Field
                      label="Restaurant name"
                      name="restaurantName"
                      icon={<FiHome />}
                      error={errors.restaurantName}
                    >
                      <input
                        id="restaurantName"
                        type="text"
                        name="restaurantName"
                        autoComplete="organization"
                        value={formData.restaurantName}
                        onChange={handleChange}
                        placeholder="Enter restaurant name"
                        className={inputClasses}
                      />
                    </Field>

                    <Field
                      label="Full name"
                      name="fullName"
                      icon={<FiUser />}
                      error={errors.fullName}
                    >
                      <input
                        id="fullName"
                        type="text"
                        name="fullName"
                        autoComplete="name"
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="Enter full name"
                        className={inputClasses}
                      />
                    </Field>

                    <Field
                      label="Phone number"
                      name="phone"
                      icon={<FiPhone />}
                      error={errors.phone}
                    >
                      <input
                        id="phone"
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                        className={inputClasses}
                      />
                    </Field>

                    <Field
                      label="Email address"
                      name="email"
                      icon={<FiMail />}
                      error={errors.email}
                    >
                      <input
                        id="email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter email address"
                        className={inputClasses}
                      />
                    </Field>

                    <Field
                      label="Address"
                      name="address"
                      icon={<FiMapPin />}
                      error={errors.address}
                    >
                      <input
                        id="address"
                        type="text"
                        name="address"
                        autoComplete="street-address"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter full address"
                        className={inputClasses}
                      />
                    </Field>
                  </div>
                </div>

                {/* ============ SECURITY DETAILS ============ */}

                <div className="border-t border-[#EDEFE7] pt-8 dark:border-[#262B24] lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0">
                  <SectionHeading icon={<FiLock />} title="Security Details" />

                  <div className="space-y-3.5">
                    <Field
                      label="Password"
                      name="password"
                      icon={<FiLock />}
                      error={errors.password}
                      hint="At least 8 characters"
                      trailing={
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={
                            showPassword ? "Hide password" : "Show password"
                          }
                          className="px-3.5 text-[#6B7280] transition-colors hover:text-[#22B368] dark:text-[#9FB0A3] dark:hover:text-[#59C97A]"
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
                        placeholder="Create password"
                        className={inputClasses}
                      />
                    </Field>

                    <Field
                      label="Confirm password"
                      name="confirmPassword"
                      icon={<FiLock />}
                      error={errors.confirmPassword}
                      hint="Re-enter your password"
                      trailing={
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          aria-label={
                            showConfirmPassword
                              ? "Hide password"
                              : "Show password"
                          }
                          className="px-3.5 text-[#6B7280] transition-colors hover:text-[#22B368] dark:text-[#9FB0A3] dark:hover:text-[#59C97A]"
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

                    {/* Reassurance panel */}

                    <div className="!mt-5 flex items-start gap-3 rounded-xl bg-[#F2FBF5] px-4 py-4 dark:bg-[#132118]">
                      <span className="mt-0.5 shrink-0 text-lg text-[#22B368] dark:text-[#59C97A]">
                        <FiShield />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-[#22B368] dark:text-[#59C97A]">
                          Your security is important to us.
                        </p>
                        <p className="mt-1 text-[13px] leading-5 text-[#5B6B5F] dark:text-[#9FB0A3]">
                          Please choose a strong password to keep your account
                          safe.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ============ SUBMIT ============ */}

              <div className="mt-8 border-t border-[#EDEFE7] pt-6 dark:border-[#262B24]">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#22B368] py-3.5 font-semibold text-white shadow-lg shadow-[#22B368]/25 transition-all duration-300 hover:bg-[#1C9457] hover:shadow-xl disabled:bg-[#22B368]/50 dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] dark:disabled:bg-[#43B75A]/50"
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
                      Creating account...
                    </>
                  ) : (
                    <>
                      <FiUserPlus size={18} />
                      Create Account
                    </>
                  )}
                </button>

                <p className="mt-4 text-center text-sm text-[#5B6B5F] dark:text-[#9FB0A3]">
                  Already have an account?{" "}
                  <Link
                    to="/login"
                    className="font-bold text-[#22B368] transition-colors hover:text-[#178F4A] dark:text-[#59C97A] dark:hover:text-[#7BDB98]"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </form>
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

export default Register;