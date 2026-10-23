import type { Config } from "tailwindcss";

export default {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        page: "var(--bg-page)",
        card: "var(--bg-card)",
        elevated: "var(--bg-elevated)",
        surface: "var(--bg-surface)",
        input: "var(--bg-input)",

        primary: "var(--text-primary)",
        secondary: "var(--text-secondary)",
        muted: "var(--text-muted)",

        brand: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        gold: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        roseGold: {
          DEFAULT: "#c5a880",
          light: "#d9c2a3",
          dark: "#a68860",
        },
        ivory: {
          DEFAULT: "#faf8f4",
          50: "#ffffff",
          100: "#fdfbf7",
          200: "#faf8f4",
          300: "#f4efe6",
        },
        charcoal: {
          DEFAULT: "#1f2937",
          light: "#374151",
          dark: "#111827",
        },
      },
      borderColor: {
        base: "var(--border-base)",
        strong: "var(--border-strong)",
        subtle: "var(--border-subtle)",
      },
      backgroundColor: {
        base: "var(--border-base)",
        strong: "var(--border-strong)",
        subtle: "var(--border-subtle)",
      },
      divideColor: {
        base: "var(--border-base)",
        strong: "var(--border-strong)",
        subtle: "var(--border-subtle)",
      },
      fontFamily: {
        sans: ["var(--font-body)", "Plus Jakarta Sans", "sans-serif"],
        body: ["var(--font-body)", "Plus Jakarta Sans", "sans-serif"],
        display: ["var(--font-display)", "Cormorant Garamond", "Georgia", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        /* Compact UI chrome */
        '2xs': ["0.625rem", { lineHeight: "0.875rem", letterSpacing: "0.06em" }],
        /* Labels, chips, meta */
        'caption': ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.02em" }],
        /* Default body bump for readability */
        'body': ["0.9375rem", { lineHeight: "1.65", letterSpacing: "0.01em" }],
        /* Nav / button copy */
        'ui': ["0.8125rem", { lineHeight: "1.25rem", letterSpacing: "0.02em" }],
        /* Card / panel titles */
        'title': ["1.0625rem", { lineHeight: "1.4", letterSpacing: "-0.015em" }],
        /* Dashboard page titles */
        'page': ["clamp(1.5rem, 1.2rem + 1.2vw, 2rem)", { lineHeight: "1.2", letterSpacing: "-0.025em" }],
        /* Marketing section titles */
        'section': ["clamp(1.75rem, 1.3rem + 1.8vw, 2.5rem)", { lineHeight: "1.15", letterSpacing: "-0.028em" }],
        /* Marketing page / hero brand */
        'display': ["clamp(2.25rem, 1.4rem + 3.5vw, 3.75rem)", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
        'hero': ["clamp(2.5rem, 1.5rem + 4vw, 4rem)", { lineHeight: "1.02", letterSpacing: "-0.035em" }],
      },
      letterSpacing: {
        'display': '-0.03em',
        'heading': '-0.025em',
        'tightest': '-0.04em',
        'label': '0.06em',
      },
      lineHeight: {
        'display': '1.05',
        'heading': '1.15',
        'body': '1.65',
        'relaxed-plus': '1.75',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fade-up 0.55s ease-out both',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
      },
    },
  },
  plugins: [],
} satisfies Config;
