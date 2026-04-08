"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: AT記録 編集ダッシュボード v1.6
// SET行セクション順:
//   AT種別 → 敵キャラ → 対決 → 直乗せ → BITES種別 → BITES獲得
//   → 終了画面示唆 → トロフィー → エンディングカード
// 終了画面示唆: [終了画面] prefix のみ表示
// =============================================================================

import { useState } from "react";
import type { TGATRow, TGATSet, TGArimaJudgment, TGDirectAdd, TGBattle, TGEndingCard } from "@/types";
import {
  TG_AT_TYPES, TG_AT_CHARACTERS, TG_BATTLE_TRIGGERS,
  TG_BITES_TYPES, TG_BITES_COINS,
  TG_DIRECT_ADD_TRIGGERS, TG_DIRECT_ADD_COINS,
  TG_ARIMA_RESULTS, TG_ARIMA_ROLES, TG_CCG_COINS,
  TG_MAX_BATTLE_RESULTS, TG_MAX_DIRECT_ADDS,
  TG_ENDING_SUGGESTIONS, TG_TROPHIES,
  TG_ENDING_CARD_LABELS, TG_COPPER_CARD_TYPES, TG_CONFIRMED_CARD_TYPES,
} from "@/lib/engine/constants";
import {
  getATCharColor, getBitesTypeCellColor, getBitesTypeShort,
  getEndingCellColor, getTrophyCellColor, getSuggestionListLines,
  type CellColor,
} from "@/lib/tg/cellColors";

// AT側では [終了画面] prefix のみ
const ENDING_SUGGESTIONS_AT = TG_ENDING_SUGGESTIONS.filter((s) =>
  s.startsWith("[終了画面]")
);

// 終了画面示唆 → 画像ファイルマッピング
const ENDING_IMAGE_MAP: Record<string, string> = {
  "[終了画面] 金木研 - デフォルト":                          "/images/after_at/金木研.png",
  "[終了画面] 亜門鋼太朗＆真戸暁 - 奇数設定示唆":            "/images/after_at/亜門＆真戸.png",
  "[終了画面] 鈴屋什造＆篠原幸紀 - 偶数設定示唆":            "/images/after_at/鈴屋＆篠原.png",
  "[終了画面] 神代利世 - 設定1否定":                          "/images/after_at/神代利世.png",
  "[終了画面] 笛口雛実＆笛口リョーコ - 高設定示唆［弱］":     "/images/after_at/笛口親子.png",
  "[終了画面] 四方蓮示＆イトリ＆ウタ - 高設定示唆［強］":     "/images/after_at/四方＆イトリ＆ウタ.png",
  "[終了画面] 金木研＆霧嶋董香 - 設定4以上濃厚":              "/images/after_at/設定4以上濃厚.png",
  "[終了画面] あんていく全員集合 - 設定6濃厚":                "/images/after_at/設定6濃厚.png",
};

interface Props {
  atKey: string;
  row: TGATRow | null;
  defaultRowType?: "set" | "arima";
  defaultAtType?: string;
  onSave: (row: TGATRow) => void;
  onTempSave: (row: TGATRow) => void;
  onClose: () => void;
}

function emptyEndingCard(): TGEndingCard {
  return {
    whiteWeak: 0, whiteStrong: 0,
    blueWeak: 0,  blueStrong: 0,
    redWeak: 0,   redStrong: 0,
    copper1: 0, copper2: 0, copper3: 0, copper4: 0,
    confirmed1: 0, confirmed2: 0, confirmed3: 0, confirmed4: 0,
  };
}

function emptySet(defaultAtType?: string): Omit<TGATSet, "id"> {
  return {
    rowType: "set",
    atType: defaultAtType ?? "通常AT",
    character: "",
    disadvantage: "-",
    bitesType: "",
    bitesCoins: "",
    kakugan: [],
    endingSuggestion: "",
    trophy: "",
    endingCard: emptyEndingCard(),
    memo: "",
    directAdds: [],
    battles: [],
  };
}

function emptyArima(): Omit<TGArimaJudgment, "id"> {
  return { rowType: "arima", result: "", role: "", ccgCoins: null };
}

