// client/src/expenses/ExpenseUI.jsx
import React from "react";
import { ui } from "./expenseTheme";

export const ErrorBanner = ({ children }) => <div className={ui.errorBanner}>{children}</div>;

export const Badge = ({ styles, label }) => (
  <span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${styles}`}>{label}</span>
);

export const EmptyState = ({ icon, title, subtitle }) => (
  <div className={`${ui.card} p-16 text-center`}>
    <div className={`mx-auto text-4xl ${ui.faint} mb-4`}>{icon}</div>
    <p className={`font-medium ${ui.heading}`}>{title}</p>
    {subtitle && <p className={`text-sm mt-1 ${ui.faint}`}>{subtitle}</p>}
  </div>
);

export const SkeletonGrid = ({ count = 6, className = "h-28" }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`${className} rounded-2xl bg-[#F3F5EE] dark:bg-[#1E241C] animate-pulse`} />
    ))}
  </div>
);

export const SkeletonRows = ({ count = 5, className = "h-16" }) => (
  <div className={`${ui.card} p-6 space-y-3`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`${className} rounded-xl bg-[#F3F5EE] dark:bg-[#1E241C] animate-pulse`} />
    ))}
  </div>
);
