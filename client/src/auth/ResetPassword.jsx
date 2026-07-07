import React, { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import authService from "./authService";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiEye,
  FiEyeOff,
  FiLock,
  FiShield,
  FiClock,
  FiUsers,
} from "react-icons/fi";

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

  // ===========================
  // LEFT FEATURES
  // ===========================

  const features = [
    {
      icon: <FiShield className="text-blue-600 text-xl" />,
      title: "Strong Password Security",
      description:
        "Protect your Restaurant ERP account with a secure password.",
    },
    {
      icon: <FiClock className="text-blue-600 text-xl" />,
      title: "Quick Password Reset",
      description: "Update your password and continue working immediately.",
    },
    {
      icon: <FiUsers className="text-blue-600 text-xl" />,
      title: "Role Based Protection",
      description:
        "Owner, Manager, Cashier and Kitchen Staff accounts stay protected.",
    },
  ];

  // ===========================
  // PASSWORD STRENGTH
  // ===========================

  const passwordStrength = useMemo(() => {
    const password = formData.password;

    let score = 0;

    if (password.length >= 8) score++;

    if (/[A-Z]/.test(password)) score++;

    if (/[a-z]/.test(password)) score++;

    if (/[0-9]/.test(password)) score++;

    if (/[^A-Za-z0-9]/.test(password)) score++;

    return score;
  }, [formData.password]);

  const strengthColor = () => {
    if (passwordStrength <= 2) return "bg-red-500";

    if (passwordStrength === 3) return "bg-yellow-500";

    if (passwordStrength === 4) return "bg-blue-500";

    return "bg-green-600";
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
  // VALIDATION
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

    if (formData.password.length < 8) {
      newErrors.password = "Password must contain at least 8 characters";
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
  // SUBMIT
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex">
      {/* LEFT PANEL */}

      <div className="hidden lg:flex w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700" />

        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-20 text-white">
          <div className="flex items-center gap-4 mb-14">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl">
              🍽️
            </div>

            <div>
              <h1 className="text-4xl font-bold">Restaurant ERP</h1>

              <p className="text-blue-100 mt-2">Secure Password Reset</p>
            </div>
          </div>

          <h2 className="text-5xl font-bold leading-tight">
            Create a new password
          </h2>

          <p className="mt-6 text-blue-100 text-lg leading-8">
            Your new password should be unique, secure and difficult to guess.
          </p>

          <div className="mt-16 space-y-8">
            {features.map((item, index) => (
              <div key={index} className="flex gap-5 items-start">
                <div className="bg-white rounded-xl p-3 text-blue-600">
                  {item.icon}
                </div>

                <div>
                  <h3 className="text-xl font-semibold">{item.title}</h3>

                  <p className="text-blue-100 mt-2">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* ================= RIGHT PANEL ================= */}

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 p-8">
            {!success ? (
              <>
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-4xl shadow-xl">
                    <FiLock />
                  </div>

                  <h2 className="mt-6 text-3xl font-bold text-gray-800">
                    Reset Password
                  </h2>

                  <p className="mt-2 text-gray-500 leading-7">
                    Create a strong password to secure your account.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="mt-10 space-y-6">
                  {errors.form && (
                    <div className="rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3">
                      {errors.form}
                    </div>
                  )}

                  {/* New Password */}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      New Password
                    </label>

                    <div className="relative">
                      <FiLock className="absolute left-4 top-4 text-gray-400" />

                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter new password"
                        className={`w-full pl-12 pr-12 py-3 rounded-xl border outline-none transition ${
                          errors.password
                            ? "border-red-500"
                            : "border-gray-300 focus:border-blue-600"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-4 text-gray-500"
                      >
                        {showPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>

                    {errors.password && (
                      <p className="text-red-500 text-sm mt-2">
                        {errors.password}
                      </p>
                    )}
                  </div>

                  {/* Password Strength */}

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">
                        Password Strength
                      </span>

                      <span className="text-sm font-semibold text-gray-700">
                        {strengthText()}
                      </span>
                    </div>

                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${strengthColor()} transition-all duration-300`}
                        style={{
                          width: `${passwordStrength * 20}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Confirm Password */}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Confirm Password
                    </label>

                    <div className="relative">
                      <FiLock className="absolute left-4 top-4 text-gray-400" />

                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm password"
                        className={`w-full pl-12 pr-12 py-3 rounded-xl border outline-none transition ${
                          errors.confirmPassword
                            ? "border-red-500"
                            : "border-gray-300 focus:border-blue-600"
                        }`}
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-4 top-4 text-gray-500"
                      >
                        {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                      </button>
                    </div>

                    {errors.confirmPassword && (
                      <p className="text-red-500 text-sm mt-2">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Password Requirements */}

                  <div className="rounded-2xl bg-blue-50 border border-blue-100 p-5">
                    <h4 className="font-semibold text-gray-700 mb-3">
                      Password Requirements
                    </h4>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <FiCheckCircle
                          className={
                            formData.password.length >= 8
                              ? "text-green-600"
                              : "text-gray-400"
                          }
                        />
                        Minimum 8 characters
                      </div>

                      <div className="flex items-center gap-2">
                        <FiCheckCircle
                          className={
                            /[A-Z]/.test(formData.password)
                              ? "text-green-600"
                              : "text-gray-400"
                          }
                        />
                        One uppercase letter
                      </div>

                      <div className="flex items-center gap-2">
                        <FiCheckCircle
                          className={
                            /[0-9]/.test(formData.password)
                              ? "text-green-600"
                              : "text-gray-400"
                          }
                        />
                        One number
                      </div>

                      <div className="flex items-center gap-2">
                        <FiCheckCircle
                          className={
                            /[^A-Za-z0-9]/.test(formData.password)
                              ? "text-green-600"
                              : "text-gray-400"
                          }
                        />
                        One special character
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold transition-all duration-300 flex justify-center items-center gap-3 shadow-lg"
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
                        Updating Password...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </button>
                </form>
              </>
            ) : (
              <>
                <div className="text-center">
                  <div className="mx-auto w-24 h-24 rounded-full bg-green-100 flex items-center justify-center shadow-lg">
                    <FiCheckCircle className="text-green-600 text-6xl" />
                  </div>

                  <h2 className="mt-8 text-3xl font-bold text-gray-800">
                    Password Updated
                  </h2>

                  <p className="mt-4 text-gray-500 leading-7">
                    Your password has been successfully updated.
                    <br />
                    You can now login using your new password.
                  </p>
                </div>

                <div className="mt-10">
                  <Link
                    to="/login"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold flex justify-center items-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    <FiArrowLeft />
                    Back to Login
                  </Link>
                </div>
              </>
            )}

            {/* Footer */}

            <div className="mt-10 border-t border-gray-200 pt-6">
              <div className="flex justify-center items-center gap-2 text-green-600 text-sm">
                <FiShield />
                Secure Password Protection
              </div>

              <div className="mt-6 rounded-2xl bg-blue-50 border border-blue-100 p-5">
                <h4 className="font-semibold text-gray-700 mb-3">
                  Password Security Tips
                </h4>

                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <FiCheckCircle className="text-green-600 mt-0.5" />
                    Never share your password with anyone.
                  </li>

                  <li className="flex items-start gap-2">
                    <FiCheckCircle className="text-green-600 mt-0.5" />
                    Use a unique password for your restaurant account.
                  </li>

                  <li className="flex items-start gap-2">
                    <FiCheckCircle className="text-green-600 mt-0.5" />
                    Change your password periodically for better security.
                  </li>
                </ul>
              </div>

              <div className="text-center mt-8">
                <p className="text-gray-500 text-sm">
                  Restaurant ERP Management System
                </p>

                <p className="text-gray-400 text-xs mt-2">
                  © {new Date().getFullYear()} All Rights Reserved.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