function getBitesDesc(bt: string): string {
  const m = bt.match(/\[([^\]]+)\]/);
  return m ? m[1] : "";
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export function ATBlockEditDashboard({ atKey, row, defaultRowType = "set", defaultAtType, onSave, onTempSave, onClose }: Props) {
  const isNew    = row === null;
  const initType = row?.rowType ?? defaultRowType;
  const [rowType, setRowType] = useState<"set" | "arima">(initType);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
      <div
        className="sticky top-0 flex-shrink-0 border-b-2 border-gray-500 safe-area-top shadow-sm"
        style={{ backgroundColor: "#1f2937" }}
      >
        <div className="flex items-center px-3 h-14 gap-2">
          <button
            onClick={onClose}
            className="text-[12px] font-mono text-gray-300 border border-gray-500 rounded px-3 py-1.5 flex-shrink-0 whitespace-nowrap hover:bg-gray-700"
          >
            一覧へ戻る
          </button>
          <p className="flex-1 text-[12px] font-mono font-bold text-white text-center truncate px-1">
            {atKey} — {isNew ? "新規追加" : "編集"}
          </p>
        </div>
        {isNew && (
          <div className="flex border-t border-gray-600">
            {(["set", "arima"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setRowType(t)}
                className="flex-1 py-2 text-[11px] font-mono font-bold transition-colors"
                style={
                  rowType === t
                    ? { backgroundColor: "#b91c1c", color: "#ffffff" }
                    : { backgroundColor: "#374151", color: "#9ca3af" }
                }
              >
                {t === "set" ? "SET行（喰種対決）" : "有馬ジャッジメント行"}
              </button>
            ))}
          </div>
        )}
      </div>

      {rowType === "set" ? (
        <SetForm initial={row?.rowType === "set" ? row : null} defaultAtType={defaultAtType} onSave={onSave} onTempSave={onTempSave} />
      ) : (
        <ArimaForm initial={row?.rowType === "arima" ? row : null} onSave={onSave} onTempSave={onTempSave} />
      )}
    </div>
  );
}

// =============================================================================
// SET行フォーム
// =============================================================================

