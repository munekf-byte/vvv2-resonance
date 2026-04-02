// =============================================================================
// TOKYO GHOUL RESONANCE: ダッシュボード
// =============================================================================

import { DashboardClient } from "./DashboardClient";

export default function DashboardPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f3f4f6" }}>

      {/* ===== ヘッダー ===== */}
      <header
        className="sticky top-0 z-40 border-b-2 border-gray-600 safe-area-top shadow-md"
        style={{ backgroundColor: "#1f2937" }}
      >
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-black text-red-400 text-lg tracking-wider">TGR</span>
            <div className="flex flex-col leading-none">
              <span className="font-mono text-gray-400 text-xs tracking-widest">RESONANCE</span>
              <span className="font-mono text-gray-600 text-[9px] tracking-wider">v1.1</span>
            </div>
          </div>
          <span className="text-gray-400 text-xs font-mono">稼働管理</span>
        </div>
      </header>

      {/* ===== メインコンテンツ ===== */}
      <main className="max-w-2xl w-full mx-auto px-4 py-6">
        <div className="mb-5">
          <h1 className="text-lg font-mono font-bold text-gray-900">稼働セッション</h1>
          <p className="text-gray-500 text-xs font-mono mt-0.5">SESSION LIST · データはこの端末に保存されます</p>
        </div>
        <DashboardClient />
      </main>
    </div>
  );
}
