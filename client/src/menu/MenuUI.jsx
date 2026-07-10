// client/src/menu/MenuUI.jsx
// ==============================================
// Tiny shared building blocks so every Menu Management screen
// shows loading / empty / error states the same way.
// ==============================================
import React from "react";
import { ui } from "./menuTheme";

export const Spinner = () => (
  <div className="flex items-center justify-center py-20">
    <div className="w-10 h-10 border-4 border-[#3FA34D]/25 dark:border-[#43B75A]/25 border-t-[#3FA34D] dark:border-t-[#43B75A] rounded-full animate-spin" />
  </div>
);

export const ErrorBanner = ({ children }) => (
  <div className={ui.errorBanner}>{children}</div>
);

export const EmptyState = ({ icon = "🍽️", title, subtitle, actionLabel, onAction }) => (
  <div className="text-center py-20 px-6">
    <div className="text-5xl mb-4">{icon}</div>
    <h3 className={`text-lg font-semibold ${ui.heading}`}>{title}</h3>
    {subtitle && <p className={`${ui.muted} mt-1 mb-6 max-w-sm mx-auto`}>{subtitle}</p>}
    {actionLabel && onAction && (
      <button onClick={onAction} className={`${ui.btnPrimary} mx-auto`}>
        {actionLabel}
      </button>
    )}
  </div>
);

export const Toggle = ({ label, value, onChange, tone = "green" }) => {
  const tones = {
    green: value
      ? "bg-[#3FA34D]/10 dark:bg-[#43B75A]/15 border-[#3FA34D]/30 dark:border-[#43B75A]/40 text-[#3FA34D] dark:text-[#43B75A]"
      : "bg-[#F3F5EE] dark:bg-[#1E241C] border-[#E7EAE1] dark:border-[#262B24] text-[#6B7280] dark:text-[#9CA8A0]",
    amber: value
      ? "bg-[#FFA94D]/15 border-[#E8873A]/30 text-[#E8873A] dark:text-[#FFA94D]"
      : "bg-[#F3F5EE] dark:bg-[#1E241C] border-[#E7EAE1] dark:border-[#262B24] text-[#6B7280] dark:text-[#9CA8A0]",
    red: value
      ? "bg-[#EF5350]/10 border-[#EF5350]/30 text-[#EF5350]"
      : "bg-[#F3F5EE] dark:bg-[#1E241C] border-[#E7EAE1] dark:border-[#262B24] text-[#6B7280] dark:text-[#9CA8A0]",
  };
  const dot = { green: "bg-[#3FA34D] dark:bg-[#43B75A]", amber: "bg-[#E8873A]", red: "bg-[#EF5350]" };

  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${tones[tone]}`}
    >
      {label}
      <span className={`w-9 h-5 rounded-full relative transition-colors ${value ? dot[tone] : "bg-gray-300 dark:bg-[#3A423A]"}`}>
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            value ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
};
