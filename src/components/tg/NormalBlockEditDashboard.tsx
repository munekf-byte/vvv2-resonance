"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時周期 編集ダッシュボード
// フォーム要素: 全て 2倍以上の縦幅 / カラーインジケータ付きセレクト
// 保存ボタン: 最下部 全幅・大
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
  getSuggestionDropdownLabel, getHintFromValue,
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

const MULTI_SLOTS = 4; // 赫眼・精神世界・招待状 それぞれ4スロット

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

function setAt(arr: string[], index: number, value: string): string[] {
  const next = [...arr];
  if (value === "") {
    next.splice(index, 1);
  } else {
    next[index] = value;
  }
  return next.filter((v) => v !== "");
}

// ─── メインコンポーネント ──────────────────────────────────────────────────────

export function NormalBlockEditDashboard({ block, blockIndex, onSave, onTempSave, onClose }: Props) {
  const isNew = block === null;
  const [form, setForm] = useState<FormState>(() =>
    block ? { ...block } : emptyForm()
  );

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setArraySlot(
    field: "kakugan" | "shinsekai" | "invitation" | "zencho",
    index: number,
    value: string
  ) {
    setField(field, setAt(form[field] as string[], index, value));
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

        {/* ── メインフォームグリッド ── */}
        <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4 space-y-4">

          {/* Row 1: 実G数 / ゾーン / 推定モード */}
          <div className="grid grid-cols-3 gap-3">
            <FormCell label="実G数">
              <input
                type="number"
                inputMode="numeric"
                placeholder="G数"
                className="w-full text-sm font-mono border-2 border-gray-300 rounded px-3 py-3 focus:outline-none focus:border-gray-500 bg-white"
                value={form.jisshuG ?? ""}
                onChange={(e) =>
                  setField("jisshuG", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </FormCell>
            <FormCell label="ゾーン">
              <ColoredSel
                value={form.zone}
                onChange={(v) => setField("zone", v)}
                options={[...TG_ZONES]}
                colorFn={getZoneCellColor}
              />
            </FormCell>
            <FormCell label="推定モード">
              <ColoredSel
                value={form.estimatedMode}
                onChange={(v) => setField("estimatedMode", v)}
                options={[...TG_MODES]}
                colorFn={getModeCellColor}
                labelFn={(v) => v === "不明" ? v : v.split(":")[0].trim()}
              />
            </FormCell>
          </div>

          {/* Row 2: 当選契機 / イベント / AT初当り */}
          <div className="grid grid-cols-3 gap-3">
            <FormCell label="当選契機">
              <ColoredSel
                value={form.winTrigger}
                onChange={(v) => setField("winTrigger", v)}
                options={[...TG_WIN_TRIGGERS]}
                colorFn={getTriggerCellColor}
              />
            </FormCell>
            <FormCell label="イベント">
              <ColoredSel
                value={form.event}
                onChange={(v) => setField("event", v)}
                options={["", ...TG_EVENTS]}
                colorFn={getEventCellColor}
                emptyLabel="なし"
              />
            </FormCell>
            <FormCell label="AT初当り">
              <button
                onClick={() => setField("atWin", !form.atWin)}
                className="w-full text-sm font-mono font-bold py-3 rounded border-2 transition-colors"
                style={
                  form.atWin
                    ? { backgroundColor: "#38761d", color: "#ffffff", borderColor: "#38761d" }
                    : { backgroundColor: "#ffffff", color: "#9ca3af", borderColor: "#d1d5db" }
                }
              >
                {form.atWin ? "AT Get ✓" : "なし"}
              </button>
            </FormCell>
          </div>

          {/* Row 3: 終了画面示唆 / トロフィー */}
          <div className="grid grid-cols-2 gap-3">
            <FormCell label="終了画面示唆">
              <ColoredSel
                value={form.endingSuggestion}
                onChange={(v) => setField("endingSuggestion", v)}
                options={["", ...TG_ENDING_SUGGESTIONS]}
                colorFn={getEndingCellColor}
                emptyLabel="なし"
                labelFn={(v) => v ? getSuggestionDropdownLabel(v) : "なし"}
              />
            </FormCell>
            <FormCell label="トロフィー">
              <ColoredSel
                value={form.trophy}
                onChange={(v) => setField("trophy", v)}
                options={["", ...TG_TROPHIES]}
                colorFn={getTrophyCellColor}
                emptyLabel="なし"
                labelFn={(v) => v ? getSuggestionDropdownLabel(v) : "なし"}
              />
            </FormCell>
          </div>
        </div>

        {/* ── 前兆履歴 (ゾーン別スロット) ── */}
        <ZenchoSection
          values={form.zencho}
          onChange={(next) => setField("zencho", next)}
        />

        {/* ── 赫眼状態 (4スロット) ── */}
        <MultiSelectSection
          title="赫眼状態"
          titleColor={{ backgroundColor: "#b10202", color: "#ffffff" }}
          options={[...TG_KAKUGAN]}
          values={form.kakugan}
          slots={MULTI_SLOTS}
          onChange={(i, v) => setArraySlot("kakugan", i, v)}
          colorFn={getKakuganCellColor}
        />

        {/* ── 精神世界 (4スロット) ── */}
        <MultiSelectSection
          title="精神世界"
          titleColor={{ backgroundColor: "#5a3286", color: "#ffffff" }}
          options={[...TG_SHINSEKAI]}
          values={form.shinsekai}
          slots={MULTI_SLOTS}
          onChange={(i, v) => setArraySlot("shinsekai", i, v)}
          colorFn={getShinsekaiCellColor}
        />

        {/* ── 招待状 (4スロット) ── */}
        <MultiSelectSection
          title="招待状"
          titleColor={{ backgroundColor: "#7c3aed", color: "#ffffff" }}
          options={[...TG_INVITATIONS]}
          values={form.invitation}
          slots={MULTI_SLOTS}
          onChange={(i, v) => setArraySlot("invitation", i, v)}
        />
      </div>

      {/* ===== 保存ボタン (最下部・2分割) ===== */}
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

// ─── ZenchoSection ───────────────────────────────────────────────────────────
// ゾーンごとの固定スロット。各ゾーンに「-」「前兆」「東京上空」を選択。
// 格納フォーマット: "ゾーン:タイプ" (例: "100:東京上空")

function ZenchoSection({
  values, onChange,
}: {
  values: string[];
  onChange: (next: string[]) => void;
}) {
  // values → ゾーンキーのマップ
  const zoneMap: Record<string, string> = {};
  for (const v of values) {
    const col = v.indexOf(":");
    if (col !== -1) zoneMap[v.slice(0, col)] = v.slice(col + 1);
  }

  function handleChange(zone: string, type: string) {
    const filtered = values.filter((v) => !v.startsWith(zone + ":"));
    onChange(type ? [...filtered, `${zone}:${type}`] : filtered);
  }

  return (
    <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4">
      <span
        className="inline-block text-[11px] font-mono font-bold px-3 py-1 rounded mb-3"
        style={{ backgroundColor: "#ef4444", color: "#ffffff" }}
      >
        前兆履歴
      </span>
      <div className="grid grid-cols-3 gap-2">
        {([...TG_ZENCHO_ZONES] as string[]).map((zone) => {
          const current = zoneMap[zone] ?? "";
          return (
            <div key={zone} className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-gray-500 text-center font-bold">
                {zone}
              </span>
              <select
                className="w-full text-sm font-mono border-2 border-gray-300 rounded px-1 py-3 focus:outline-none focus:border-gray-500 bg-white text-center"
                value={current}
                onChange={(e) => handleChange(zone, e.target.value)}
              >
                <option value="">-</option>
                {([...TG_ZENCHO_TYPES] as string[]).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MultiSelectSection ───────────────────────────────────────────────────────

interface MultiSelectSectionProps {
  title: string;
  titleColor: CellColor;
  options: readonly string[];
  values: string[];
  slots: number;
  onChange: (index: number, value: string) => void;
  colorFn?: (v: string) => CellColor;
}

function MultiSelectSection({
  title, titleColor, options, values, slots, onChange, colorFn,
}: MultiSelectSectionProps) {
  const slotValues = Array.from({ length: slots }, (_, i) => values[i] ?? "");

  return (
    <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4">
      <span
        className="inline-block text-[11px] font-mono font-bold px-3 py-1 rounded mb-3"
        style={titleColor}
      >
        {title}
      </span>
      <div className="flex flex-col gap-2">
        {slotValues.map((val, i) => {
          const indicatorColor = val && colorFn ? colorFn(val) : null;
          return (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-gray-400 w-5 text-right flex-shrink-0">
                {i + 1}.
              </span>
              <div className="flex-1">
                {indicatorColor && (
                  <div
                    className="text-[9px] font-mono px-2 py-0.5 rounded-t truncate"
                    style={indicatorColor}
                  >
                    {val}
                  </div>
                )}
                <select
                  className="w-full text-sm font-mono border-2 border-gray-300 rounded px-2 py-3 focus:outline-none focus:border-gray-500 bg-white"
                  style={indicatorColor ? { borderRadius: "0 0 0.375rem 0.375rem" } : {}}
                  value={val}
                  onChange={(e) => onChange(i, e.target.value)}
                >
                  <option value="">なし</option>
                  {options.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── ColoredSel ──────────────────────────────────────────────────────────────

function ColoredSel({
  value, onChange, options, colorFn, emptyLabel, labelFn,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  colorFn: (v: string) => CellColor;
  emptyLabel?: string;
  labelFn?: (v: string) => string;
}) {
  const indicatorColor = value ? colorFn(value) : null;
  const hint = value ? getHintFromValue(value) : null;

  return (
    <div>
      {indicatorColor && (
        <div
          className="text-[10px] font-mono px-2 py-1 rounded-t text-center truncate font-medium"
          style={indicatorColor}
        >
          {hint ?? value}
        </div>
      )}
      <select
        className="w-full text-sm font-mono border-2 border-gray-300 px-2 py-3 focus:outline-none focus:border-gray-500 bg-white"
        style={{
          ...(indicatorColor ? { borderRadius: "0 0 0.375rem 0.375rem" } : { borderRadius: "0.375rem" }),
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "" ? (emptyLabel ?? "なし") : (labelFn ? labelFn(opt) : opt)}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── FormCell ────────────────────────────────────────────────────────────────

function FormCell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-mono text-gray-500 font-medium">{label}</span>
      {children}
    </div>
  );
}
