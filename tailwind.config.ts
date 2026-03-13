import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: "#0a7ea4",
        background: "#151718",
        surface: "#1e2022",
        "surface-2": "#252829",
        border: "#334155",
        foreground: "#ECEDEE",
        muted: "#9BA1A6",
        error: "#F87171",
        success: "#4ADE80",
        warning: "#FBBF24",
      },
    },
  },
  plugins: [],
};

export default config;
