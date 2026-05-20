import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "rgb(var(--brand-rgb, 0 135 90) / <alpha-value>)",
          dark: "rgb(var(--brand-dark-rgb, 0 96 63) / <alpha-value>)",
          light: "rgb(var(--brand-light-rgb, 39 192 138) / <alpha-value>)",
        },
        gold: "#FFC400",
      },
      fontFamily: {
        sans: ["system-ui", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
