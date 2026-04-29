// =============================================================================
// TOKYO GHOUL RESONANCE: ダッシュボード
// タブ: 稼働ログ | トータル数値分析
// =============================================================================

import { DashboardShell } from "./DashboardShell";

export default function DashboardPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f3f4f6" }}>

      {/* ===== ヘッダー（背景画像） ===== */}
      <header
        className="sticky top-0 z-40 border-b-2 border-gray-600 safe-area-top shadow-md"
        style={{
          backgroundImage: "url('/images/top_head.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-end justify-start">
          <span className="font-mono text-white/80 text-[9px] tracking-wider pb-1">v4.98</span>
        </div>
      </header>

      {/* ===== メインコンテンツ ===== */}
      <main className="max-w-2xl w-full mx-auto">
        <DashboardShell />
      </main>
    </div>
  );
}
