"use client";
// =============================================================================
// 収支入力ダッシュボード — パチスロアプリ横展開テンプレート
// 投資枚数・交換枚数・トータルゲーム数・最終収支を1画面で記録
// -----------------------------------------------------------------------------
// 横展開時の調整箇所:
//   1. import パス `@/types` を機種プロジェクトの ShushiData 型定義に合わせる
//   2. 保存ボタン色 (`#2563eb`) を機種テーマカラーに変更可
//   3. それ以外は触らない（セクション色・並び順・py-3・text-center は固定）
// =============================================================================

import { useState } from "react";
import type { ShushiData } from "@/types";

interface Props {
  data: ShushiData | null;
  onSave: (data: ShushiData) => void;
  onClose: () => void;
}

function emptyState(): ShushiData {
  return {
    coinRate: 46,
    handCoins: null,
    cashInvestK: null,
    exchangeCoins: null,
    totalGames: null,
  };
}

/** 投資枚数の合算を計算 */
function calcTotalInvest(data: ShushiData): number {
  const hand = data.handCoins ?? 0;
  const cash = (data.cashInvestK ?? 0) * data.coinRate;
  return hand + cash;
}

/** 最終収支を計算 */
function calcBalance(data: ShushiData): number {
  return (data.exchangeCoins ?? 0) - calcTotalInvest(data);
}

// セクションヘッダー色定義（変更禁止）
const SECTION = {
  rate:     { border: "#6b7280", bg: "#f3f4f6", title: "#374151" },
  invest:   { border: "#dc2626", bg: "#fef2f2", title: "#991b1b" },
  exchange: { border: "#16a34a", bg: "#f0fdf4", title: "#14532d" },
  totalG:   { border: "#2563eb", bg: "#eff6ff", title: "#1e3a8a" },
} as const;

function SectionCard({
  accent, title, children,
}: {
  accent: { border: string; bg: string; title: string };
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="bg-white rounded overflow-hidden"
      style={{ border: `1.5px solid ${accent.border}`, borderLeftWidth: "5px" }}
    >
      <div
        className="px-3 py-2"
        style={{ backgroundColor: accent.bg, borderBottom: `1px solid ${accent.border}` }}
      >
        <p
          className="text-[13px] font-mono font-black tracking-wider"
          style={{ color: accent.title }}
        >
          {title}
        </p>
      </div>
      <div className="px-3 pt-3 pb-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-mono font-bold text-gray-700 mb-1.5">
      {children}
    </p>
  );
}

