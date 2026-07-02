import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:        "#0a0e1a",
        "bg-2":    "#0d1320",
        card:      "#131a2c",
        "card-2":  "#1a2238",
        "card-h":  "#1e2740",
        line:      "#243049",
        ink:       "#e6ecf5",
        "ink-dim": "#a4b1c6",
        muted:     "#6b7894",
        accent:    "#60a5fa",
        pos:       "#4ade80",
        neg:       "#f87171",
        warn:      "#fbbf24",
        pink:      "#f472b6",
        teal:      "#2dd4bf",
        purple:    "#a78bfa",
      },
      boxShadow: {
        card: "0 4px 20px rgba(0,0,0,.4), 0 1px 3px rgba(0,0,0,.3)",
      },
    },
  },
  plugins: [],
};
export default config;