function SetForm({ initial, defaultAtType, onSave, onTempSave }: {
  initial: TGATSet | null;
  defaultAtType?: string;
  onSave: (r: TGATRow) => void;
  onTempSave: (r: TGATRow) => void;
}) {
  const isAtTypeInherited = !!defaultAtType;
  const [form, setForm] = useState<Omit<TGATSet, "id">>(() =>
    initial
      ? {
          ...initial,
          battles:          initial.battles          ?? [],
          directAdds:       initial.directAdds        ?? [],
          kakugan:          initial.kakugan            ?? [],
          endingSuggestion: initial.endingSuggestion   ?? "",
          trophy:           initial.trophy             ?? "",
          endingCard:       initial.endingCard         ?? emptyEndingCard(),
          memo:             initial.memo               ?? "",
        }
      : emptySet(defaultAtType)
  );
  const [bitesFreeInput, setBitesFreeInput] = useState(() => {
    if (!initial?.bitesCoins) return "";
    const presets = TG_BITES_COINS.map(String);
    return presets.includes(initial.bitesCoins) ? "" : initial.bitesCoins;
  });

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function setEndingCardField(k: keyof TGEndingCard, v: string | number) {
    setForm((p) => ({
      ...p,
      endingCard: { ...(p.endingCard ?? emptyEndingCard()), [k]: v },
    }));
  }

  function setBattleTrigger(i: number, trigger: string) {
    const next = [...form.battles];
    next[i] = { trigger, result: next[i]?.result ?? "" };
    setField("battles", next.slice(0, TG_MAX_BATTLE_RESULTS));
  }

  function toggleBattleResult(i: number) {
    const next = [...form.battles];
    const cur  = next[i]?.result ?? "";
    const nxt  = cur === "" ? "×" : cur === "×" ? "○" : "";
    next[i] = { trigger: next[i]?.trigger ?? "", result: nxt };
    setField("battles", next.slice(0, TG_MAX_BATTLE_RESULTS));
  }

  function setDirectTrigger(i: number, trigger: string) {
    const next: TGDirectAdd[] = [...form.directAdds];
    next[i] = { id: next[i]?.id || crypto.randomUUID(), trigger, coins: next[i]?.coins ?? null };
    setField("directAdds", next.slice(0, TG_MAX_DIRECT_ADDS));
  }

  function setDirectCoins(i: number, coins: number | null) {
    const next: TGDirectAdd[] = [...form.directAdds];
    next[i] = { id: next[i]?.id || crypto.randomUUID(), trigger: next[i]?.trigger ?? "", coins };
    setField("directAdds", next.slice(0, TG_MAX_DIRECT_ADDS));
  }

  function buildRow(): TGATRow {
    const battles    = form.battles.filter((b) => b.trigger || b.result);
    const directAdds = form.directAdds.filter((d) => d.trigger || d.coins != null);
    return {
      id: initial?.id ?? crypto.randomUUID(),
      ...form,
      battles,
      directAdds,
      createdAt: (initial as TGATSet | null)?.createdAt ?? new Date().toISOString(),
    };
  }

  function handleSave()     { onSave(buildRow()); }
  function handleTempSave() { onTempSave(buildRow()); }

  const ec = form.endingCard ?? emptyEndingCard();

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-32">

        {/* AT種別 (ad-1) */}
        <Section title="AT種別">
          {isAtTypeInherited && (
            <div className="mb-2 px-2 py-1.5 rounded text-[9px] font-mono text-amber-700 bg-amber-50 border border-amber-300">
              前セットから「{form.atType}」を自動引継ぎ — 変更不要な場合はそのまま保存
            </div>
          )}
          <div className={`grid grid-cols-3 gap-2 transition-opacity ${isAtTypeInherited ? "opacity-50" : ""}`}>
            {TG_AT_TYPES.map((t) => (
              <button key={t} onClick={() => setField("atType", t)}
                className="py-4 rounded text-[10px] font-mono font-bold transition-all active:scale-95 text-center leading-tight"
                style={
                  form.atType === t
                    ? t === "裏AT"
                      ? { backgroundColor: "#b91c1c", color: "#fff", border: "2px solid #b91c1c", boxShadow: "0 0 0 2px #1f2937" }
                      : t === "隠れ裏AT（推測）"
                      ? { backgroundColor: "#4a148c", color: "#fff", border: "2px solid #4a148c", boxShadow: "0 0 0 2px #1f2937" }
                      : { backgroundColor: "#374151", color: "#fff", border: "2px solid #374151", boxShadow: "0 0 0 2px #1f2937" }
                    : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }
                }
              >{t}</button>
            ))}
          </div>
        </Section>

        {/* 敵キャラ (ad-3) */}
        <Section title="敵キャラ">
          <div className="grid grid-cols-4 gap-2">
            {TG_AT_CHARACTERS.map((c) => {
              const col = getATCharColor(c);
              const sel = form.character === c;
              return (
                <button key={c} onClick={() => setField("character", c)}
                  className="py-3 rounded text-[11px] font-mono font-bold transition-all active:scale-95"
                  style={sel ? { ...col, boxShadow: "0 0 0 2px #1f2937" }
                             : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }}
                >{c}</button>
              );
            })}
          </div>
        </Section>

        {/* 対決 (ad-5) */}
        <Section title="対決（契機 + 成績）">
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: TG_MAX_BATTLE_RESULTS }, (_, i) => {
              const battle = form.battles[i] ?? { trigger: "", result: "" };
              return (
                <BattleSlot
                  key={i}
                  index={i}
                  trigger={battle.trigger}
                  result={battle.result}
                  onTriggerChange={(v) => setBattleTrigger(i, v)}
                  onResultToggle={() => toggleBattleResult(i)}
                />
              );
            })}
          </div>
          <p className="text-[8px] text-gray-400 font-mono mt-1.5">
            上段: 対決契機を選択　下段: タップで × → ○ → 空
          </p>
        </Section>

        {/* 直乗せ (ad-7) */}
        <Section title="直乗せ（契機 + 枚数）">
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: TG_MAX_DIRECT_ADDS }, (_, i) => {
              const d = form.directAdds[i] ?? { id: "", trigger: "", coins: null };
              return (
                <DirectAddSlot
                  key={i}
                  index={i}
                  trigger={d.trigger}
                  coins={d.coins}
                  onTriggerChange={(v) => setDirectTrigger(i, v)}
                  onCoinsChange={(v) => setDirectCoins(i, v)}
                />
              );
            })}
          </div>
          <p className="text-[8px] text-gray-400 font-mono mt-1.5">
            上段: 役を選択　下段: 獲得枚数を選択
          </p>
        </Section>

        {/* BITES種別 (ad-9) */}
        <Section title="BITES種別">
          <div className="grid grid-cols-3 gap-2">
            {TG_BITES_TYPES.map((bt) => {
              const col  = getBitesTypeCellColor(bt);
              const sel  = form.bitesType === bt;
              const desc = getBitesDesc(bt);
              return (
                <button key={bt} onClick={() => setField("bitesType", bt)}
                  className="py-2 px-1 rounded leading-tight text-center transition-all active:scale-95 flex flex-col items-center"
                  style={sel ? { ...col, boxShadow: "0 0 0 2px #1f2937" }
                             : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }}
                >
                  <span className="text-[10px] font-mono font-bold">{getBitesTypeShort(bt)}</span>
                  {desc && <span className="text-[8px] font-mono opacity-75 mt-0.5">{desc}</span>}
                </button>
              );
            })}
          </div>
        </Section>

        {/* BITES獲得 (ad-11) */}
        <Section title="BITES獲得">
          <div className="grid grid-cols-5 gap-2 mb-3">
            {TG_BITES_COINS.map((c) => (
              <button key={c}
                onClick={() => {
                  setField("bitesCoins", String(c));
                  setBitesFreeInput("");
                }}
                className="py-3 rounded text-[11px] font-mono font-bold border-2 transition-colors"
                style={
                  form.bitesCoins === String(c) && !bitesFreeInput
                    ? { backgroundColor: "#1f2937", color: "#f9fafb", borderColor: "#1f2937" }
                    : { backgroundColor: "#fff", color: "#374151", borderColor: "#d1d5db" }
                }
              >{c === "ED" ? "ED" : `${c}枚`}</button>
            ))}
          </div>
          <div className="flex items-center gap-2 border-t border-gray-200 pt-3">
            <span className="text-[9px] font-mono text-gray-500 shrink-0">フリー入力</span>
            <input
              type="number"
              min={0}
              placeholder="枚数を直接入力"
              value={bitesFreeInput}
              onChange={(e) => {
                const v = e.target.value;
                setBitesFreeInput(v);
                setField("bitesCoins", v);
              }}
              className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-[12px] font-mono text-center focus:outline-none focus:border-gray-500"
            />
            <span className="text-[10px] font-mono text-gray-500 shrink-0">枚</span>
          </div>
        </Section>

        {/* 終了画面示唆 (nd-13) — 画像付きピッカー */}
        <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4">
          <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wide">終了画面示唆</span>
          <EndingImagePicker
            value={form.endingSuggestion ?? ""}
            onChange={(v) => setField("endingSuggestion", v)}
          />
        </div>

        {/* トロフィー (nd-14) — 画像付きピッカー */}
        <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4">
          <span className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wide">トロフィー</span>
          <TrophyImagePicker
            value={form.trophy ?? ""}
            onChange={(v) => setField("trophy", v)}
          />
        </div>

        {/* エンディングカード (ad-15) — アコーディオン */}
        <EndingCardAccordion ec={ec} setEndingCardField={setEndingCardField} />

        {/* フリーメモ */}
        <Section title="フリーメモ">
          <textarea
            value={form.memo ?? ""}
            onChange={(e) => setField("memo", e.target.value)}
            placeholder="AT記録に関するメモ…"
            className="w-full border border-gray-300 rounded px-3 py-2 text-[12px] font-mono focus:outline-none focus:border-gray-500 resize-none"
            rows={3}
          />
        </Section>
      </div>

      <SaveBar onTempSave={handleTempSave} onSave={handleSave} color="#b91c1c" />
    </>
  );
}

