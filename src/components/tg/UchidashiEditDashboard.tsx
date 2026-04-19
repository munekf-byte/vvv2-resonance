"use client";
// =============================================================================
// 打ち出し状態設定ダッシュボード
// 途中から打つ台のメニュー画面情報を記録
// =============================================================================

import { useState } from "react";
import type { UchidashiState } from "@/types";

interface Props {
  data: UchidashiState | null;
  onSave: (data: UchidashiState) => void;
  onClose: () => void;
}

function emptyState(): UchidashiState {
  return {
    currentGames: null,
    totalGames: null,
    samai: null,
    reminiscence: null,
    rize: null,
    episodeBonus: null,
  };
}

export function UchidashiEditDashboard({ data, onSave, onClose }: Props) {
  const [form, setForm] = useState<UchidashiState>(() => data ?? emptyState());

  function setField<K extends keyof UchidashiState>(key: K, value: UchidashiState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleNumChange(key: keyof UchidashiState, raw: string) {
    setField(key, raw === "" ? null : Number(raw));
  }

  function handleSave() {
    onSave(form);
  }

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
            打ち出し状態設定
          </p>
        </div>
      </div>

      {/* ===== フォーム ===== */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-32">

        <p className="text-[10px] font-mono text-gray-500 px-1">
          台のメニュー画面から確認できる情報を入力してください
        </p>

        {/* ── ゲーム数セクション ── */}
        <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4 space-y-3">
          <p className="text-[11px] font-mono font-bold text-gray-700 border-b border-gray-300 pb-1">ゲーム数</p>
          <div className="grid grid-cols-2 gap-3">
            <NumField
              label="現在のゲーム数"
              value={form.currentGames}
              onChange={(v) => handleNumChange("currentGames", v)}
              placeholder="G数"
              suffix="G"
            />
            <NumField
              label="Total ゲーム数"
              value={form.totalGames}
              onChange={(v) => handleNumChange("totalGames", v)}
              placeholder="Total"
              suffix="G"
            />
          </div>
        </div>

        {/* ── 差枚数 ── */}
        <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4 space-y-3">
          <p className="text-[11px] font-mono font-bold text-gray-700 border-b border-gray-300 pb-1">差枚数</p>
          <SignedNumField
            label="打ち出し時差枚数（わかる範囲で）"
            value={form.samai}
            onChange={(v) => setField("samai", v)}
            placeholder="枚数"
            suffix="枚"
          />
        </div>

        {/* ── ボーナス系カウンター ── */}
        <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4 space-y-3">
          <p className="text-[11px] font-mono font-bold text-gray-700 border-b border-gray-300 pb-1">ボーナス・イベント回数</p>
          <div className="grid grid-cols-3 gap-3">
            <NumField
              label="レミニセンス"
              value={form.reminiscence}
              onChange={(v) => handleNumChange("reminiscence", v)}
              placeholder="回数"
              suffix="回"
            />
            <NumField
              label="大食いの利世"
              value={form.rize}
              onChange={(v) => handleNumChange("rize", v)}
              placeholder="回数"
              suffix="回"
            />
            <NumField
              label="エピソードボーナス"
              value={form.episodeBonus}
              onChange={(v) => handleNumChange("episodeBonus", v)}
              placeholder="回数"
              suffix="回"
            />
          </div>
        </div>
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
            onClick={handleSave}
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

// ─── 数値入力フィールド ───────────────────────────────────────────────────────

function NumField({
  label, value, onChange, placeholder, suffix, allowNegative = false,
}: {
  label: string;
  value: number | null;
  onChange: (raw: string) => void;
  placeholder: string;
  suffix?: string;
  allowNegative?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] font-mono text-gray-500 mb-1">{label}</p>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          placeholder={placeholder}
          className="w-full text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
          style={{ border: "1px solid #374151" }}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          {...(!allowNegative && { min: 0 })}
        />
        {suffix && value != null && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-400">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── 符号付き数値入力フィールド ──────────────────────────────────────────────
// +/− ボタンで符号を切り替え、入力欄には絶対値を入力する

function SignedNumField({
  label, value, onChange, placeholder, suffix,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder: string;
  suffix?: string;
}) {
  const [sign, setSign] = useState<1 | -1>(() =>
    value != null && value < 0 ? -1 : 1,
  );
  const absValue = value != null ? Math.abs(value) : null;

  function handleInputChange(raw: string) {
    if (raw === "") {
      onChange(null);
      return;
    }
    const n = Math.abs(Number(raw));
    if (Number.isNaN(n)) return;
    onChange(sign * n);
  }

  function handleSignChange(newSign: 1 | -1) {
    setSign(newSign);
    if (absValue != null) {
      onChange(newSign * absValue);
    }
  }

  const baseBtn =
    "font-mono font-bold text-base rounded transition-all active:scale-95 py-3";
  const selStyle = {
    backgroundColor: "#1f2937",
    color: "#fff",
    border: "1px solid #374151",
    boxShadow: "0 0 0 2px #1f2937",
  } as const;
  const unselStyle = {
    backgroundColor: "#f3f4f6",
    color: "#6b7280",
    border: "1px solid #374151",
  } as const;

  return (
    <div>
      <p className="text-[10px] font-mono text-gray-500 mb-1">{label}</p>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          type="button"
          onClick={() => handleSignChange(1)}
          className={baseBtn}
          style={sign === 1 ? selStyle : unselStyle}
        >
          ＋（プラス）
        </button>
        <button
          type="button"
          onClick={() => handleSignChange(-1)}
          className={baseBtn}
          style={sign === -1 ? selStyle : unselStyle}
        >
          −（マイナス）
        </button>
      </div>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={placeholder}
          className="w-full text-sm font-mono rounded px-2 py-3 focus:outline-none bg-white text-center"
          style={{ border: "1px solid #374151" }}
          value={absValue ?? ""}
          onChange={(e) => handleInputChange(e.target.value)}
        />
        {suffix && absValue != null && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-gray-400">
            {sign === -1 ? "−" : "＋"}{suffix}
          </span>
        )}
      </div>
    </div>
  );
}
