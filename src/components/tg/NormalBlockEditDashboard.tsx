"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時周期 編集ダッシュボード
// 構成: ヘッダー (一覧へ戻る) → スクロール可能フォーム → 最下部 保存ボタン (全幅大)
// 前兆履歴/赫眼/精神世界/招待状: 複数ドロップダウン対応
// =============================================================================

import { useState } from "react";
import type { NormalBlock } from "@/types";
import {
  TG_ZONES, TG_MODES, TG_WIN_TRIGGERS, TG_EVENTS,
  TG_ENDING_SUGGESTIONS, TG_TROPHIES, TG_KAKUGAN,
  TG_SHINSEKAI, TG_INVITATIONS, TG_ZENCHO,
} from "@/lib/engine/constants";
import { getHintText, getSuggestionColors } from "@/lib/tg/suggestionColors";

interface Props {
  block: NormalBlock | null;
  blockIndex: number;
  onSave: (block: NormalBlock) => void;
  onClose: () => void;
}

type FormState = Omit<NormalBlock, "id">;

const ZENCHO_SLOTS  = 4;
const MULTI_SLOTS   = 3;

function emptyForm(): FormState {
  return {
    jisshuG: null,
    zone: "不明",
    estimatedMode: "不明",
    winTrigger: "不明",
    event: "",
    atWin: false,
    endingSuggestion: "",
    trophy: "",
    kakugan:    [],
    shinsekai:  [],
    invitation: [],
    zencho:     [],
  };
}

// ─── 配列ヘルパー ─────────────────────────────────────────────────────────────

/** 配列の index 番目を value に変更 (空文字 → 除去) */
function setAt(arr: string[], index: number, value: string): string[] {
  const next = [...arr];
  if (value === "") {
    next.splice(index, 1);
  } else {
    next[index] = value;
  }
  // 末尾の空文字を除去して正規化
  return next.filter((v) => v !== "");
}

// ─── メインコンポーネント ──────────────────────────────────────────────────────

