import React, { useState } from "react";
import { Link } from "react-router-dom";
import authService from "./authService";
import {
  FiArrowLeft,
  FiMail,
  FiSend,
  FiCheckCircle,
  FiShield,
  FiClock,
  FiUsers,
} from "react-icons/fi";

const ForgotPassword = () => {
  // ==========================
  // STATES
  // ==========================

  const [email, setEmail] = useState("");

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState(false);

  const [error, setError] = useState("");

  // ==========================
  // FEATURES
  // ==========================

  const features = [
    {
      icon: <FiShield className="text-blue-600 text-xl" />,
      title: "Secure Password Recovery",
      description:
        "Reset your password securely using your registered email address.",
    },
    {
      icon: <FiClock className="text-blue-600 text-xl" />,
      title: "Quick Verification",
      description:
        "Receive reset instructions instantly once backend integration is enabled.",
    },
    {
      icon: <FiUsers className="text-blue-600 text-xl" />,
      title: "Role Based Access",
      description:
        "Supports Owner, Manager, Cashier and Kitchen Staff accounts.",
    },
  ];

  // ==========================
  // SUBMIT
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 flex">
      {/* ================= LEFT SECTION ================= */}

      <div className="hidden lg:flex w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700" />

        <div className="absolute -top-24 -left-24 w-80 h-80 rounded-full bg-white/10 blur-3xl" />

        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-20 text-white">
          <div className="flex items-center gap-4 mb-14">
            <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl shadow-xl">
              🍽️
            </div>

            <div>
              <h1 className="text-4xl font-bold">Restaurant ERP</h1>

              <p className="text-blue-100 mt-2">Password Recovery Portal</p>
            </div>
          </div>

          <h2 className="text-5xl font-bold leading-tight">
            Forgot your password?
          </h2>

          <p className="mt-6 text-blue-100 text-lg leading-8 max-w-xl">
            No worries. Enter your registered email address and we'll help you
            securely recover access to your Restaurant ERP account.
          </p>

          <div className="mt-16 space-y-8">
            {features.map((item, index) => (
              <div key={index} className="flex items-start gap-5">
                <div className="bg-white rounded-xl p-3 text-blue-600 shadow-lg">
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
      {/* ================= RIGHT SECTION ================= */}

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 p-8">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-4xl text-white shadow-xl">
                <FiMail />
              </div>

              <h2 className="mt-6 text-3xl font-bold text-gray-800">
                Forgot Password
              </h2>

              <p className="mt-2 text-gray-500 leading-6">
                Enter your registered email address to receive password reset
                instructions.
              </p>
            </div>

            {!success ? (
              <form onSubmit={handleSubmit} className="mt-10 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Email Address
                  </label>

                  <div className="relative">
                    <FiMail className="absolute left-4 top-4 text-gray-400 text-lg" />

                    <input
                      type="email"
                      placeholder="Enter your registered email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      className={`w-full pl-12 pr-4 py-3 rounded-xl border outline-none transition-all bg-white ${
                        error
                          ? "border-red-500"
                          : "border-gray-300 focus:border-blue-600"
                      }`}
                    />
                  </div>

                  {error && (
                    <p className="text-red-500 text-sm mt-2">{error}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl"
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
                      Sending Reset Link...
                    </>
                  ) : (
                    <>
                      Send Reset Link
                      <FiSend />
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="mt-10 text-center">
                <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
                  <FiCheckCircle className="text-green-600 text-5xl" />
                </div>

                <h3 className="mt-6 text-2xl font-bold text-gray-800">
                  Email Sent Successfully
                </h3>

                <p className="mt-3 text-gray-500 leading-7">
                  If an account exists with this email address, you'll receive
                  password reset instructions shortly.
                </p>
              </div>
            )}
            {/* ================= FOOTER ================= */}

            <div className="mt-10 border-t border-gray-200 pt-6">
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                <FiArrowLeft />
                Back to Login
              </Link>

              <div className="mt-8 rounded-2xl bg-blue-50 border border-blue-100 p-5">
                <h4 className="text-sm font-semibold text-gray-800 mb-3">
                  Security Tips
                </h4>

                <ul className="space-y-3 text-sm text-gray-600">
                  <li className="flex items-start gap-3">
                    <FiCheckCircle className="text-green-600 mt-0.5" />
                    Use your registered email address to reset your password.
                  </li>

                  <li className="flex items-start gap-3">
                    <FiCheckCircle className="text-green-600 mt-0.5" />
                    Never share your password with anyone.
                  </li>

                  <li className="flex items-start gap-3">
                    <FiCheckCircle className="text-green-600 mt-0.5" />
                    Change your password regularly to keep your account secure.
                  </li>
                </ul>
              </div>

              <div className="mt-8 text-center">
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

export default ForgotPassword;
