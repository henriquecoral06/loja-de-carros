import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: { DEFAULT: "hsl(var(--primary))", foreground: "hsl(var(--primary-foreground))" },
        secondary: { DEFAULT: "hsl(var(--secondary))", foreground: "hsl(var(--secondary-foreground))" },
        muted: { DEFAULT: "hsl(var(--muted))", foreground: "hsl(var(--muted-foreground))" },
        accent: { DEFAULT: "hsl(var(--accent))", foreground: "hsl(var(--accent-foreground))" },
        destructive: { DEFAULT: "hsl(var(--destructive))", foreground: "hsl(var(--destructive-foreground))" },
        card: { DEFAULT: "hsl(var(--card))", foreground: "hsl(var(--card-foreground))" },
        whatsapp: "hsl(var(--whatsapp))",

        // Design system do portal (Conversão Extrema). Canais RGB para
        // permitir opacidade nos utilitários: bg-ink/5, border-hairline.
        canvas: "rgb(var(--c-canvas) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        elevated: "rgb(var(--c-elevated) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        bodytext: "rgb(var(--c-body) / <alpha-value>)",
        mute: "rgb(var(--c-mute) / <alpha-value>)",
        faint: "rgb(var(--c-faint) / <alpha-value>)",
        hairline: "rgb(var(--c-hairline) / <alpha-value>)",
        "hairline-strong": "rgb(var(--c-hairline-strong) / <alpha-value>)",
        inverse: "rgb(var(--c-inverse) / <alpha-value>)",
        "on-inverse": "rgb(var(--c-on-inverse) / <alpha-value>)",
        "emerald-soft": "rgb(var(--c-emerald-soft) / <alpha-value>)",
        "emerald-deep": "rgb(var(--c-emerald-deep) / <alpha-value>)",
        "success-soft": "rgb(var(--c-success-soft) / <alpha-value>)",
        "success-deep": "rgb(var(--c-success-deep) / <alpha-value>)",
        "warning-soft": "rgb(var(--c-warning-soft) / <alpha-value>)",
        "warning-deep": "rgb(var(--c-warning-deep) / <alpha-value>)",
        "danger-soft": "rgb(var(--c-danger-soft) / <alpha-value>)",
        "danger-deep": "rgb(var(--c-danger-deep) / <alpha-value>)",
        "info-soft": "rgb(var(--c-info-soft) / <alpha-value>)",
        "info-deep": "rgb(var(--c-info-deep) / <alpha-value>)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        // Portal: Geist. O site público segue a fonte da revenda.
        geist: ["Geist", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
