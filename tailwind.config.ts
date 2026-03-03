import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        shell: "var(--shell)",
        ember: "var(--ember)",
        glow: "var(--glow)",
        haze: "var(--haze)",
        ink: "var(--ink)"
      },
      boxShadow: {
        halo: "0 20px 45px -25px rgba(219, 92, 81, 0.55)"
      },
      keyframes: {
        drift: {
          "0%, 100%": { transform: "translate3d(0, 0, 0)" },
          "50%": { transform: "translate3d(0, -24px, 0)" }
        },
        rise: {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        drift: "drift 8s ease-in-out infinite",
        rise: "rise 0.65s ease forwards"
      }
    }
  },
  plugins: []
};

export default config;
