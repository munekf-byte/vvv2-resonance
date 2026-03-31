"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時周期 編集ダッシュボード
// レイアウト: 上部チップ3グループ（前兆履歴/特殊演出/招待状）+ 下部3列フォームグリッド
// =============================================================================

import { useState } from "react";
import type { NormalBlock } from "@/types";
import {
  TG_ZONES, TG_MODES, TG_WIN_TRIGGERS, TG_EVENTS,
  TG_ENDING_SUGGESTIONS, TG_TROPHIES, TG_KAKUGAN,
  TG_SHINSEKAI, TG_INVITATIONS, TG_ZENCHO,
} from "@/lib/engine/constants";
import { getSuggestionColors, getHintText } from "@/lib/tg/suggestionColors";

interface Props {
  block: NormalBlock | null; // null = 新規追加
  blockIndex: number;        // 表示用行番号 (1始まり)
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
    event: "",
    atWin: false,
    endingSuggestion: "",
    trophy: "",
    kakugan: "",
    shinsekai: "",
    invitation: "",
    zencho: "",
  };
}

// ─── 省略ヘルパー (チップ表示用) ──────────────────────────────────────────────

function abbrevZencho(v: string): string {
  return v.replace("-前兆ステージ", "前S").replace("-前兆", "前");
}

function abbrevInvitation(v: string): string {
  const hint = getHintText(v);
  const map: Record<string, string> = {
    "デフォルト": "デフォ",
    "規定G数を示唆": "規定G",
    "残り100G or 300G or 500G以内示唆": "残100/300/500",
    "残り200G or 400G or 600G以内示唆": "残200/400/600",
    "600G否定": "600G否",
    "残り200G以内or 500G以上示唆": "残200↓/500↑",
    "残り300G以内濃厚": "残300↓",
    "残り200G以内濃厚": "残200↓",
    "残り100G以内濃厚": "残100↓",
    "偶数設定期待度UP": "偶数UP",
    "設定1否定": "設1否",
    "設定2否定": "設2否",
    "設定3否定": "設3否",
    "設定4否定": "設4否",
    "設定4以上濃厚": "設定4↑",
    "設定6濃厚": "設定6!",
  };
  return map[hint] ?? hint;
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

  // チップトグル: 同じ値を再タップで解除
  function toggleField(
    field: "zencho" | "kakugan" | "shinsekai" | "invitation",
    value: string
  ) {
    setField(field, form[field] === value ? "" : value);
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
            {isNew ? "新規追加" : `[通常時] 行No.${blockIndex} 編集 DashBoard`}
          </p>
          <button
            onClick={handleSave}
            className="v2-btn-primary text-[11px] px-3 py-1.5 flex-shrink-0"
          >
            保存
          </button>
        </div>
      </div>

      {/* ===== スクロール可能フォーム ===== */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">

        {/* ── Section 1: 前兆履歴 ── */}
        <ChipSection
          title="前兆履歴"
          titleCls="bg-red-500 text-white"
          options={[...TG_ZENCHO]}
          selected={form.zencho}
          onToggle={(v) => toggleField("zencho", v)}
          abbrevFn={abbrevZencho}
          selectedCls="bg-red-100 text-red-800 border-red-400"
        />

        {/* ── Section 2: 特殊演出 (赫眼 + 精神世界) ── */}
        <div className="v2-card px-3 pt-2.5 pb-3">
          <span className="inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-teal-500 text-white mb-2">
            特殊演出
          </span>
          <div className="flex flex-wrap gap-1.5">
            <span className="text-[9px] font-mono text-v2-text-muted self-center mr-1">赫眼</span>
            {[...TG_KAKUGAN].map((opt) => (
              <Chip
                key={opt}
                label={opt}
                selected={form.kakugan === opt}
                onToggle={() => toggleField("kakugan", opt)}
                selectedCls="bg-teal-100 text-teal-800 border-teal-400"
              />
            ))}
            <span className="w-full" />
            <span className="text-[9px] font-mono text-v2-text-muted self-center mr-1">精神世界</span>
            {[...TG_SHINSEKAI].map((opt) => (
              <Chip
                key={opt}
                label={opt}
                selected={form.shinsekai === opt}
                onToggle={() => toggleField("shinsekai", opt)}
                selectedCls="bg-teal-100 text-teal-800 border-teal-400"
              />
            ))}
          </div>
        </div>

        {/* ── Section 3: 招待状 ── */}
        <ChipSection
          title="招待状"
          titleCls="bg-purple-500 text-white"
          options={[...TG_INVITATIONS]}
          selected={form.invitation}
          onToggle={(v) => toggleField("invitation", v)}
          abbrevFn={abbrevInvitation}
          selectedCls="bg-purple-100 text-purple-800 border-purple-400"
          getChipColor={(v) => {
            if (!v) return undefined;
            const c = getSuggestionColors(v);
            const isSelected = form.invitation === v;
            return isSelected ? "bg-purple-100 text-purple-800 border-purple-400" : undefined;
          }}
        />

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

        <div className="h-8" />
      </div>
    </div>
  );
}

// ─── サブコンポーネント ───────────────────────────────────────────────────────

interface ChipSectionProps {
  title: string;
  titleCls: string;
  options: readonly string[];
  selected: string;
  onToggle: (v: string) => void;
  abbrevFn?: (v: string) => string;
  selectedCls: string;
  getChipColor?: (v: string) => string | undefined;
}

function ChipSection({
  title, titleCls, options, selected, onToggle, abbrevFn, selectedCls,
}: ChipSectionProps) {
  return (
    <div className="v2-card px-3 pt-2.5 pb-3">
      <span className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded mb-2 ${titleCls}`}>
        {title}
      </span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <Chip
            key={opt}
            label={abbrevFn ? abbrevFn(opt) : opt}
            selected={selected === opt}
            onToggle={() => onToggle(opt)}
            selectedCls={selectedCls}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({
  label, selected, onToggle, selectedCls,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  selectedCls?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
        selected
          ? (selectedCls ?? "bg-v2-red text-white border-v2-red")
          : "bg-white text-v2-text-secondary border-v2-border active:bg-v2-black-50"
      }`}
    >
      {label}
    </button>
  );
}

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
            {opt === "" ? "なし" : opt}
          </option>
        ))}
      </select>
    </div>
  );
}