export function ShushiEditDashboard({ data, onSave, onClose }: Props) {
  const [form, setForm] = useState<ShushiData>(() => data ?? emptyState());

  function setField<K extends keyof ShushiData>(key: K, value: ShushiData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNumChange(key: keyof ShushiData, raw: string) {
    if (key === "coinRate") {
      setField(key, raw === "" ? 46 : Number(raw));
    } else {
      setField(key, raw === "" ? null : Number(raw));
    }
  }

  const totalInvest = calcTotalInvest(form);
  const balance = calcBalance(form);
  const cashCoins = (form.cashInvestK ?? 0) * form.coinRate;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">

      {/* ===== ヘッダー ===== */}
      <div
        className="sticky top-0 flex-shrink-0 border-b-2 border-gray-500 safe-area-top shadow-sm"
        style={{ backgroundColor: "#1f2937" }}
      >
        <div className="flex items-center px-3 h-14 gap-2">
          <button
            onClick={onClose}
            className="text-[12px] font-mono text-gray-300 border border-gray-500 rounded px-3 py-1.5 flex-shrink-0 whitespace-nowrap hover:bg-gray-700 transition-colors"
          >
            一覧へ戻る
          </button>
          <p className="flex-1 text-[12px] font-mono font-bold text-white text-center truncate px-1">
            収支入力
          </p>
        </div>
      </div>

      {/* ===== フォーム ===== */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-32">

        {/* ── レート設定 ── */}
        <SectionCard accent={SECTION.rate} title="貸出レート設定">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-mono font-bold text-gray-700 flex-shrink-0">1000円 =</span>
            <input
              type="number"
              inputMode="numeric"
              className="w-20 text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
              style={{ border: "1.5px solid #6b7280" }}
              value={form.coinRate}
              onChange={(e) => handleNumChange("coinRate", e.target.value)}
              min={1}
            />
            <span className="text-[12px] font-mono font-bold text-gray-700 flex-shrink-0">枚</span>
          </div>
        </SectionCard>

        {/* ── 投資枚数 ── */}
        <SectionCard accent={SECTION.invest} title="投資枚数（マイナス側）">

          {/* 手持ち枚数 */}
          <div>
            <SubLabel>
              <span style={{ color: "#991b1b" }}>● </span>手持ち枚数
              <span className="text-[9px] font-normal text-gray-500 ml-1">（貯玉・当日出玉）</span>
            </SubLabel>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                placeholder="枚数"
                className="w-full text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
                style={{ border: "1.5px solid #dc2626" }}
                value={form.handCoins ?? ""}
                onChange={(e) => handleNumChange("handCoins", e.target.value)}
                min={0}
              />
              {form.handCoins != null && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-gray-500">枚</span>
              )}
            </div>
          </div>

          {/* 現金投資 */}
          <div>
            <SubLabel>
              <span style={{ color: "#991b1b" }}>● </span>現金投資
              <span className="text-[9px] font-normal text-gray-500 ml-1">（1000円単位）</span>
            </SubLabel>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="○k"
                  className="w-full text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
                  style={{ border: "1.5px solid #dc2626" }}
                  value={form.cashInvestK ?? ""}
                  onChange={(e) => handleNumChange("cashInvestK", e.target.value)}
                  min={0}
                />
                {form.cashInvestK != null && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-gray-500">k</span>
                )}
              </div>
              {form.cashInvestK != null && form.cashInvestK > 0 && (
                <span className="text-[11px] font-mono font-bold text-gray-700 flex-shrink-0">
                  = {cashCoins.toLocaleString()}枚
                </span>
              )}
            </div>
          </div>

          {/* 投資合計 */}
          {totalInvest > 0 && (
            <div
              className="rounded px-3 py-2"
              style={{ backgroundColor: "#fee2e2", border: "1.5px solid #dc2626" }}
            >
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-mono font-bold" style={{ color: "#991b1b" }}>投資合計</span>
                <span className="text-base font-mono font-black" style={{ color: "#991b1b" }}>
                  {totalInvest.toLocaleString()} 枚
                </span>
              </div>
            </div>
          )}
        </SectionCard>

        {/* ── 交換枚数 ── */}
        <SectionCard accent={SECTION.exchange} title="交換枚数（プラス側）">
          <div>
            <SubLabel>
              <span style={{ color: "#14532d" }}>● </span>最終的に持ち帰った枚数
            </SubLabel>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                placeholder="交換枚数"
                className="w-full text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
                style={{ border: "1.5px solid #16a34a" }}
                value={form.exchangeCoins ?? ""}
                onChange={(e) => handleNumChange("exchangeCoins", e.target.value)}
                min={0}
              />
              {form.exchangeCoins != null && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-gray-500">枚</span>
              )}
            </div>
          </div>
        </SectionCard>

        {/* ── トータルゲーム数 ── */}
        <SectionCard accent={SECTION.totalG} title="トータルゲーム数">
          <div>
            <SubLabel>
              <span style={{ color: "#1e3a8a" }}>● </span>液晶メニューのTOTAL G数
              <span className="text-[9px] font-normal text-gray-500 ml-1">（終了時に転記）</span>
            </SubLabel>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                placeholder="TOTALゲーム数"
                className="w-full text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
                style={{ border: "1.5px solid #2563eb" }}
                value={form.totalGames ?? ""}
                onChange={(e) => handleNumChange("totalGames", e.target.value)}
                min={0}
              />
              {form.totalGames != null && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-gray-500">G</span>
              )}
            </div>
            <p className="text-[10px] font-mono text-gray-500 mt-1.5 leading-relaxed">
              ※ 集計タブの「実稼働G数」計算に使用されます
            </p>
          </div>
        </SectionCard>

        {/* ── 最終収支プレビュー ── */}
        {(totalInvest > 0 || (form.exchangeCoins ?? 0) > 0) && (
          <div
            className="rounded border-2 px-4 py-3"
            style={{
              borderColor: balance >= 0 ? "#16a34a" : "#dc2626",
              backgroundColor: balance >= 0 ? "#f0fdf4" : "#fef2f2",
            }}
          >
            <p className="text-[11px] font-mono font-bold text-gray-700 mb-1">最終収支</p>
            <p
              className="text-lg font-mono font-black text-center"
              style={{ color: balance >= 0 ? "#16a34a" : "#dc2626" }}
            >
              {balance >= 0 ? "+" : ""}{balance.toLocaleString()} 枚
            </p>
            <p className="text-[10px] font-mono text-gray-500 text-center mt-1">
              交換 {(form.exchangeCoins ?? 0).toLocaleString()} − 投資 {totalInvest.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* ===== フッター ===== */}
      <div className="fixed bottom-0 inset-x-0 z-50 safe-area-bottom" style={{ backgroundColor: "#1f2937" }}>
        <div className="max-w-2xl mx-auto flex gap-3 px-4 py-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded font-mono font-bold text-sm text-gray-300 border border-gray-500 active:scale-95 transition-transform"
          >
            キャンセル
          </button>
          <button
            onClick={() => onSave(form)}
            className="flex-1 py-3 rounded font-mono font-bold text-sm text-white active:scale-95 transition-transform"
            style={{ backgroundColor: "#2563eb" }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
