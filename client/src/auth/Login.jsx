// src/auth/Login.jsx
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  FiEye,
  FiEyeOff,
  FiMail,
  FiLock,
  FiArrowRight,
  FiShield,
  FiClock,
  FiUsers,
  FiCheckCircle,
  FiSun,
  FiMoon,
} from "react-icons/fi";

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

  const navigate = useNavigate();

  const { login } = useAuth();

  const { theme, toggleTheme } = useTheme();

  // ==========================
  // FEATURES LIST
  // ==========================

  const features = [
    {
      icon: <FiShield className="text-[#3FA34D] text-xl" />,
      title: "Secure Role Based Access",
      description: "Owner, Manager, Cashier and Kitchen Staff authentication.",
    },
    {
      icon: <FiClock className="text-[#3FA34D] text-xl" />,
      title: "Real-Time Operations",
      description: "Manage restaurant operations from a centralized dashboard.",
    },
    {
      icon: <FiUsers className="text-[#3FA34D] text-xl" />,
      title: "Staff Management",
      description: "Control access and monitor restaurant staff efficiently.",
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

    const result = await login(formData.email, formData.password);

    setLoading(false);

    if (!result.success) {
      setErrors({
        email: result.message,
      });

      return;
    }

    navigate("/dashboard", {
      replace: true,
    });
  };
  // ==========================
  // UI
  // ==========================

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#F3F5EE] via-white to-[#EFF2E9] dark:from-[#0D110C] dark:via-[#10140F] dark:to-[#0D110C] flex relative transition-colors">
      {/* ============ THEME TOGGLE (TOP RIGHT) ============ */}

      <button
        onClick={toggleTheme}
        aria-label="Toggle light / dark theme"
        title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="absolute top-6 right-6 z-20 w-11 h-11 rounded-full border border-[#E7EAE1] dark:border-[#262B24] bg-white dark:bg-[#171C17] shadow-sm flex items-center justify-center hover:border-[#3FA34D]/40 dark:hover:border-[#43B75A]/40 transition-colors"
      >
        {theme === "dark" ? (
          <FiSun size={18} className="text-[#FFA94D]" />
        ) : (
          <FiMoon size={18} className="text-[#3FA34D]" />
        )}
      </button>

      {/* ================= LEFT SIDE ================= */}

      <div className="hidden lg:flex w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#2B7A38] via-[#3FA34D] to-[#1F3A22] dark:from-[#1B3A22] dark:via-[#215C2C] dark:to-[#0D1A0F]" />

        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-[#FFA94D]/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-20 text-white w-full">
          <div className="mb-16">
            <img
              src="/Logo/LogoRest.png"
              alt="Restaurant ERP"
              className="w-full max-w-[350px] object-contain"
            />
          </div>

          <h2 className="text-5xl font-extrabold leading-tight mb-6">
            Manage your restaurant
            <br />
            smarter than ever.
          </h2>

          <p className="text-white/80 text-lg leading-8 max-w-xl">
            A complete solution to manage POS, Inventory, Billing, Kitchen,
            Employees, CRM, Reports, Profit & Loss and everything your
            restaurant needs from one powerful dashboard.
          </p>

          <div className="mt-16 space-y-8">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-5 items-start">
                <div className="bg-white rounded-xl p-3 shadow-xl">
                  {feature.icon}
                </div>

                <div>
                  <h3 className="font-semibold text-xl">{feature.title}</h3>

                  <p className="text-white/80 mt-2">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= RIGHT SIDE ================= */}

      <div className="flex-1 flex justify-center items-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white/80 dark:bg-[#171C17]/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-[#E7EAE1] dark:border-[#262B24] p-8 transition-colors">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-[#3FA34D] dark:bg-[#43B75A] flex items-center justify-center shadow-xl overflow-hidden">
                <p className="text-white text-3xl">🍽️</p>
              </div>

              <h2 className="mt-6 text-3xl font-bold text-[#1F2937] dark:text-white">
                Welcome Back
              </h2>

              <p className="mt-2 text-[#6B7280] dark:text-[#9CA8A0]">Sign in to continue</p>
            </div>

            <form onSubmit={handleLogin} className="mt-10 space-y-6">
              {/* Email */}

              <div>
                <label className="block text-sm font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-2">
                  Email
                </label>

                <div className="relative">
                  <FiMail className="absolute left-4 top-4 text-[#9CA3AF] dark:text-[#6B7280] text-lg" />

                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email"
                    className={`w-full pl-12 pr-4 py-3 rounded-xl border bg-white dark:bg-[#1D231D] text-[#1F2937] dark:text-white outline-none transition-all ${
                      errors.email
                        ? "border-[#EF5350]"
                        : "border-[#E7EAE1] dark:border-[#262B24] focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
                    }`}
                  />
                </div>

                {errors.email && (
                  <p className="text-[#EF5350] text-sm mt-2">{errors.email}</p>
                )}
              </div>

              {/* Password */}

              <div>
                <label className="block text-sm font-semibold text-[#1F2937] dark:text-[#E5E7EB] mb-2">
                  Password
                </label>

                <div className="relative">
                  <FiLock className="absolute left-4 top-4 text-[#9CA3AF] dark:text-[#6B7280] text-lg" />

                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className={`w-full pl-12 pr-14 py-3 rounded-xl border bg-white dark:bg-[#1D231D] text-[#1F2937] dark:text-white outline-none transition-all ${
                      errors.password
                        ? "border-[#EF5350]"
                        : "border-[#E7EAE1] dark:border-[#262B24] focus:border-[#3FA34D] dark:focus:border-[#43B75A]"
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-4 text-[#6B7280] dark:text-[#9CA8A0]"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>

                {errors.password && (
                  <p className="text-[#EF5350] text-sm mt-2">{errors.password}</p>
                )}
              </div>
              {/* Remember Me & Forgot Password */}

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-[#6B7280] dark:text-[#9CA8A0] cursor-pointer">
                  <input
                    type="checkbox"
                    name="remember"
                    checked={formData.remember}
                    onChange={handleChange}
                    className="w-4 h-4 accent-[#3FA34D] dark:accent-[#43B75A]"
                  />
                  Remember Me
                </label>

                <Link
                  to="/forgot-password"
                  className="text-sm font-medium text-[#3FA34D] dark:text-[#43B75A] hover:text-[#358F42] dark:hover:text-[#4DC968] transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>

              {/* Login Button */}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#3FA34D] hover:bg-[#358F42] disabled:bg-[#3FA34D]/50 dark:bg-[#43B75A] dark:hover:bg-[#3AA34E] dark:disabled:bg-[#43B75A]/50 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl"
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
                    Signing In...
                  </>
                ) : (
                  <>
                    Login
                    <FiArrowRight />
                  </>
                )}
              </button>
            </form>

            {/* Footer */}

            <div className="mt-10 border-t border-[#E7EAE1] dark:border-[#262B24] pt-6">
              <div className="flex items-center justify-center gap-2 text-[#3FA34D] dark:text-[#43B75A] text-sm">
                <FiCheckCircle />
                Secure Login
              </div>

              <p className="text-center text-[#6B7280] dark:text-[#9CA8A0] text-sm mt-4 leading-6">
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