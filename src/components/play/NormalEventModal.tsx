"use client";
// =============================================================================
// VALVRAVE-RESONANCE: 通常イベント入力モーダル (ボトムシート)
// =============================================================================

import { useState, useCallback } from "react";
import { X, RotateCcw, Check } from "lucide-react";
import { useSessionStore } from "@/store/useSessionStore";
import { selectATEntries } from "@/store/useSessionStore";
import type { NormalBlock, DolciaPhase } from "@/types";

interface NormalEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// PT 履歴文字 ①〜⑥
const PT_CHARS = ["①", "②", "③", "④", "⑤", "⑥"] as const;

// イベント1 選択肢
const EVENT1_OPTIONS = ["", "CZ", "革命BONUS", "決戦BONUS"] as const;

// イベント2 選択肢
const EVENT2_OPTIONS = ["", "RUSH", "革命BONUS"] as const;

// 契機 クイック選択
const TRIGGER_OPTIONS = ["", "LD", "ニンゲン", "スルー", "その他"] as const;

// ドルシア キャラ選択
const DOLCIA_CHARS = ["リプ🟦", "ベル🟨", "V役🟩", "スイカ🟥", ""] as const;
const DOLCIA_ATTACKS = ["攻撃", "防御", "特攻", ""] as const;

// 初期フォーム状態
function makeInitialForm() {
  return {
    games: "",
    czGames: "",
    ptHistory: "",
    weekText: "",
    trigger: "",
    event1: "",
    event2: "",
    bonusActual: "",
    atWon: false,
    atGainStr: "",
    dolciaPhases: [
      { chara: "", attack: "", result: "" },
      { chara: "", attack: "", result: "" },
      { chara: "", attack: "", result: "" },
      { chara: "", attack: "", result: "" },
      { chara: "", attack: "", result: "" },
    ] as { chara: string; attack: string; result: string }[],
    memoHandwritten: "",
  };
}

// ラベル付きセクション
function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-v2-text-muted text-xs font-mono mb-1.5 uppercase tracking-widest">
        {label}
      </p>
      {children}
    </div>
  );
}

// 数値入力フィールド
function NumInput({
  label,
  value,
  onChange,
  placeholder = "0",
  suffix = "G",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
}) {
  return (
    <div className="flex-1">
      <p className="text-v2-text-muted text-xs font-mono mb-1">{label}</p>
      <div className="relative">
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="
            w-full bg-v2-black-50 border border-v2-border rounded-lg
            px-3 py-2.5 pr-7
            text-v2-text-primary font-mono text-base
            focus:outline-none focus:border-v2-red/60
            placeholder:text-v2-text-muted
          "
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-v2-text-muted text-xs font-mono">
          {suffix}
        </span>
      </div>
    </div>
  );
}

// テキスト入力フィールド
function TextInput({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex-1">
      <p className="text-v2-text-muted text-xs font-mono mb-1">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="
          w-full bg-v2-black-50 border border-v2-border rounded-lg
          px-3 py-2.5
          text-v2-text-primary font-mono text-sm
          focus:outline-none focus:border-v2-red/60
          placeholder:text-v2-text-muted
        "
      />
    </div>
  );
}

// オプション選択ボタン群
function OptionPicker<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div>
      <p className="text-v2-text-muted text-xs font-mono mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt || "none"}
            type="button"
            onClick={() => onChange(opt)}
            className={`
              px-2.5 py-1 rounded-lg text-sm font-mono font-medium border transition-all
              ${value === opt
                ? "bg-v2-red text-white border-v2-red"
                : "bg-v2-black-50 text-v2-text-secondary border-v2-border hover:border-v2-red/40"
              }
            `}
          >
            {opt || "なし"}
          </button>
        ))}
      </div>
    </div>
  );
}

// ドルシアフェーズ入力 (1行)
function DolciaPhaseRow({
  index,
  phase,
  onChange,
}: {
  index: number;
  phase: { chara: string; attack: string; result: string };
  onChange: (updated: { chara: string; attack: string; result: string }) => void;
}) {
  const phaseLabel = ["①", "②", "③", "④", "⑤"][index];
  return (
    <div className="flex gap-1.5 items-center">
      <span className="text-v2-text-muted text-xs font-mono w-4 shrink-0">{phaseLabel}</span>
      {/* キャラ */}
      <select
        value={phase.chara}
        onChange={(e) => onChange({ ...phase, chara: e.target.value })}
        className="flex-1 bg-v2-black-50 border border-v2-border rounded text-xs font-mono text-v2-text-secondary px-1.5 py-1.5 focus:outline-none focus:border-v2-cyan/60"
      >
        {DOLCIA_CHARS.map((c) => (
          <option key={c || "none"} value={c}>{c || "—"}</option>
        ))}
      </select>
      {/* 結果 */}
      <div className="flex gap-1 shrink-0">
        {["✅", "✖️", ""].map((r) => (
          <button
            key={r || "none"}
            type="button"
            onClick={() => onChange({ ...phase, result: r })}
            className={`
              w-8 h-8 rounded text-sm border transition-all
              ${phase.result === r
                ? r === "✅" ? "bg-v2-green-muted border-v2-green/40 text-white"
                  : r === "✖️" ? "bg-v2-red-muted border-v2-red/40 text-white"
                  : "bg-v2-black-50 border-v2-border text-v2-text-muted"
                : "bg-v2-black-100 border-v2-border text-v2-text-muted"
              }
            `}
          >
            {r || "—"}
          </button>
        ))}
      </div>
    </div>
  );
}

