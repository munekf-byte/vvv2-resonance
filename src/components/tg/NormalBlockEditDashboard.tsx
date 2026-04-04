"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時周期 編集ダッシュボード v1.5
// UIレギュレーション1準拠
// セクション順: メインカード(3+3+2) → 前兆履歴 → 招待状 → 赫眼状態 → 精神世界 → フリーメモ
// =============================================================================

import { useState } from "react";
import type { NormalBlock } from "@/types";
import {
  TG_ZONES, TG_MODES, TG_WIN_TRIGGERS, TG_EVENTS,
  TG_ENDING_SUGGESTIONS, TG_TROPHIES, TG_KAKUGAN,
  TG_SHINSEKAI, TG_INVITATIONS,
  TG_ZENCHO_ZONES, TG_ZENCHO_TYPES,
} from "@/lib/engine/constants";
import {
  getZoneCellColor, getModeCellColor, getTriggerCellColor, getEventCellColor,
  getEndingCellColor, getTrophyCellColor, getKakuganCellColor, getShinsekaiCellColor,
  getInvitationCellColor, getSuggestionListLines,
  abbrevMode, abbrevTrigger, abbrevEvent,
  type CellColor,
} from "@/lib/tg/cellColors";

interface Props {
  block: NormalBlock | null;
  blockIndex: number;
  onSave: (block: NormalBlock) => void;
  onTempSave: (block: NormalBlock) => void;
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
    kakugan:    [],
    shinsekai:  [],
    invitation: [],
    zencho:     [],
    memo: "",
  };
}

// ─── メインコンポーネント ──────────────────────────────────────────────────────

