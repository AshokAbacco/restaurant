// ==============================================
// src/auth/ProtectedRoute.jsx
// ==============================================

import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext";

const FullScreenLoader = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-14 h-14 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />

        <h2 className="mt-6 text-xl font-semibold text-gray-700">Loading...</h2>

        <p className="mt-2 text-gray-500">
          Please wait while we verify your session.
        </p>
      </div>
    </div>
  );
};

const Unauthorized = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-5">
      <div className="max-w-lg bg-white rounded-3xl shadow-xl p-10 text-center">
        <div className="text-7xl mb-5">🔒</div>

        <h1 className="text-3xl font-bold text-gray-800">Unauthorized</h1>

        <p className="mt-4 text-gray-500 leading-7">
          You don't have permission to access this page.
        </p>

        <button
          onClick={() => window.history.back()}
          className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl transition-all"
        >
          Go Back
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { loading, isAuthenticated, user } = useAuth();

  const location = useLocation();

  // ==========================
  // LOADING
  // ==========================

  if (loading) {
    return <FullScreenLoader />;
  }

  // ==========================
  // NOT LOGGED IN
  // ==========================

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/"
        replace
        state={{
          from: location,
        }}
      />
    );
  }

  // ==========================
  // ROLE CHECK
  // ==========================

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Unauthorized />;
  }

  // ==========================
  // SUCCESS
  // ==========================

  if (children) {
    return children;
  }

  return <Outlet />;
};

export default ProtectedRoute;
