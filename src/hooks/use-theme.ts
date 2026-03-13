"use client";

import { useState, useEffect } from "react";

export type Theme = "dark" | "light";

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.remove("dark", "light");
  root.classList.add(theme);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    // Read persisted value (inline script in layout may have already set the class)
    const stored = localStorage.getItem("theme") as Theme | null;
    const resolved: Theme = stored === "light" || stored === "dark" ? stored : "dark";
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      localStorage.setItem("theme", next);
      applyTheme(next);
      return next;
    });
  };

  return { theme, toggleTheme };
}