export function NormalBlockEditDashboard({ block, blockIndex, onSave, onTempSave, onClose }: Props) {
  const isNew = block === null;
  const [form, setForm] = useState<FormState>(() =>
    block ? { ...block, memo: block.memo ?? "" } : emptyForm()
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleMulti(field: "kakugan" | "shinsekai" | "invitation", value: string) {
    const current = form[field] as string[];
    setField(field, current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    );
  }

  function setZencho(zone: string, type: string) {
    const filtered = form.zencho.filter((v) => !v.startsWith(zone + ":"));
    setField("zencho", type ? [...filtered, `${zone}:${type}`] : filtered);
  }

  function getZenchoType(zone: string): string {
    const entry = form.zencho.find((v) => v.startsWith(zone + ":"));
    return entry ? entry.split(":")[1] : "";
  }

  function buildBlock(): NormalBlock {
    return { id: block?.id ?? crypto.randomUUID(), ...form };
  }

  function handleSave()     { onSave(buildBlock()); }
  function handleTempSave() { onTempSave(buildBlock()); }

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
            {isNew ? "新規追加" : `[通常時] 行No.${blockIndex} 編集`}
          </p>
        </div>
      </div>

      {/* ===== スクロール可能フォーム ===== */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-32">

        {/* ── メインカード ── */}
        <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4 space-y-3">

          {/* Row 1: 実G数 | ゾーン | 推定MODE */}
          <div className="grid grid-cols-3 gap-2">
            <FormCell label="実G数">
              <input
                type="number"
                inputMode="numeric"
                placeholder="G数"
                className="w-full text-sm font-mono border-2 border-gray-300 rounded px-1 py-3 focus:outline-none focus:border-gray-500 bg-white text-center"
                value={form.jisshuG ?? ""}
                onChange={(e) =>
                  setField("jisshuG", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </FormCell>
            <FormCell label="ゾーン">
              <ColoredSelectIcon
                value={form.zone}
                onChange={(v) => setField("zone", v)}
                options={[...TG_ZONES]}
                colorFn={getZoneCellColor}
              />
            </FormCell>
            <FormCell label="推定MODE">
              <ColoredSelectIcon
                value={form.estimatedMode}
                onChange={(v) => setField("estimatedMode", v)}
                options={[...TG_MODES]}
                colorFn={getModeCellColor}
                labelFn={(v) => v === "不明" ? "不明" : abbrevMode(v)}
              />
            </FormCell>
          </div>

          {/* Row 2: 当選契機 | イベント | AT初当たり */}
          <div className="grid grid-cols-3 gap-2">
            <FormCell label="当選契機">
              <ColoredSelectIcon
                value={form.winTrigger}
                onChange={(v) => setField("winTrigger", v)}
                options={[...TG_WIN_TRIGGERS]}
                colorFn={getTriggerCellColor}
                labelFn={(v) => v === "不明" ? "不明" : abbrevTrigger(v)}
              />
            </FormCell>
            <FormCell label="イベント">
              <ColoredSelectIcon
                value={form.event}
                onChange={(v) => setField("event", v)}
                options={["", ...TG_EVENTS]}
                colorFn={getEventCellColor}
                labelFn={(v) => v ? abbrevEvent(v) : "なし"}
                emptyLabel="なし"
              />
            </FormCell>
            <FormCell label="AT初当たり">
              <button
                onClick={() => setField("atWin", !form.atWin)}
                className="w-full font-mono font-bold text-[11px] rounded border-2 transition-all active:scale-95"
                style={{
                  ...(form.atWin
                    ? { backgroundColor: "#38761d", color: "#fff", borderColor: "#38761d", boxShadow: "0 0 0 2px #1f2937" }
                    : { backgroundColor: "#f3f4f6", color: "#6b7280", borderColor: "#e5e7eb" }),
                  minHeight: "56px",
                }}
              >
                {form.atWin ? "AT Get ✓" : "なし"}
              </button>
            </FormCell>
          </div>

          {/* Row 3: 終了画面示唆 | トロフィー */}
          <div className="grid grid-cols-2 gap-3">
            <FormCell label="終了画面示唆">
              <ColoredSelectIcon
                value={form.endingSuggestion}
                onChange={(v) => setField("endingSuggestion", v)}
                options={["", ...TG_ENDING_SUGGESTIONS]}
                colorFn={getEndingCellColor}
                labelFn={(v) => v ? (getSuggestionListLines(v)?.name ?? v) : "なし"}
                emptyLabel="なし"
              />
            </FormCell>
            <FormCell label="トロフィー">
              <ColoredSelectIcon
                value={form.trophy}
                onChange={(v) => setField("trophy", v)}
                options={["", ...TG_TROPHIES]}
                colorFn={getTrophyCellColor}
                labelFn={(v) => v ? (getSuggestionListLines(v)?.name ?? v) : "なし"}
                emptyLabel="なし"
              />
            </FormCell>
          </div>
        </div>

        {/* ── 前兆履歴 (nd-8) — コンパクトスロット方式 ── */}
        <Section title="前兆履歴">
          <div className="grid grid-cols-3 gap-2">
            {([...TG_ZENCHO_ZONES] as string[]).map((zone) => (
              <ZenchoSlot
                key={zone}
                zone={zone}
                value={getZenchoType(zone)}
                onChange={(type) => setZencho(zone, type)}
              />
            ))}
          </div>
          <p className="text-[8px] text-gray-400 font-mono mt-1.5">タップで前兆タイプを循環切替</p>
        </Section>

        {/* ── 招待状 (nd-10) ── */}
        <Section title="招待状">
          <div className="grid grid-cols-4 gap-1">
            {([...TG_INVITATIONS] as string[]).map((inv) => {
              const sep = inv.indexOf(" - ");
              const name = sep !== -1 ? inv.slice(0, sep) : inv;
              const hint = sep !== -1 ? inv.slice(sep + 3) : "";
              return (
                <IconBtn
                  key={inv}
                  selected={form.invitation.includes(inv)}
                  onClick={() => toggleMulti("invitation", inv)}
                  color={getInvitationCellColor(inv)}
                  label={name}
                  subLabel={hint}
                />
              );
            })}
          </div>
        </Section>

        {/* ── 赫眼状態 (nd-12) ── */}
        <Section title="赫眼状態">
          <div className="grid grid-cols-4 gap-2">
            {([...TG_KAKUGAN] as string[]).map((k) => (
              <IconBtn
                key={k}
                selected={form.kakugan.includes(k)}
                onClick={() => toggleMulti("kakugan", k)}
                color={getKakuganCellColor(k)}
                label={k}
              />
            ))}
          </div>
        </Section>

        {/* ── 精神世界 (nd-14) ── */}
        <Section title="精神世界">
          <div className="grid grid-cols-3 gap-2">
            {([...TG_SHINSEKAI] as string[]).map((s) => (
              <IconBtn
                key={s}
                selected={form.shinsekai.includes(s)}
                onClick={() => toggleMulti("shinsekai", s)}
                color={getShinsekaiCellColor(s)}
                label={s}
              />
            ))}
          </div>
        </Section>

        {/* ── フリーメモ (nd-16) ── */}
        <Section title="フリーメモ">
          <textarea
            placeholder="メモを入力..."
            className="w-full border-2 border-gray-300 rounded px-2 py-2 text-[12px] font-mono focus:outline-none focus:border-gray-500 resize-none bg-white"
            rows={3}
            value={form.memo ?? ""}
            onChange={(e) => setField("memo", e.target.value || undefined)}
          />
        </Section>
      </div>

      {/* ===== 保存ボタン ===== */}
      <div className="flex-shrink-0 bg-white border-t-2 border-gray-400 safe-area-bottom px-4 py-3">
        <div className="flex gap-2">
          <button
            onClick={handleTempSave}
            className="flex-1 font-mono font-bold text-base py-5 rounded-xl border-2 border-gray-400 text-gray-700 bg-white active:scale-95 transition-transform"
          >
            一時保存
          </button>
          <button
            onClick={handleSave}
            className="flex-1 font-mono font-bold text-base py-5 rounded-xl shadow-lg active:scale-95 transition-transform text-white"
            style={{ backgroundColor: "#b91c1c" }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── ZenchoSlot (nd-9) ────────────────────────────────────────────────────────
// 上段: ゾーン数表示（グレー背景）/ 下段: タップで循環切替

const ZENCHO_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  "東京上空": { bg: "#c62828", color: "#ffffff" },
  "前兆":     { bg: "#1565c0", color: "#ffffff" },
};

function ZenchoSlot({ zone, value, onChange }: {
  zone: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const types: string[] = ["", ...TG_ZENCHO_TYPES];

  function cycle() {
    const idx = types.indexOf(value);
    onChange(types[(idx + 1) % types.length]);
  }

  const hasValue = value !== "";
  const col = hasValue ? ZENCHO_TYPE_COLORS[value] : null;

  return (
    <div
      className="flex flex-col rounded border-2 overflow-hidden"
      style={hasValue ? { borderColor: "#374151" } : { borderColor: "#e5e7eb" }}
    >
      {/* 上段: ゾーン数 */}
      <div
        className="text-center text-[9px] font-mono font-bold py-1 leading-none"
        style={{ backgroundColor: "#dde0e3", color: "#6b7280" }}
      >
        {zone}G
      </div>
      {/* 下段: タイプ表示 + タップ切替 */}
      <button
        onClick={cycle}
        className="flex items-center justify-center transition-colors active:opacity-80"
        style={{
          minHeight: "48px",
          backgroundColor: col ? col.bg : "#f9fafb",
          color: col ? col.color : "#d1d5db",
        }}
      >
        {hasValue ? (
          <span className="text-[8px] font-mono font-bold text-center leading-tight px-0.5">
            {value}
          </span>
        ) : (
          <span className="text-xl leading-none">⋄</span>
        )}
      </button>
    </div>
  );
}

// ─── 共通サブコンポーネント ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4">
      <p className="text-[10px] font-mono text-gray-500 font-bold mb-2 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

function FormCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-mono text-gray-500 font-medium">{label}</span>
      {children}
    </div>
  );
}

/**
 * ColoredSelectIcon — UIレギュレーション1準拠 単一選択コンポーネント
 * 外観: 色付きアイコンボタン / 動作: native picker (overlay select)
 */
function ColoredSelectIcon({
  value, onChange, options, colorFn, labelFn, emptyLabel = "未選択",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  colorFn: (v: string) => CellColor;
  labelFn?: (v: string) => string;
  emptyLabel?: string;
}) {
  const hasValue = value !== "" && value !== undefined;
  const color = hasValue ? colorFn(value) : null;
  const displayLabel = hasValue ? (labelFn ? labelFn(value) : value) : emptyLabel;

  return (
    <div className="relative rounded overflow-hidden" style={{ minHeight: "56px" }}>
      <div
        className="absolute inset-0 flex items-center justify-center gap-1 font-mono font-bold text-[11px] text-center px-1 pointer-events-none"
        style={
          color
            ? { ...color }
            : { backgroundColor: "#f3f4f6", color: "#9ca3af", border: "2px solid #e5e7eb" }
        }
      >
        <span className="truncate">{displayLabel}</span>
        <span className="text-[9px] opacity-50 shrink-0">▼</span>
      </div>
      <select
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "" ? emptyLabel : opt}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * IconBtn — UIレギュレーション1準拠 多択選択ボタン
 */
function IconBtn({
  selected, onClick, color, label, subLabel,
}: {
  selected: boolean;
  onClick: () => void;
  color: CellColor;
  label: string;
  subLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="py-3 rounded font-mono font-bold transition-all active:scale-95 text-center flex flex-col items-center justify-center"
      style={
        selected
          ? { ...color, boxShadow: "0 0 0 2px #1f2937" }
          : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }
      }
    >
      <span className="text-[10px] leading-tight">{label}</span>
      {subLabel && (
        <span className="text-[7px] opacity-75 mt-0.5 leading-tight text-center px-0.5">{subLabel}</span>
      )}
    </button>
  );
}
