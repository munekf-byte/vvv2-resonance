"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: ダッシュボード シェル
// タブ: 稼働ログ | トータル数値分析
// =============================================================================

import { useState } from "react";
import { DashboardClient } from "./DashboardClient";
import { TotalAnalysis } from "./TotalAnalysis";

export function DashboardShell() {
  const [tab, setTab] = useState<"log" | "total">("log");

  return (
    <div>
      {/* タブバー */}
      <div className="flex border-b-2 border-gray-300" style={{ backgroundColor: "#1f2937" }}>
        <button
          onClick={() => setTab("log")}
          className="flex-1 py-2.5 text-[12px] font-mono font-bold transition-colors"
          style={
            tab === "log"
              ? { color: "#f9fafb", borderBottom: "2px solid #ef4444" }
              : { color: "#6b7280", borderBottom: "2px solid transparent" }
          }
        >
          稼働ログ
        </button>
        <button
          onClick={() => setTab("total")}
          className="flex-1 py-2.5 text-[12px] font-mono font-bold transition-colors"
          style={
            tab === "total"
              ? { color: "#f9fafb", borderBottom: "2px solid #ef4444" }
              : { color: "#6b7280", borderBottom: "2px solid transparent" }
          }
        >
          トータル数値分析
        </button>
      </div>

      {/* コンテンツ */}
      <div className="px-4 py-6">
        {tab === "log" ? (
          <>
            <div className="mb-5">
              <h1 className="text-lg font-mono font-bold text-gray-900">稼働ログ</h1>
              <p className="text-gray-500 text-xs font-mono mt-0.5">SESSION LIST · データはこの端末に保存されます</p>
            </div>
            <DashboardClient />
          </>
        ) : (
          <TotalAnalysis />
        )}
      </div>
    </div>
  );
}
