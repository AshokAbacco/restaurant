// ==============================================
// src/context/ThemeContext.jsx
// ==============================================
//
// Wrap your app root with <ThemeProvider> (e.g. in main.jsx / App.jsx),
// and add `darkMode: 'class'` to tailwind.config.js so the `dark:`
// variants used throughout the components actually take effect.
//
// tailwind.config.js
// -------------------
// module.exports = {
//   darkMode: 'class',
//   ...
// }

import React, { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

const STORAGE_KEY = "erp-theme";

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") return "light";

    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored === "light" || stored === "dark") return stored;

    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  // ==========================================
  // SYNC <html> CLASS + LOCAL STORAGE
  // ==========================================

  useEffect(() => {
    const root = window.document.documentElement;

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);

  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }

  return ctx;
};

export default ThemeContext;