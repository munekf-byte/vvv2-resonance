"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時周期 編集ダッシュボード
// フルスクリーンオーバーレイ — 新規追加 / 既存編集
// =============================================================================

import { useState } from "react";
import type { NormalBlock } from "@/types";
import {
  TG_ZONES,
  TG_MODES,
  TG_WIN_TRIGGERS,
  TG_EVENTS,
  TG_ENDING_SUGGESTIONS,
  TG_TROPHIES,
  TG_KAKUGAN,
  TG_SHINSEKAI,
  TG_INVITATIONS,
  TG_ZENCHO,
} from "@/lib/engine/constants";
import { getSuggestionColors, getHintText } from "@/lib/tg/suggestionColors";

interface Props {
  /** null = 新規追加, NormalBlock = 既存編集 */
  block: NormalBlock | null;
  onSave: (block: NormalBlock) => void;
  onClose: () => void;
}

type FormState = Omit<NormalBlock, "id">;

function emptyForm(): FormState {
  return {
    jisshuG: null,
    zone: "不明",
    estimatedMode: "不明",
    winTrigger: "不明",
    event1: "",
    event2: "",
    atWin: false,
    endingSuggestion: "",
    trophy: "",
    kakugan: "",
    shinsekai: "",
    invitation: "",
    zencho: "",
  };
}

export function NormalBlockEditDashboard({ block, onSave, onClose }: Props) {
  const isNew = block === null;
  const [form, setForm] = useState<FormState>(() =>
    block ? { ...block } : emptyForm()
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const id = block?.id ?? crypto.randomUUID();
    onSave({ id, ...form });
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* ===== ヘッダー ===== */}
      <div className="sticky top-0 z-10 bg-white border-b border-v2-border safe-area-top shadow-sm">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={onClose}
            className="text-v2-text-secondary text-sm font-mono px-1 py-1"
          >
            ✕ 閉じる
          </button>
          <h2 className="text-sm font-mono font-bold text-v2-text-primary">
            {isNew ? "周期 追加" : "周期 編集"}
          </h2>
          <button
            onClick={handleSave}
            className="v2-btn-primary text-sm px-4 py-1.5"
          >
            保存
          </button>
        </div>
      </div>

      {/* ===== スクロール可能フォーム ===== */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-5">

        {/* --- 基本情報 --- */}
        <Section title="基本情報">
          <FormRow label="実G数">
            <input
              type="number"
              inputMode="numeric"
              className="form-input max-w-[140px] text-right"
              placeholder="例: 300"
              value={form.jisshuG ?? ""}
              onChange={(e) =>
                setField("jisshuG", e.target.value === "" ? null : Number(e.target.value))
              }
            />
          </FormRow>
          <FormRow label="ゾーン">
            <Sel
              value={form.zone}
              onChange={(v) => setField("zone", v)}
              options={[...TG_ZONES]}
            />
          </FormRow>
          <FormRow label="推定モード">
            <Sel
              value={form.estimatedMode}
              onChange={(v) => setField("estimatedMode", v)}
              options={[...TG_MODES]}
            />
          </FormRow>
        </Section>

        {/* --- 当選情報 --- */}
        <Section title="当選情報">
          <FormRow label="当選契機">
            <Sel
              value={form.winTrigger}
              onChange={(v) => setField("winTrigger", v)}
              options={[...TG_WIN_TRIGGERS]}
            />
          </FormRow>
          <FormRow label="AT初当り">
            <button
              onClick={() => setField("atWin", !form.atWin)}
              className={`px-4 py-2 rounded text-sm font-mono font-bold border transition-colors ${
                form.atWin
                  ? "bg-green-700 text-white border-green-700"
                  : "bg-white text-v2-text-muted border-v2-border"
              }`}
            >
              {form.atWin ? "AT Get ✓" : "AT なし"}
            </button>
          </FormRow>
        </Section>

        {/* --- イベント --- */}
        <Section title="イベント">
          <FormRow label="イベント1">
            <Sel
              value={form.event1}
              onChange={(v) => setField("event1", v)}
              options={["", ...TG_EVENTS]}
              emptyLabel="なし"
            />
          </FormRow>
          <FormRow label="イベント2">
            <Sel
              value={form.event2}
              onChange={(v) => setField("event2", v)}
              options={["", ...TG_EVENTS]}
              emptyLabel="なし"
            />
          </FormRow>
        </Section>

        {/* --- 終了画面 --- */}
        <Section title="終了画面">
          <FormRow label="終了画面示唆">
            <SuggestionSel
              value={form.endingSuggestion}
              onChange={(v) => setField("endingSuggestion", v)}
              options={["", ...TG_ENDING_SUGGESTIONS]}
            />
          </FormRow>
          <FormRow label="トロフィー">
            <SuggestionSel
              value={form.trophy}
              onChange={(v) => setField("trophy", v)}
              options={["", ...TG_TROPHIES]}
            />
          </FormRow>
        </Section>

        {/* --- 特殊演出 --- */}
        <Section title="特殊演出">
          <FormRow label="赫眼状態">
            <Sel
              value={form.kakugan}
              onChange={(v) => setField("kakugan", v)}
              options={["", ...TG_KAKUGAN]}
              emptyLabel="なし"
            />
          </FormRow>
          <FormRow label="精神世界">
            <Sel
              value={form.shinsekai}
              onChange={(v) => setField("shinsekai", v)}
              options={["", ...TG_SHINSEKAI]}
              emptyLabel="なし"
            />
          </FormRow>
        </Section>

        {/* --- その他 --- */}
        <Section title="その他">
          <FormRow label="招待状">
            <SuggestionSel
              value={form.invitation}
              onChange={(v) => setField("invitation", v)}
              options={["", ...TG_INVITATIONS]}
            />
          </FormRow>
          <FormRow label="前兆履歴">
            <Sel
              value={form.zencho}
              onChange={(v) => setField("zencho", v)}
              options={["", ...TG_ZENCHO]}
              emptyLabel="なし"
            />
          </FormRow>
        </Section>

        <div className="h-8" />
      </div>
    </div>
  );
}

// --- サブコンポーネント ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[10px] font-mono text-v2-text-muted uppercase tracking-widest mb-2 px-1">
        {title}
      </h3>
      <div className="v2-card divide-y divide-v2-border">{children}</div>
    </div>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 gap-3 min-h-[48px]">
      <span className="text-sm font-mono text-v2-text-secondary flex-shrink-0 w-24">{label}</span>
      <div className="flex-1 flex justify-end items-center">{children}</div>
    </div>
  );
}

function Sel({
  value,
  onChange,
  options,
  emptyLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  emptyLabel?: string;
}) {
  return (
    <select
      className="form-select max-w-[200px] text-right"
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
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const colors = value ? getSuggestionColors(value) : null;
  const hint = value ? getHintText(value) : null;

  return (
    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
      {hint && colors && (
        <span
          className={`text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0 ${colors.bg} ${colors.text}`}
        >
          {hint}
        </span>
      )}
      <select
        className="form-select max-w-[180px] text-right min-w-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "" ? "なし" : opt}
          </option>
        ))}
      </select>
    </div>
  );
}