export function NormalBlockEditDashboard({ block, blockIndex, onSave, onClose }: Props) {
  const isNew = block === null;
  const [form, setForm] = useState<FormState>(() =>
    block ? { ...block } : emptyForm()
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setArraySlot(field: "kakugan" | "shinsekai" | "invitation" | "zencho", index: number, value: string) {
    setField(field, setAt(form[field] as string[], index, value));
  }

  function handleSave() {
    onSave({ id: block?.id ?? crypto.randomUUID(), ...form });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-v2-black-50">

      {/* ===== ヘッダー ===== */}
      <div className="sticky top-0 bg-white border-b border-v2-border safe-area-top shadow-sm flex-shrink-0">
        <div className="flex items-center px-3 h-12 gap-2">
          <button
            onClick={onClose}
            className="text-[11px] font-mono text-v2-text-secondary border border-v2-border rounded px-2 py-1 flex-shrink-0 whitespace-nowrap"
          >
            一覧へ戻る
          </button>
          <p className="flex-1 text-[11px] font-mono font-bold text-v2-text-primary text-center truncate px-1">
            {isNew ? "新規追加" : `[通常時] 行No.${blockIndex} 編集`}
          </p>
        </div>
      </div>

      {/* ===== スクロール可能フォーム ===== */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-28">

        {/* ── メインフォームグリッド ── */}
        <div className="v2-card px-3 pt-2.5 pb-3 space-y-3">

          {/* Row 1: 実G数 / ゾーン / 推定モード */}
          <div className="grid grid-cols-3 gap-2">
            <FormCell label="実G数">
              <input
                type="number"
                inputMode="numeric"
                placeholder="G数"
                className="w-full text-[11px] font-mono border border-v2-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-v2-red bg-white"
                value={form.jisshuG ?? ""}
                onChange={(e) =>
                  setField("jisshuG", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </FormCell>
            <FormCell label="ゾーン">
              <CompactSel
                value={form.zone}
                onChange={(v) => setField("zone", v)}
                options={[...TG_ZONES]}
              />
            </FormCell>
            <FormCell label="推定モード">
              <CompactSel
                value={form.estimatedMode}
                onChange={(v) => setField("estimatedMode", v)}
                options={[...TG_MODES]}
              />
            </FormCell>
          </div>

          {/* Row 2: 当選契機 / イベント / AT初当り */}
          <div className="grid grid-cols-3 gap-2">
            <FormCell label="当選契機">
              <CompactSel
                value={form.winTrigger}
                onChange={(v) => setField("winTrigger", v)}
                options={[...TG_WIN_TRIGGERS]}
              />
            </FormCell>
            <FormCell label="イベント">
              <CompactSel
                value={form.event}
                onChange={(v) => setField("event", v)}
                options={["", ...TG_EVENTS]}
                emptyLabel="なし"
              />
            </FormCell>
            <FormCell label="AT初当り">
              <button
                onClick={() => setField("atWin", !form.atWin)}
                className={`w-full text-[11px] font-mono font-bold py-1.5 rounded border transition-colors ${
                  form.atWin
                    ? "bg-green-700 text-white border-green-700"
                    : "bg-white text-v2-text-muted border-v2-border"
                }`}
              >
                {form.atWin ? "AT Get ✓" : "なし"}
              </button>
            </FormCell>
          </div>

          {/* Row 3: 終了画面示唆 / トロフィー */}
          <div className="grid grid-cols-2 gap-2">
            <FormCell label="終了画面示唆">
              <SuggestionSel
                value={form.endingSuggestion}
                onChange={(v) => setField("endingSuggestion", v)}
                options={["", ...TG_ENDING_SUGGESTIONS]}
              />
            </FormCell>
            <FormCell label="トロフィー">
              <SuggestionSel
                value={form.trophy}
                onChange={(v) => setField("trophy", v)}
                options={["", ...TG_TROPHIES]}
              />
            </FormCell>
          </div>
        </div>

        {/* ── 前兆履歴 (4スロット) ── */}
        <MultiSelectSection
          title="前兆履歴"
          titleCls="bg-red-500 text-white"
          options={[...TG_ZENCHO]}
          values={form.zencho}
          slots={ZENCHO_SLOTS}
          onChange={(i, v) => setArraySlot("zencho", i, v)}
        />

        {/* ── 赫眼 (3スロット) ── */}
        <MultiSelectSection
          title="赫眼状態"
          titleCls="bg-teal-500 text-white"
          options={[...TG_KAKUGAN]}
          values={form.kakugan}
          slots={MULTI_SLOTS}
          onChange={(i, v) => setArraySlot("kakugan", i, v)}
        />

        {/* ── 精神世界 (3スロット) ── */}
        <MultiSelectSection
          title="精神世界"
          titleCls="bg-teal-500 text-white"
          options={[...TG_SHINSEKAI]}
          values={form.shinsekai}
          slots={MULTI_SLOTS}
          onChange={(i, v) => setArraySlot("shinsekai", i, v)}
        />

        {/* ── 招待状 (3スロット) ── */}
        <MultiSelectSection
          title="招待状"
          titleCls="bg-purple-500 text-white"
          options={[...TG_INVITATIONS]}
          values={form.invitation}
          slots={MULTI_SLOTS}
          onChange={(i, v) => setArraySlot("invitation", i, v)}
          renderValue={(v) => v ? getHintText(v) : "なし"}
        />
      </div>

      {/* ===== 保存ボタン (最下部・全幅・大) ===== */}
      <div className="flex-shrink-0 bg-white border-t border-v2-border safe-area-bottom px-4 py-3">
        <button
          onClick={handleSave}
          className="w-full bg-v2-red text-white font-mono font-bold text-base py-4 rounded-xl shadow-md active:scale-95 transition-transform"
        >
          保存
        </button>
      </div>
    </div>
  );
}

// ─── MultiSelectSection ───────────────────────────────────────────────────────

interface MultiSelectSectionProps {
  title: string;
  titleCls: string;
  options: readonly string[];
  values: string[];
  slots: number;
  onChange: (index: number, value: string) => void;
  renderValue?: (v: string) => string;
}

function MultiSelectSection({
  title, titleCls, options, values, slots, onChange, renderValue,
}: MultiSelectSectionProps) {
  // スロット配列: values で埋め、残りは ""
  const slotValues = Array.from({ length: slots }, (_, i) => values[i] ?? "");

  return (
    <div className="v2-card px-3 pt-2.5 pb-3">
      <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded mb-2 ${titleCls}`}>
        {title}
      </span>
      <div className="flex flex-col gap-1.5">
        {slotValues.map((val, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-v2-text-muted w-5 text-right flex-shrink-0">
              {i + 1}.
            </span>
            <select
              className="flex-1 text-[11px] font-mono border border-v2-border rounded px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-v2-red bg-white"
              value={val}
              onChange={(e) => onChange(i, e.target.value)}
            >
              <option value="">なし</option>
              {options.map((opt) => (
                <option key={opt} value={opt}>
                  {renderValue ? renderValue(opt) : opt}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── サブコンポーネント ───────────────────────────────────────────────────────

function FormCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-mono text-v2-text-muted">{label}</span>
      {children}
    </div>
  );
}

function CompactSel({
  value, onChange, options, emptyLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  emptyLabel?: string;
}) {
  return (
    <select
      className="w-full text-[11px] font-mono border border-v2-border rounded px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-v2-red bg-white"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt === "" ? (emptyLabel ?? "なし") : opt}
        </option>
      ))}
    </select>
  );
}

function SuggestionSel({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const colors = value ? getSuggestionColors(value) : null;
  const hint   = value ? getHintText(value) : null;
  return (
    <div className="flex flex-col gap-1">
      {hint && colors && (
        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded self-start ${colors.bg} ${colors.text}`}>
          {hint}
        </span>
      )}
      <select
        className="w-full text-[11px] font-mono border border-v2-border rounded px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-v2-red bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "" ? "なし" : getHintText(opt)}
          </option>
        ))}
      </select>
    </div>
  );
}