// ─── スロット共通高さ定数 ────────────────────────────────────────────────────
const SLOT_HALF_H = 40; // 縮小: 54 → 40px

// ─── SlotPickerButton ─────────────────────────────────────────────────────────
function SlotPickerButton({
  value, onChange, options, labelFn, optionLabelFn,
  height = SLOT_HALF_H,
  bgActive = "#374151", colorActive = "#ffffff",
  bgInactive = "#e8eaed", borderBottom,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  labelFn?: (v: string) => string;
  optionLabelFn?: (v: string) => string;
  height?: number;
  bgActive?: string;
  colorActive?: string;
  bgInactive?: string;
  borderBottom?: string;
}) {
  const hasValue = value !== "";
  const displayLabel = hasValue ? (labelFn ? labelFn(value) : value) : "—";
  return (
    <div className="relative overflow-hidden" style={{ minHeight: `${height}px` }}>
      <div
        className="absolute inset-0 flex items-center justify-center px-0.5 pointer-events-none"
        style={{
          backgroundColor: hasValue ? bgActive : bgInactive,
          color: hasValue ? colorActive : "#9ca3af",
          ...(borderBottom ? { borderBottom } : {}),
        }}
      >
        <span className="text-[8px] font-mono font-bold text-center leading-tight break-all line-clamp-3">
          {displayLabel}
        </span>
      </div>
      <select
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{optionLabelFn ? optionLabelFn(opt) : opt}</option>
        ))}
      </select>
    </div>
  );
}

// ─── BattleSlot (ad-6) — アンバー配色 ────────────────────────────────────────
function BattleSlot({
  index, trigger, result, onTriggerChange, onResultToggle,
}: {
  index: number;
  trigger: string;
  result: string;
  onTriggerChange: (v: string) => void;
  onResultToggle: () => void;
}) {
  const hasTrigger = !!trigger;
  const hasResult  = !!result;
  const active     = hasTrigger || hasResult;

  return (
    <div
      className="flex flex-col rounded border-2 overflow-hidden"
      style={active ? { borderColor: "#c2410c" } : { borderColor: "#fed7aa" }}
    >
      <div className="text-center text-[8px] font-mono py-0.5 leading-none"
        style={{ backgroundColor: "#ffedd5", color: "#c2410c" }}>
        {index + 1}
      </div>
      {/* 上段: 契機 */}
      <SlotPickerButton
        value={trigger}
        onChange={onTriggerChange}
        options={[...TG_BATTLE_TRIGGERS]}
        bgActive="#9a3412"
        colorActive="#ffffff"
        bgInactive="#fff7ed"
        borderBottom="2px solid #fdba74"
      />
      {/* 下段: 成績トグル */}
      <button
        onClick={onResultToggle}
        className="flex items-center justify-center font-bold transition-colors active:opacity-80"
        style={{
          minHeight: `${SLOT_HALF_H}px`,
          ...(result === "○"
            ? { backgroundColor: "#1b5e20", color: "#ffffff", fontSize: "18px" }
            : result === "×"
            ? { backgroundColor: "#b71c1c", color: "#ffffff", fontSize: "18px" }
            : { backgroundColor: "#fffbeb", color: "#c2410c", fontSize: "8px" }),
        }}
      >
        {result || "タップ\n切替え"}
      </button>
    </div>
  );
}

