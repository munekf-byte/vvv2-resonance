import type { Config } from "tailwindcss";

const config: Config = {
  // ダークモードをデフォルト強制（class ベース）
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===== VALVRAVE-RESONANCE デザインシステム =====
        // 漆黒: ベース背景
        "v2-black": {
          DEFAULT: "#0A0A0A",
          50: "#1A1A1A",
          100: "#141414",
          200: "#0F0F0F",
          300: "#0A0A0A",
        },
        // 深みのある赤: 危険・AT・差枚マイナス
        "v2-red": {
          DEFAULT: "#CC0000",
          50: "#FF4444",
          100: "#FF2222",
          200: "#EE0000",
          300: "#CC0000",
          400: "#AA0000",
          500: "#880000",
          muted: "#3D0000",
          bg: "#1A0000",
        },
        // サイバーな紫: AT・CZ・ハラキリ・アクセント
        "v2-purple": {
          DEFAULT: "#6600AA",
          50: "#CC88FF",
          100: "#AA55EE",
          200: "#8833DD",
          300: "#6600AA",
          400: "#550088",
          500: "#440066",
          muted: "#2D0044",
          bg: "#140022",
        },
        // 補助カラー
        "v2-cyan": {
          DEFAULT: "#00CCDD",
          muted: "#003344",
        },
        "v2-gold": {
          DEFAULT: "#FFAA00",
          muted: "#332200",
        },
        "v2-green": {
          DEFAULT: "#00CC66",
          muted: "#003322",
        },
        // テキスト
        "v2-text": {
          primary: "#F0F0F0",
          secondary: "#A0A0A0",
          muted: "#606060",
        },
        // ボーダー
        "v2-border": {
          DEFAULT: "#2A2A2A",
          accent: "#3A0066",
        },
      },
      fontFamily: {
        mono: ["'Roboto Mono'", "'JetBrains Mono'", "monospace"],
        sans: ["'Noto Sans JP'", "'Inter'", "sans-serif"],
      },
      backgroundImage: {
        // グラデーション: ヘッダー等
        "v2-gradient": "linear-gradient(135deg, #0A0A0A 0%, #14001E 50%, #0A0A0A 100%)",
        "v2-card": "linear-gradient(180deg, #141414 0%, #0F0F0F 100%)",
      },
      animation: {
        "pulse-red": "pulse-red 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-purple": "glow-purple 2s ease-in-out infinite alternate",
      },
      keyframes: {
        "pulse-red": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(204, 0, 0, 0)" },
          "50%": { boxShadow: "0 0 12px 4px rgba(204, 0, 0, 0.4)" },
        },
        "glow-purple": {
          from: { boxShadow: "0 0 4px rgba(102, 0, 170, 0.3)" },
          to: { boxShadow: "0 0 16px rgba(102, 0, 170, 0.7)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
