// =============================================================================
// 親コンポーネントへの組み込みサンプル
// 真打吉宗プロジェクトの「プレイ画面」相当に下記パターンを適用してください
// =============================================================================

"use client";

import { useState } from "react";
import type { ShushiData } from "@/types";
// Step 1 中: V2 サフィックス版を import
// Step 2 移行後: ShushiEditDashboard に戻す
import { ShushiEditDashboardV2 as ShushiEditDashboard } from "@/components/yoshimune/ShushiEditDashboardV2";

interface Props {
  session: {
    id: string;
    shushi: ShushiData | null;
    // ... 機種固有フィールド ...
  };
  onUpdateShushi: (data: ShushiData) => void; // Zustand action 等
}

export function PlayClientPageExample({ session, onUpdateShushi }: Props) {
  const [shushiOpen, setShushiOpen] = useState(false);

  return (
    <div className="min-h-screen">

      {/* ===== メインコンテンツ（既存） ===== */}
      <main>
        {/* ... 既存の通常時タブ・集計タブ等 ... */}
      </main>

      {/* ===== FAB: 収支入力起動ボタン（緑のピル型） ===== */}
      <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center px-4 max-w-2xl mx-auto">
        <button
          onClick={() => setShushiOpen(true)}
          className="flex items-center gap-1 font-mono font-bold text-[13px] px-5 py-3.5 rounded-full active:scale-95 transition-transform"
          style={{
            backgroundColor: "#059669",
            color: "#fff",
            boxShadow: "0 0 0 2px #ffffff, 0 0 14px rgba(5,150,105,0.65), 0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          収支入力
        </button>
      </div>

      {/* ===== 収支入力ダッシュボード（フルスクリーンモーダル） ===== */}
      {shushiOpen && (
        <ShushiEditDashboard
          data={session.shushi}
          onSave={(data) => {
            onUpdateShushi(data);
            setShushiOpen(false);
          }}
          onClose={() => setShushiOpen(false)}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Zustand store の update アクション例
// -----------------------------------------------------------------------------
//
// updateSessionShushi: (data: ShushiData) => set((state) => {
//   if (!state.session) return state;
//   return {
//     session: {
//       ...state.session,
//       shushi: data,
//       updatedAt: new Date().toISOString(),
//     },
//   };
// }),
//
// → 親側で localStorage 即時保存 + 500ms デバウンスで Supabase 書き込みを行う
//    既存パターンに乗せる。
//
// -----------------------------------------------------------------------------
// 集計画面側で totalGames を参照する例（Step 2 で適用）
// -----------------------------------------------------------------------------
//
// const rawTotalG = shushi?.totalGames ?? 0;
// const uchidashiG = uchidashi?.totalGames ?? 0;
// const realPlayG = rawTotalG > 0 ? rawTotalG - uchidashiG : blocks内合計;
//
// → 集計画面に重複した入力欄を置かないこと。
//    収支入力を「真実の単一ソース」にする。
