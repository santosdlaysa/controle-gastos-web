import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: "#0a7ea4",
        background: "#0f1117",
        surface: "#1a1d26",
        "surface-2": "#22263a",
        border: "#2e3249",
        foreground: "#e8eaf0",
        muted: "#8b90a7",
        error: "#ef4444",
        success: "#10b981",
      },
    },
  },
  plugins: [],
};

export default config;
