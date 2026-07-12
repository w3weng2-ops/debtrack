import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        finance: {
          blue: "#2563EB",
          green: "#22C55E",
          amber: "#F59E0B",
          red: "#EF4444",
          slate: "#0F172A",
          surface: "#F8FAFC",
        },
      },
      boxShadow: {
        card: "0 14px 36px rgba(15, 23, 42, 0.08)",
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
} satisfies Config;
