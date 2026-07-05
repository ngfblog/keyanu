/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: "#0B0E14",
          raised: "#0F131B",
        },
        surface: {
          DEFAULT: "#12151C",
          hover: "#171B24",
          active: "#1C212C",
        },
        border: {
          DEFAULT: "#232833",
          subtle: "#1A1E27",
        },
        ink: {
          DEFAULT: "#E6E8EB",
          muted: "#8B949E",
          faint: "#5B6472",
        },
        brass: {
          DEFAULT: "#D4A72C",
          hover: "#E3B94A",
          muted: "#8A6D22",
          subtle: "#2B2413",
        },
        accent: {
          blue: "#58A6FF",
          teal: "#2DD4BF",
          violet: "#A78BFA",
          pink: "#F472B6",
          orange: "#FB923C",
          green: "#3FB950",
          red: "#F85149",
        },
        success: "#3FB950",
        danger: "#F85149",
        warning: "#D4A72C",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        sm: "6px",
        DEFAULT: "8px",
        md: "10px",
        lg: "14px",
        xl: "18px",
      },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.02) inset, 0 1px 2px 0 rgba(0,0,0,0.4)",
        elevated: "0 8px 24px -8px rgba(0,0,0,0.6)",
        glow: "0 0 0 1px rgba(212,167,44,0.25), 0 0 20px -4px rgba(212,167,44,0.35)",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: 0, transform: "translateY(4px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "scale-in": {
          "0%": { opacity: 0, transform: "scale(0.97)" },
          "100%": { opacity: 1, transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.18s ease-out",
        "scale-in": "scale-in 0.15s ease-out",
      },
    },
  },
  plugins: [],
};
