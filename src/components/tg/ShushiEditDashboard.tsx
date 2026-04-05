"use client";
// =============================================================================
// 収支入力ダッシュボード
// 投資枚数・交換枚数・最終収支を記録
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
        <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4 space-y-2">
          <p className="text-[11px] font-mono font-bold text-gray-700 border-b border-gray-300 pb-1">貸出レート設定</p>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-gray-600 flex-shrink-0">1000円 =</span>
            <input
              type="number"
              inputMode="numeric"
              className="w-20 text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
              style={{ border: "1px solid #374151" }}
              value={form.coinRate}
              onChange={(e) => handleNumChange("coinRate", e.target.value)}
              min={1}
            />
            <span className="text-[11px] font-mono text-gray-600 flex-shrink-0">枚</span>
          </div>
        </div>

        {/* ── 投資枚数 ── */}
        <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4 space-y-3">
          <p className="text-[11px] font-mono font-bold text-gray-700 border-b border-gray-300 pb-1">投資枚数</p>

          {/* 手持ち枚数 */}
          <div>
            <p className="text-[10px] font-mono text-gray-500 mb-1">手持ち枚数（貯玉・当日出玉など）</p>
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                placeholder="枚数"
                className="w-full text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
                style={{ border: "1px solid #374151" }}
                value={form.handCoins ?? ""}
                onChange={(e) => handleNumChange("handCoins", e.target.value)}
                min={0}
              />
              {form.handCoins != null && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-400">枚</span>
              )}
            </div>
          </div>

          {/* 現金投資 */}
          <div>
            <p className="text-[10px] font-mono text-gray-500 mb-1">現金投資（1000円単位）</p>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="○k"
                  className="w-full text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
                  style={{ border: "1px solid #374151" }}
                  value={form.cashInvestK ?? ""}
                  onChange={(e) => handleNumChange("cashInvestK", e.target.value)}
                  min={0}
                />
                {form.cashInvestK != null && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-400">k</span>
                )}
              </div>
              {form.cashInvestK != null && form.cashInvestK > 0 && (
                <span className="text-[10px] font-mono text-gray-500 flex-shrink-0">
                  = {cashCoins.toLocaleString()}枚
                </span>
              )}
            </div>
          </div>

          {/* 投資合計 */}
          {totalInvest > 0 && (
            <div className="bg-gray-50 rounded px-3 py-2 border border-gray-300">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono text-gray-500">投資合計</span>
                <span className="text-sm font-mono font-bold text-gray-800">
                  {totalInvest.toLocaleString()} 枚
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── 交換枚数 ── */}
        <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4 space-y-3">
          <p className="text-[11px] font-mono font-bold text-gray-700 border-b border-gray-300 pb-1">交換枚数</p>
          <p className="text-[10px] font-mono text-gray-500">最終的に持ち帰った枚数を入力</p>
          <div className="relative">
            <input
              type="number"
              inputMode="numeric"
              placeholder="交換枚数"
              className="w-full text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
              style={{ border: "1px solid #374151" }}
              value={form.exchangeCoins ?? ""}
              onChange={(e) => handleNumChange("exchangeCoins", e.target.value)}
              min={0}
            />
            {form.exchangeCoins != null && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-400">枚</span>
            )}
          </div>
        </div>

        {/* ── 最終収支プレビュー ── */}
        {(totalInvest > 0 || (form.exchangeCoins ?? 0) > 0) && (
          <div
            className="rounded border-2 px-4 py-3"
            style={{
              borderColor: balance >= 0 ? "#16a34a" : "#dc2626",
              backgroundColor: balance >= 0 ? "#f0fdf4" : "#fef2f2",
            }}
          >
            <p className="text-[10px] font-mono text-gray-500 mb-1">最終収支</p>
            <p
              className="text-lg font-mono font-black text-center"
              style={{ color: balance >= 0 ? "#16a34a" : "#dc2626" }}
            >
              {balance >= 0 ? "+" : ""}{balance.toLocaleString()} 枚
            </p>
            <p className="text-[9px] font-mono text-gray-400 text-center mt-1">
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