// ─── DirectAddSlot (ad-8) ─────────────────────────────────────────────────────
function DirectAddSlot({
  index, trigger, coins, onTriggerChange, onCoinsChange,
}: {
  index: number;
  trigger: string;
  coins: number | null;
  onTriggerChange: (v: string) => void;
  onCoinsChange: (v: number | null) => void;
}) {
  const active = !!trigger || coins != null;

  return (
    <div
      className="flex flex-col rounded border-2 overflow-hidden"
      style={active ? { borderColor: "#1565c0" } : { borderColor: "#bfdbfe" }}
    >
      <div className="text-center text-[8px] font-mono py-0.5 leading-none"
        style={{ backgroundColor: "#dde8f7", color: "#1565c0" }}>
        {index + 1}
      </div>
      <SlotPickerButton
        value={trigger}
        onChange={onTriggerChange}
        options={[...TG_DIRECT_ADD_TRIGGERS]}
        bgActive="#1565c0"
        colorActive="#ffffff"
        bgInactive="#dbeafe"
        borderBottom="2px solid #93c5fd"
      />
      <SlotPickerButton
        value={coins != null ? String(coins) : ""}
        onChange={(v) => onCoinsChange(v === "" ? null : Number(v))}
        options={TG_DIRECT_ADD_COINS.map(String)}
        labelFn={(v) => `${v}枚`}
        optionLabelFn={(v) => `${v}枚`}
        bgActive="#1e3a5f"
        colorActive="#93c5fd"
        bgInactive="#eff6ff"
      />
    </div>
  );
}

// =============================================================================
// 有馬ジャッジメント フォーム
// =============================================================================

function ArimaForm({ initial, onSave, onTempSave }: {
  initial: TGArimaJudgment | null;
  onSave: (r: TGATRow) => void;
  onTempSave: (r: TGATRow) => void;
}) {
  const [form, setForm] = useState<Omit<TGArimaJudgment, "id">>(() =>
    initial ? { ...initial } : emptyArima()
  );

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-32">
        <Section title="成否">
          <div className="grid grid-cols-2 gap-3">
            {TG_ARIMA_RESULTS.map((r) => (
              <button key={r} onClick={() => setField("result", r)}
                className="py-6 rounded text-base font-mono font-black transition-all active:scale-95 text-center"
                style={
                  form.result === r
                    ? r === "成功"
                      ? { backgroundColor: "#f9a825", color: "#000", border: "2px solid #f9a825", boxShadow: "0 0 0 2px #1f2937" }
                      : { backgroundColor: "#424242", color: "#fff", border: "2px solid #424242", boxShadow: "0 0 0 2px #1f2937" }
                    : { backgroundColor: "#f3f4f6", color: "#9ca3af", border: "2px solid #e5e7eb" }
                }
              >{r}</button>
            ))}
          </div>
        </Section>

        <Section title="役">
          <div className="grid grid-cols-3 gap-2">
            {TG_ARIMA_ROLES.map((r) => (
              <button key={r} onClick={() => setField("role", r)}
                className="py-4 rounded text-[11px] font-mono font-bold transition-all active:scale-95 text-center"
                style={
                  form.role === r
                    ? { backgroundColor: "#374151", color: "#fff", border: "2px solid #374151", boxShadow: "0 0 0 2px #1f2937" }
                    : { backgroundColor: "#f3f4f6", color: "#9ca3af", border: "2px solid #e5e7eb" }
                }
              >{r}</button>
            ))}
          </div>
        </Section>

        <Section title="CCGの死神（獲得枚数）">
          <p className="text-[9px] font-mono text-gray-400 mb-2">
            ジャッジメント成功時に権利獲得。獲得枚数を選択してください。
          </p>
          <div className="grid grid-cols-3 gap-3">
            {TG_CCG_COINS.map((c) => (
              <button key={c}
                onClick={() => setField("ccgCoins", form.ccgCoins === c ? null : c)}
                className="py-5 rounded text-sm font-mono font-bold transition-all active:scale-95 text-center"
                style={
                  form.ccgCoins === c
                    ? { backgroundColor: "#b91c1c", color: "#fff", border: "2px solid #b91c1c", boxShadow: "0 0 0 2px #1f2937" }
                    : { backgroundColor: "#f3f4f6", color: "#374151", border: "2px solid #e5e7eb" }
                }
              >{c.toLocaleString()}枚</button>
            ))}
          </div>
        </Section>
      </div>

      <SaveBar
        onTempSave={() => onTempSave({ id: initial?.id ?? crypto.randomUUID(), ...form, createdAt: initial?.createdAt ?? new Date().toISOString() })}
        onSave={() => onSave({ id: initial?.id ?? crypto.randomUUID(), ...form, createdAt: initial?.createdAt ?? new Date().toISOString() })}
        color="#f9a825"
        textColor="#000000"
        disabled={!form.result}
      />
    </>
  );
}

// ─── EndingCardCounter (ad-16〜21) ────────────────────────────────────────────

