import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                // Base theme colors
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",

                // Status colors from specification
                status: {
                    stable: "#00A3FF",
                    fresh: "#00FF94",
                    warning: "#FFD600",
                    down: "#FF4842",
                },
            },
            animation: {
                breathing: "breathing 3s ease-in-out infinite",
                pulse: "pulse 1.5s ease-in-out infinite",
                jitter: "jitter 0.3s ease-in-out infinite",
            },
            keyframes: {
                breathing: {
                    "0%, 100%": { opacity: "0.7" },
                    "50%": { opacity: "1" },
                },
                pulse: {
                    "0%, 100%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.1)" },
                },
                jitter: {
                    "0%, 100%": { transform: "translate(0, 0)" },
                    "25%": { transform: "translate(-2px, 2px)" },
                    "75%": { transform: "translate(2px, -2px)" },
                },
            },
            backdropBlur: {
                xs: "2px",
            },
        },
    },
    plugins: [],
};

export default config;