export function NormalEventModal({ isOpen, onClose }: NormalEventModalProps) {
  const appendNormalBlock = useSessionStore((s) => s.appendNormalBlock);
  const appendATEntry = useSessionStore((s) => s.appendATEntry);
  const atEntries = useSessionStore(selectATEntries);

  const [form, setForm] = useState(makeInitialForm);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => setForm(makeInitialForm()), []);

  // PT 履歴ボタン: タップで末尾に追加
  const appendPT = (char: string) =>
    setForm((f) => ({ ...f, ptHistory: f.ptHistory + char }));

  // PT 履歴: 1文字削除
  const backspacePT = () =>
    setForm((f) => ({
      ...f,
      ptHistory: [...f.ptHistory].slice(0, -1).join(""),
    }));

  const isCZ = form.event1 === "CZ";

  const handleSave = useCallback(() => {
    const games = parseInt(form.games, 10);
    if (isNaN(games) || games < 0) return;

    setSaving(true);

    // atKey の生成 (AT当選時)
    let atKey: string | null = null;
    if (form.atWon) {
      atKey = `AT${atEntries.length + 1}`;
    }

    // ドルシアフェーズ変換
    const dolciaPhases: [
      DolciaPhase | null,
      DolciaPhase | null,
      DolciaPhase | null,
      DolciaPhase | null,
      DolciaPhase | null,
    ] = [null, null, null, null, null];

    if (isCZ) {
      form.dolciaPhases.forEach((p, i) => {
        if (p.result || p.chara) {
          dolciaPhases[i] = {
            chara: p.chara,
            attack: p.attack,
            result: p.result || "",
          };
        }
      });
    }

    const block: NormalBlock = {
      id: crypto.randomUUID(),
      games,
      czGames: parseInt(form.czGames, 10) || 0,
      ptHistory: form.ptHistory,
      weekText: form.weekText,
      trigger: form.trigger,
      event1: form.event1,
      event2: form.event2,
      suggestion: "",
      bonusInfo: "",
      bonusGainStr: "",
      bonusActual: form.bonusActual ? parseInt(form.bonusActual, 10) : null,
      atKey,
      atActual: "",
      atGainStr: form.atGainStr,
      dolciaPhases,
      memoAuto: "",
      memoHandwritten: form.memoHandwritten,
      calculatedDiff: null,
    };

    // Optimistic update: store → V2Engine が即時実行
    appendNormalBlock(block);

    // AT当選時: 空のATEntryを追加
    if (atKey) {
      appendATEntry({ atKey, rounds: [] });
    }

    setSaving(false);
    reset();
    onClose();
  }, [form, isCZ, atEntries, appendNormalBlock, appendATEntry, reset, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/70 z-50"
        onClick={onClose}
      />

      {/* ボトムシート */}
      <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[92vh] flex flex-col rounded-t-2xl bg-v2-black border-t border-v2-border overflow-hidden">
        {/* ドラッグハンドル */}
        <div className="flex-shrink-0 flex justify-center pt-2.5 pb-1">
          <div className="w-10 h-1 bg-v2-border rounded-full" />
        </div>

        {/* タイトルバー */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 pb-2 border-b border-v2-border">
          <h2 className="text-v2-text-primary font-mono font-bold text-base">
            通常イベント入力
          </h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={reset}
              className="text-v2-text-muted hover:text-v2-text-secondary p-1"
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-v2-text-muted hover:text-v2-text-secondary p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* スクロール可能なフォーム本体 */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 space-y-4">

          {/* G数 */}
          <Section label="ゲーム数">
            <div className="flex gap-3">
              <NumInput
                label="通常G"
                value={form.games}
                onChange={(v) => setForm((f) => ({ ...f, games: v }))}
                placeholder="例: 300"
              />
              <NumInput
                label="CZ-G"
                value={form.czGames}
                onChange={(v) => setForm((f) => ({ ...f, czGames: v }))}
                placeholder="0"
              />
            </div>
          </Section>

          {/* PT履歴 */}
          <Section label="規定PT履歴">
            {/* プレビュー */}
            <div className="flex items-center gap-2 mb-2">
              <span className="text-v2-gold text-lg font-mono tracking-widest min-w-[60px]">
                {form.ptHistory || "—"}
              </span>
              <button
                type="button"
                onClick={backspacePT}
                disabled={!form.ptHistory}
                className="text-v2-text-muted hover:text-v2-text-secondary disabled:opacity-30 text-xs font-mono px-2 py-1 border border-v2-border rounded"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, ptHistory: "" }))}
                disabled={!form.ptHistory}
                className="text-v2-text-muted hover:text-v2-red-50 disabled:opacity-30 text-xs font-mono px-2 py-1 border border-v2-border rounded"
              >
                クリア
              </button>
            </div>
            {/* ①〜⑥ ボタン */}
            <div className="flex gap-2">
              {PT_CHARS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => appendPT(c)}
                  className="
                    flex-1 py-2.5 rounded-xl text-base font-mono font-bold
                    bg-v2-black-50 border border-v2-border
                    text-v2-gold
                    hover:border-v2-gold/50 hover:bg-v2-gold-muted
                    active:scale-95 transition-all
                  "
                >
                  {c}
                </button>
              ))}
            </div>
            {/* 天井テキスト */}
            <div className="mt-2">
              <TextInput
                label="天井テキスト"
                value={form.weekText}
                onChange={(v) => setForm((f) => ({ ...f, weekText: v }))}
                placeholder="例: 2周期"
              />
            </div>
          </Section>

          {/* イベント */}
          <Section label="イベント">
            <OptionPicker
              label="契機"
              options={TRIGGER_OPTIONS}
              value={form.trigger as typeof TRIGGER_OPTIONS[number]}
              onChange={(v) => setForm((f) => ({ ...f, trigger: v }))}
            />
            <div className="mt-2">
              <OptionPicker
                label="イベント1"
                options={EVENT1_OPTIONS}
                value={form.event1 as typeof EVENT1_OPTIONS[number]}
                onChange={(v) => setForm((f) => ({ ...f, event1: v }))}
              />
            </div>
            <div className="mt-2">
              <OptionPicker
                label="イベント2"
                options={EVENT2_OPTIONS}
                value={form.event2 as typeof EVENT2_OPTIONS[number]}
                onChange={(v) => setForm((f) => ({ ...f, event2: v }))}
              />
            </div>
          </Section>

          {/* ドルシア攻防戦 (CZ時のみ表示) */}
          {isCZ && (
            <Section label="ドルシア攻防戦">
              <div className="space-y-2">
                {form.dolciaPhases.map((phase, i) => (
                  <DolciaPhaseRow
                    key={i}
                    index={i}
                    phase={phase}
                    onChange={(updated) =>
                      setForm((f) => ({
                        ...f,
                        dolciaPhases: f.dolciaPhases.map((p, j) =>
                          j === i ? updated : p
                        ),
                      }))
                    }
                  />
                ))}
              </div>
            </Section>
          )}

          {/* ボーナス / AT */}
          <Section label="ボーナス・AT">
            <NumInput
              label="ボーナス実獲得枚数 (空欄=規定値)"
              value={form.bonusActual}
              onChange={(v) => setForm((f) => ({ ...f, bonusActual: v }))}
              placeholder="省略可"
              suffix="枚"
            />
            {/* AT当選トグル */}
            <div className="flex items-center gap-3 mt-3">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, atWon: !f.atWon }))}
                className={`
                  relative w-11 h-6 rounded-full transition-colors
                  ${form.atWon ? "bg-v2-purple" : "bg-v2-black-50 border border-v2-border"}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
                    ${form.atWon ? "translate-x-5" : "translate-x-0"}
                  `}
                />
              </button>
              <span className={`font-mono text-sm ${form.atWon ? "text-v2-purple-50" : "text-v2-text-muted"}`}>
                AT当選
              </span>
            </div>
          </Section>

          {/* メモ */}
          <Section label="メモ">
            <TextInput
              label="手書きメモ"
              value={form.memoHandwritten}
              onChange={(v) => setForm((f) => ({ ...f, memoHandwritten: v }))}
              placeholder="自由記入"
            />
          </Section>

          {/* ボトムパディング (SafeArea + FABの高さ分) */}
          <div className="h-4" />
        </div>

        {/* 保存ボタン (固定フッター) */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-v2-border bg-v2-black">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !form.games}
            className="
              w-full flex items-center justify-center gap-2
              bg-v2-red hover:bg-v2-red-200 active:bg-v2-red-400
              text-white font-mono font-bold text-base
              rounded-xl py-3.5
              transition-all duration-150
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            <Check size={18} />
            保存して反映
          </button>
        </div>
      </div>
    </>
  );
}
