"use client";
// =============================================================================
// VALVRAVE-RESONANCE: ATラウンド入力モーダル (ボトムシート)
// =============================================================================

import { useState, useCallback } from "react";
import { X, Check, Minus, Plus } from "lucide-react";
import { useSessionStore, selectATEntries } from "@/store/useSessionStore";
import type { ATRound } from "@/types";

interface ATRoundModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// R種別定義
const ROUND_TYPES = [
  { label: "10",      value: "10",     games: 10  },
  { label: "20",      value: "20",     games: 20  },
  { label: "50‖D",   value: "50||D",  games: 50  },
  { label: "100‖D",  value: "100||D", games: 100 },
  { label: "200",     value: "200",    games: 200 },
  { label: "究極",    value: "究極",   games: 200 },
] as const;

type RoundTypeValue = typeof ROUND_TYPES[number]["value"];

function makeInitialForm() {
  return {
    atKey: "",
    roundType: "" as RoundTypeValue | "",
    midBonusGames: 0,
    returnGames: 0,
    isED: false,
    continueTrigger: "",
    stateText: "",
  };
}

// ===== ステッパーボタン =====
function Stepper({
  label,
  value,
  onChange,
  min = 0,
  step = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <div>
      <p className="text-v2-text-muted text-xs font-mono mb-2">{label}</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          className="w-11 h-11 rounded-xl bg-v2-black-50 border border-v2-border text-v2-text-primary flex items-center justify-center hover:border-v2-red/40 active:scale-95 transition-all"
        >
          <Minus size={18} />
        </button>
        <span className="flex-1 text-center font-mono font-bold text-xl text-v2-text-primary tabular-nums">
          {value}
          <span className="text-v2-text-muted text-sm ml-1">G</span>
        </span>
        <button
          type="button"
          onClick={() => onChange(value + step)}
          className="w-11 h-11 rounded-xl bg-v2-black-50 border border-v2-border text-v2-text-primary flex items-center justify-center hover:border-v2-green/40 active:scale-95 transition-all"
        >
          <Plus size={18} />
        </button>
      </div>
      {/* クイック入力ボタン */}
      <div className="flex gap-1.5 mt-2">
        {[0, 10, 20, 30, 50].map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onChange(v)}
            className={`
              flex-1 py-1 rounded text-xs font-mono border transition-all
              ${value === v
                ? "bg-v2-purple-muted border-v2-purple/50 text-v2-purple-50"
                : "bg-v2-black-100 border-v2-border text-v2-text-muted hover:border-v2-purple/30"
              }
            `}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ATRoundModal({ isOpen, onClose }: ATRoundModalProps) {
  const appendATRound = useSessionStore((s) => s.appendATRound);
  const atEntries = useSessionStore(selectATEntries);

  const [form, setForm] = useState(makeInitialForm);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setForm(makeInitialForm());
  }, []);

  const handleSave = useCallback(() => {
    if (!form.atKey || !form.roundType) return;

    setSaving(true);

    // roundIndex = 現在のラウンド数
    const entry = atEntries.find((e) => e.atKey === form.atKey);
    const roundIndex = entry?.rounds.length ?? 0;

    const round: ATRound = {
      id: crypto.randomUUID(),
      atKey: form.atKey,
      roundIndex,
      roundType: form.roundType,
      cutFlag: form.isED ? "切断║ED" : "",
      midBonusGames: form.midBonusGames,
      returnGames: form.returnGames,
      specialGames: 0,
      continueTrigger: form.continueTrigger,
      stateText: form.stateText,
      stampInput: null,
      calculatedDiff: null,
    };

    // Optimistic update
    appendATRound(form.atKey, round);

    setSaving(false);
    reset();
    onClose();
  }, [form, atEntries, appendATRound, reset, onClose]);

  if (!isOpen) return null;

  const canSave = !!form.atKey && !!form.roundType;

  return (
    <>
      {/* オーバーレイ */}
      <div className="fixed inset-0 bg-black/70 z-50" onClick={onClose} />

      {/* ボトムシート */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[90vh] flex flex-col rounded-t-2xl bg-v2-black border-t border-v2-purple-muted overflow-hidden">
        {/* ドラッグハンドル */}
        <div className="flex-shrink-0 flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-v2-purple-muted rounded-full" />
        </div>

        {/* タイトルバー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 pb-2 border-b border-v2-purple-muted">
          <h2 className="text-v2-purple-50 font-mono font-bold text-base">
            ATラウンド入力
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-v2-text-muted hover:text-v2-text-secondary p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* フォーム本体 */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-5">

          {/* ATキー選択 */}
          <div>
            <p className="text-v2-text-muted text-xs font-mono mb-2 uppercase tracking-widest">
              対象 AT
            </p>
            {atEntries.length === 0 ? (
              <p className="text-v2-text-muted text-sm font-mono text-center py-3">
                ATが登録されていません
              </p>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {atEntries.map((entry) => (
                  <button
                    key={entry.atKey}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, atKey: entry.atKey }))}
                    className={`
                      px-4 py-2 rounded-xl font-mono font-bold text-sm border transition-all
                      ${form.atKey === entry.atKey
                        ? "bg-v2-purple text-white border-v2-purple"
                        : "bg-v2-purple-bg border-v2-purple-muted text-v2-purple-50 hover:border-v2-purple/60"
                      }
                    `}
                  >
                    {entry.atKey}
                    <span className="ml-1 text-xs opacity-70">
                      ({entry.rounds.length}R)
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* R種別 — メイン選択 */}
          <div>
            <p className="text-v2-text-muted text-xs font-mono mb-2 uppercase tracking-widest">
              R種別
            </p>
            <div className="grid grid-cols-3 gap-2">
              {ROUND_TYPES.map((rt) => {
                const selected = form.roundType === rt.value;
                const isSpecial = rt.value.includes("||") || rt.value === "究極";
                return (
                  <button
                    key={rt.value}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, roundType: rt.value }))}
                    className={`
                      py-4 rounded-xl font-mono font-bold text-lg border transition-all active:scale-95
                      ${selected
                        ? isSpecial
                          ? "bg-v2-purple text-white border-v2-purple shadow-lg shadow-v2-purple-muted/50"
                          : "bg-v2-red text-white border-v2-red shadow-lg shadow-v2-red-muted/50"
                        : "bg-v2-black-50 text-v2-text-secondary border-v2-border hover:border-v2-purple/40"
                      }
                    `}
                  >
                    {rt.label}
                    {selected && (
                      <span className="block text-xs font-normal opacity-70 mt-0.5">
                        {rt.games}G
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 道中乗せG数 */}
          <Stepper
            label="道中乗せG数"
            value={form.midBonusGames}
            onChange={(v) => setForm((f) => ({ ...f, midBonusGames: v }))}
          />

          {/* 有利区間切断 (ED) */}
          <div>
            <p className="text-v2-text-muted text-xs font-mono mb-2 uppercase tracking-widest">
              有利区間切断
            </p>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isED: !f.isED }))}
              className={`
                w-full py-3 rounded-xl font-mono font-bold text-sm border transition-all
                flex items-center justify-center gap-2
                ${form.isED
                  ? "bg-v2-red-muted border-v2-red/60 text-v2-red-50"
                  : "bg-v2-black-50 border-v2-border text-v2-text-muted"
                }
              `}
            >
              <span className={`w-5 h-5 rounded flex items-center justify-center border transition-all
                ${form.isED ? "bg-v2-red border-v2-red" : "border-v2-border"}`}>
                {form.isED && <Check size={12} />}
              </span>
              切断║ED
              {form.isED && (
                <span className="text-xs opacity-70">(gain+200, retG×9)</span>
              )}
            </button>
          </div>

          {/* 引戻しG数 */}
          <Stepper
            label="引戻しG数"
            value={form.returnGames}
            onChange={(v) => setForm((f) => ({ ...f, returnGames: v }))}
          />

          <div className="h-4" />
        </div>

        {/* 保存フッター */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-v2-purple-muted bg-v2-black">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            className="
              w-full flex items-center justify-center gap-2
              bg-v2-purple hover:bg-v2-purple-200 active:bg-v2-purple-400
              text-white font-mono font-bold text-base
              rounded-xl py-3.5
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <Check size={18} />
            ラウンド追加
          </button>
        </div>
      </div>
    </>
  );
}
