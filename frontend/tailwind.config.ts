import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        lidex: {
          bg: "#0b0f1a",
          panel: "rgba(255,255,255,0.04)",
          border: "rgba(255,255,255,0.1)",
          green: "#00c896",
          blue: "#2979ff",
          muted: "rgba(255,255,255,0.65)"
        }
      },
      boxShadow: {
        card: "0 4px 24px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};

export default config;