// エンディングカード → 画像マッピング
const ENDING_CARD_IMAGE_MAP: Record<string, string> = {
  whiteWeak:  "/images/ending_card/奇数設定示唆（弱）.png",
  whiteStrong: "/images/ending_card/奇数設定示唆（強）.png",
  blueWeak:   "/images/ending_card/偶数設定示唆（弱）.png",
  blueStrong: "/images/ending_card/偶数設定示唆（強）.png",
  redWeak:    "/images/ending_card/高設定示唆（弱）.png",
  redStrong:  "/images/ending_card/高設定示唆（強）.png",
  copper1:    "/images/ending_card/設定1否定.png",
  copper2:    "/images/ending_card/設定2否定.png",
  copper3:    "/images/ending_card/設定3否定.png",
  copper4:    "/images/ending_card/設定4否定.png",
  confirmed1: "/images/ending_card/設定3以上濃厚.png",
  confirmed2: "/images/ending_card/設定4以上濃厚.png",
  confirmed3: "/images/ending_card/設定5以上濃厚.png",
  confirmed4: "/images/ending_card/設定6濃厚.png",
};

function EndingCardCounter({
  label, color, textColor, value, onChange, characters, rainbow, cardKey,
}: {
  label: string;
  color: string;
  textColor: string;
  value: number;
  onChange: (v: number) => void;
  characters: readonly string[];
  rainbow?: boolean;
  cardKey?: string;
}) {
  const imgSrc = cardKey ? ENDING_CARD_IMAGE_MAP[cardKey] : undefined;
  const isWideImage = cardKey && ["whiteWeak", "whiteStrong", "blueWeak", "blueStrong", "redWeak", "redStrong"].includes(cardKey);

  return (
    <div
      className="rounded border-2 overflow-hidden"
      style={{ borderColor: color }}
    >
      {/* 横長画像（白/青/赤カード） */}
      {isWideImage && imgSrc && (
        <img
          src={imgSrc}
          alt={label}
          className="w-full object-cover"
          style={{ maxHeight: "72px" }}
        />
      )}

      <div className="flex items-stretch gap-2 p-2">
        {/* 単独画像サムネイル（銅/確定カード） */}
        {!isWideImage && imgSrc && (
          <img
            src={imgSrc}
            alt={label}
            className="w-11 h-11 rounded object-cover flex-shrink-0 self-center"
          />
        )}

        {/* PUSH / − / 回数 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onChange(value + 1)}
            className="w-11 h-11 rounded-full font-mono font-black text-[10px] active:scale-95 transition-transform shadow-sm"
            style={{ backgroundColor: "#c8e6c9", color: "#1b5e20" }}
          >
            PUSH
          </button>
          <button
            onClick={() => onChange(Math.max(0, value - 1))}
            className="w-11 h-11 rounded-full font-mono font-black text-base active:scale-95 transition-transform shadow-sm"
            style={{ backgroundColor: "#fce4ec", color: "#880e4f" }}
          >
            −
          </button>
          <div
            className="w-12 h-11 rounded border-2 flex items-center justify-center font-mono font-bold"
            style={{
              borderColor: value > 0 ? color : "#e5e7eb",
              backgroundColor: value > 0 ? "#1f2937" : "#f9fafb",
              color: value > 0 ? "#ffffff" : "#9ca3af",
            }}
          >
            <span className="text-sm">{value}</span>
            <span className="text-[8px] ml-0.5">回</span>
          </div>
        </div>
        {/* カード情報 */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <p
            className="text-[9px] font-mono font-bold leading-tight px-1 py-0.5 rounded"
            style={rainbow
              ? { background: "linear-gradient(90deg,#ef4444,#f59e0b,#22c55e,#3b82f6,#8b5cf6,#ec4899)", color: "#fff" }
              : { backgroundColor: color, color: textColor }
            }
          >
            {label}
          </p>
          {characters.length > 0 && (
            <p className="text-[8px] font-mono text-gray-400 leading-snug mt-0.5 px-0.5">
              {characters.join("　")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TrophyImagePicker (トロフィー 画像付きモーダル) ──────────────────────────

const TROPHY_IMAGE_MAP: Record<string, string> = {
  "[終了画面] 銅トロフィー - 設定2以上濃厚":      "/images/trophy/銅トロフィー.webp",
  "[終了画面] 銀トロフィー - 設定3以上濃厚":      "/images/trophy/銀トロフィー.webp",
  "[終了画面] 金トロフィー - 設定4以上濃厚":      "/images/trophy/金トロフィー.webp",
  "[終了画面] 喰種柄トロフィー - 設定5以上濃厚":  "/images/trophy/喰トロフィー.webp",
  "[終了画面] 虹トロフィー - 設定6濃厚":          "/images/trophy/虹トロフィー.webp",
  "[終了画面] 黒トロフィー - 次回トロフィー出現濃厚": "/images/trophy/黒トロフィー.webp",
};

function TrophyImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const hasValue = value !== "";
  const color = hasValue ? getTrophyCellColor(value) : null;
  const lines = hasValue ? getSuggestionListLines(value) : null;
  const imgSrc = hasValue ? TROPHY_IMAGE_MAP[value] : null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded overflow-hidden active:scale-95 transition-transform"
        style={{ minHeight: "56px", border: "2px solid #374151" }}
      >
        {hasValue ? (
          <div className="flex items-center gap-2 px-2 py-1.5" style={color ?? {}}>
            {imgSrc && (
              <img src={imgSrc} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
            )}
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[11px] font-mono font-bold truncate w-full text-left">{lines?.name ?? value}</span>
              {lines?.hint && <span className="text-[9px] font-mono opacity-70 truncate w-full text-left">{lines.hint}</span>}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-14" style={{ backgroundColor: "#f3f4f6", color: "#9ca3af" }}>
            <span className="text-[11px] font-mono">タップして選択</span>
          </div>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 flex items-end justify-center"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80dvh] flex flex-col safe-area-bottom">
            <div className="px-4 py-3 border-b border-gray-300 flex items-center justify-between">
              <p className="text-sm font-mono font-bold text-gray-700">トロフィーを選択</p>
              <button onClick={() => setOpen(false)} className="text-xs font-mono text-gray-400 px-2 py-1">閉じる</button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                className="w-full rounded-lg py-3 text-center font-mono text-sm active:scale-95 transition-transform"
                style={!hasValue
                  ? { backgroundColor: "#1f2937", color: "#fff", boxShadow: "0 0 0 2px #1f2937" }
                  : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db" }
                }
              >
                なし
              </button>
              {TG_TROPHIES.map((opt) => {
                const optLines = getSuggestionListLines(opt);
                const optColor = getTrophyCellColor(opt);
                const optImg = TROPHY_IMAGE_MAP[opt];
                const isSelected = value === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => { onChange(opt); setOpen(false); }}
                    className="w-full rounded-lg overflow-hidden active:scale-95 transition-transform"
                    style={{
                      border: isSelected ? "none" : "1px solid #d1d5db",
                      boxShadow: isSelected ? "0 0 0 2px #1f2937" : "none",
                    }}
                  >
                    <div className="flex items-center gap-3 px-3 py-2" style={optColor}>
                      {optImg && (
                        <img src={optImg} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="text-[12px] font-mono font-bold truncate w-full text-left">{optLines?.name ?? opt}</span>
                        {optLines?.hint && <span className="text-[10px] font-mono opacity-80 truncate w-full text-left">{optLines.hint}</span>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── EndingCardAccordion (エンディングカード アコーディオン) ──────────────────

function EndingCardAccordion({
  ec, setEndingCardField,
}: {
  ec: TGEndingCard;
  setEndingCardField: (k: keyof TGEndingCard, v: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // 入力済みカード数を集計
  const totalCount = Object.values(ec).reduce((sum, v) => sum + (typeof v === "number" ? v : 0), 0);

  return (
    <div className="bg-white rounded border border-gray-400 overflow-hidden">
      {/* トグルボタン */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3.5 active:scale-[0.98] transition-transform"
        style={{
          background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-white font-mono font-bold text-sm">エンディングカード入力</span>
          {totalCount > 0 && (
            <span className="bg-white/20 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
              {totalCount}枚記録済
            </span>
          )}
        </div>
        <span className="text-white text-sm font-bold">{expanded ? "▲" : "▼"}</span>
      </button>

      {/* アコーディオン中身 */}
      {expanded && (
        <div className="px-3 pt-3 pb-4">
          {/* 白/青/赤 カード */}
          <div className="space-y-2">
            {TG_ENDING_CARD_LABELS.map(({ key, label, color, textColor, characters }) => (
              <EndingCardCounter
                key={key}
                cardKey={key}
                label={label}
                color={color}
                textColor={textColor}
                value={(ec[key as keyof TGEndingCard] as number) ?? 0}
                characters={characters}
                onChange={(v) => setEndingCardField(key as keyof TGEndingCard, v)}
              />
            ))}
          </div>

          {/* 銅カード */}
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            <p className="text-[9px] font-mono font-bold text-gray-500 mb-1">【銅カード】</p>
            {TG_COPPER_CARD_TYPES.map(({ key, label, character, color, textColor }) => (
              <EndingCardCounter
                key={key}
                cardKey={key}
                label={`${label} — ${character}`}
                color={color}
                textColor={textColor}
                value={(ec[key as keyof TGEndingCard] as number) ?? 0}
                characters={[]}
                onChange={(v) => setEndingCardField(key as keyof TGEndingCard, v)}
              />
            ))}
          </div>

          {/* 確定カード */}
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
            <p className="text-[9px] font-mono font-bold text-gray-500 mb-1">【確定カード】</p>
            {TG_CONFIRMED_CARD_TYPES.map(({ key, label, character, color, textColor, rainbow }) => (
              <EndingCardCounter
                key={key}
                cardKey={key}
                label={`${label} — ${character}`}
                color={color}
                textColor={textColor}
                value={(ec[key as keyof TGEndingCard] as number) ?? 0}
                characters={[]}
                onChange={(v) => setEndingCardField(key as keyof TGEndingCard, v)}
                rainbow={rainbow}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EndingImagePicker (終了画面示唆 画像付きグリッド) ────────────────────────

function EndingImagePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const hasValue = value !== "";
  const color = hasValue ? getEndingCellColor(value) : null;
  const lines = hasValue ? getSuggestionListLines(value) : null;
  const imgSrc = hasValue ? ENDING_IMAGE_MAP[value] : null;

  return (
    <>
      {/* 現在の選択値を表示するボタン */}
      <button
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded overflow-hidden active:scale-95 transition-transform"
        style={{ minHeight: "56px", border: "2px solid #374151" }}
      >
        {hasValue ? (
          <div className="flex items-center gap-2 px-2 py-1.5" style={color ?? {}}>
            {imgSrc && (
              <img src={imgSrc} alt="" className="w-10 h-10 rounded object-cover flex-shrink-0" />
            )}
            <div className="flex flex-col items-start min-w-0 flex-1">
              <span className="text-[11px] font-mono font-bold truncate w-full text-left">{lines?.name ?? value}</span>
              {lines?.hint && <span className="text-[9px] font-mono opacity-70 truncate w-full text-left">{lines.hint}</span>}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-14" style={{ backgroundColor: "#f3f4f6", color: "#9ca3af" }}>
            <span className="text-[11px] font-mono">タップして選択</span>
          </div>
        )}
      </button>

      {/* 選択モーダル */}
      {open && (
        <div
          className="fixed inset-0 z-[70] bg-black/60 flex items-end justify-center"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[80dvh] flex flex-col safe-area-bottom">
            <div className="px-4 py-3 border-b border-gray-300 flex items-center justify-between">
              <p className="text-sm font-mono font-bold text-gray-700">終了画面示唆を選択</p>
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-mono text-gray-400 px-2 py-1"
              >
                閉じる
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {/* なし */}
              <button
                onClick={() => { onChange(""); setOpen(false); }}
                className="w-full rounded-lg py-3 text-center font-mono text-sm active:scale-95 transition-transform"
                style={
                  !hasValue
                    ? { backgroundColor: "#1f2937", color: "#fff", boxShadow: "0 0 0 2px #1f2937" }
                    : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #d1d5db" }
                }
              >
                なし
              </button>

              {/* 画像付き選択肢 */}
              {ENDING_SUGGESTIONS_AT.map((opt) => {
                const optLines = getSuggestionListLines(opt);
                const optColor = getEndingCellColor(opt);
                const optImg = ENDING_IMAGE_MAP[opt];
                const isSelected = value === opt;

                return (
                  <button
                    key={opt}
                    onClick={() => { onChange(opt); setOpen(false); }}
                    className="w-full rounded-lg overflow-hidden active:scale-95 transition-transform"
                    style={{
                      border: isSelected ? "none" : "1px solid #d1d5db",
                      boxShadow: isSelected ? "0 0 0 2px #1f2937" : "none",
                    }}
                  >
                    <div className="flex items-center gap-3 px-3 py-2" style={optColor}>
                      {optImg && (
                        <img src={optImg} alt="" className="w-14 h-14 rounded object-cover flex-shrink-0" />
                      )}
                      <div className="flex flex-col items-start min-w-0 flex-1">
                        <span className="text-[12px] font-mono font-bold truncate w-full text-left">
                          {optLines?.name ?? opt}
                        </span>
                        {optLines?.hint && (
                          <span className="text-[10px] font-mono opacity-80 truncate w-full text-left">
                            {optLines.hint}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── PickerCell (トロフィー用) ────────────────────────────────────────────────
function PickerCell({
  value, onChange, options, colorFn, labelFn, emptyLabel = "なし",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  colorFn: (v: string) => CellColor;
  labelFn?: (v: string) => string;
  emptyLabel?: string;
}) {
  const hasValue = value !== "";
  const color = hasValue ? colorFn(value) : null;
  const displayLabel = hasValue ? (labelFn ? labelFn(value) : value) : emptyLabel;

  return (
    <div className="relative rounded overflow-hidden" style={{ minHeight: "56px" }}>
      <div
        className="absolute inset-0 flex items-center justify-center gap-1 font-mono font-bold text-[11px] text-center px-1 pointer-events-none"
        style={color ? { ...color } : { backgroundColor: "#f3f4f6", color: "#9ca3af", border: "2px solid #e5e7eb" }}
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
          <option key={opt} value={opt}>{opt === "" ? emptyLabel : opt}</option>
        ))}
      </select>
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

function SaveBar({
  onTempSave, onSave, color, textColor = "#ffffff", disabled = false,
}: {
  onTempSave: () => void;
  onSave: () => void;
  color: string;
  textColor?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex-shrink-0 bg-white border-t-2 border-gray-400 safe-area-bottom px-4 py-3">
      <div className="flex gap-2">
        <button
          onClick={onTempSave}
          disabled={disabled}
          className="flex-1 font-mono font-bold text-base py-5 rounded-xl border-2 border-gray-400 text-gray-700 bg-white active:scale-95 transition-transform disabled:opacity-40"
        >
          一時保存
        </button>
        <button
          onClick={onSave}
          disabled={disabled}
          className="flex-1 font-mono font-bold text-base py-5 rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-40"
          style={{ backgroundColor: color, color: textColor }}
        >
          保存
        </button>
      </div>
    </div>
  );
}
