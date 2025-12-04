import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Main Background (#242424) - Use as 'bg-background'
        background: "#242424",
        
        // Main Text (rgba(255, 255, 255, 0.87)) - Use as 'text-foreground'
        foreground: "rgba(255, 255, 255, 0.87)",
        
        // Muted Text (#a0a0a0) - Use as 'text-muted'
        muted: "#a0a0a0",

        // Card Background (#2c2c2e) - Use as 'bg-card'
        card: "#2c2c2e",
        
        // Borders (#444) - Use as 'border-border'
        border: "#555555",

        // Primary Blue (#1a6aff) - Use as 'bg-primary' or 'text-primary'
        primary: {
          DEFAULT: "#1a6aff",
          hover: "#3b82f6", // Brighter blue for hover
        },

        // Secondary / Button Backgrounds (#3a3a3a)
        secondary: {
          DEFAULT: "#3a3a3a",
          hover: "#4a4a4a",
        },

        // Inputs (#333333)
        input: "#333333",

        // Status Colors
        success: "#27c77d", // Green
        error: "#ff4d4d",   // Red
        warning: "#ff9f43", // Orange
      },
      fontFamily: {
        // Match the extension's system font stack
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          '"Segoe UI"',
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
    },
  },
  plugins: [],
};
export default config;