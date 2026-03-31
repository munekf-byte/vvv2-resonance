import type { Config } from "tailwindcss";

const config: Config = {
  // ライトモード固定 (darkMode 無効)
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===== TOKYO GHOUL RESONANCE デザインシステム =====
        // 白・ライトグレー: ベース背景 (クラス名は互換性のため v2-* を維持)
        "v2-black": {
          DEFAULT: "#FFFFFF",
          50:      "#F9FAFB",
          100:     "#F3F4F6",
          200:     "#E5E7EB",
          300:     "#D1D5DB",
        },
        // 深紅: 喰種・アクセント
        "v2-red": {
          DEFAULT: "#B91C1C",
          50:      "#EF4444",
          100:     "#DC2626",
          200:     "#B91C1C",
          300:     "#991B1B",
          400:     "#7F1D1D",
          500:     "#6B1212",
          muted:   "#FEE2E2",
          bg:      "#FFF5F5",
        },
        // チャコール: サブアクセント
        "v2-purple": {
          DEFAULT: "#374151",
          50:      "#6B7280",
          100:     "#4B5563",
          200:     "#374151",
          300:     "#1F2937",
          400:     "#111827",
          500:     "#030712",
          muted:   "#F3F4F6",
          bg:      "#F9FAFB",
        },
        // 補助カラー
        "v2-cyan":   { DEFAULT: "#0891B2", muted: "#E0F2FE" },
        "v2-gold":   { DEFAULT: "#D97706", muted: "#FEF3C7" },
        "v2-green":  { DEFAULT: "#059669", muted: "#D1FAE5" },
        // テキスト
        "v2-text": {
          primary:   "#111827",
          secondary: "#6B7280",
          muted:     "#9CA3AF",
        },
        // ボーダー
        "v2-border": {
          DEFAULT: "#E5E7EB",
          accent:  "#FECACA",
        },
      },
      fontFamily: {
        mono: ["'Roboto Mono'", "'JetBrains Mono'", "monospace"],
        sans: ["'Noto Sans JP'", "'Inter'", "sans-serif"],
      },
      backgroundImage: {
        "v2-gradient": "linear-gradient(135deg, #FFFFFF 0%, #FFF5F5 50%, #FFFFFF 100%)",
        "v2-card":     "linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)",
      },
      animation: {
        "pulse-red":   "pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-purple": "glow-purple 2s ease-in-out infinite alternate",
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(185,28,28,0)" },
          "50%":       { boxShadow: "0 0 12px 4px rgba(185,28,28,0.2)" },
        },
        "glow-purple": {
          from: { boxShadow: "0 0 4px rgba(55,65,81,0.15)" },
          to:   { boxShadow: "0 0 16px rgba(55,65,81,0.35)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
