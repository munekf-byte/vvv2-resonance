"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: AT記録 編集ダッシュボード v1.1
// SET行: 対決（契機+成績 統合10枠） / 直乗せ（契機+枚数 10枠）
// 有馬ジャッジメント行: 成否 / 役 / CCGの死神
// =============================================================================

import { useState } from "react";
import type { TGATRow, TGATSet, TGArimaJudgment, TGDirectAdd, TGBattle } from "@/types";
import {
  TG_AT_TYPES, TG_AT_CHARACTERS, TG_BATTLE_TRIGGERS,
  TG_DISADVANTAGE, TG_BITES_TYPES, TG_BITES_COINS,
  TG_DIRECT_ADD_TRIGGERS, TG_DIRECT_ADD_COINS,
  TG_ARIMA_RESULTS, TG_ARIMA_ROLES, TG_CCG_COINS,
  TG_MAX_BATTLE_RESULTS, TG_MAX_DIRECT_ADDS,
} from "@/lib/engine/constants";
import { getATCharColor, getBitesTypeCellColor, getBitesTypeShort } from "@/lib/tg/cellColors";

interface Props {
  atKey: string;
  row: TGATRow | null;
  defaultRowType?: "set" | "arima";
  onSave: (row: TGATRow) => void;
  onClose: () => void;
}

function emptySet(): Omit<TGATSet, "id"> {
  return {
    rowType: "set",
    atType: "通常AT",
    character: "",
    disadvantage: "-",
    bitesType: "",
    bitesCoins: "",
    directAdds: [],
    battles: [],
  };
}

function emptyArima(): Omit<TGArimaJudgment, "id"> {
  return { rowType: "arima", result: "", role: "", ccgCoins: null };
}

/** BITES種別の括弧内説明を抽出 */
function getBitesDesc(bt: string): string {
  const m = bt.match(/\[([^\]]+)\]/);
  return m ? m[1] : "";
}

// =============================================================================
// メインコンポーネント
// =============================================================================

export function ATBlockEditDashboard({ atKey, row, defaultRowType = "set", onSave, onClose }: Props) {
  const isNew    = row === null;
  const initType = row?.rowType ?? defaultRowType;
  const [rowType, setRowType] = useState<"set" | "arima">(initType);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-100">
      {/* ヘッダー */}
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
        <SetForm initial={row?.rowType === "set" ? row : null} onSave={onSave} />
      ) : (
        <ArimaForm initial={row?.rowType === "arima" ? row : null} onSave={onSave} />
      )}
    </div>
  );
}

// =============================================================================
// SET行フォーム
// =============================================================================

function SetForm({ initial, onSave }: { initial: TGATSet | null; onSave: (r: TGATRow) => void }) {
  const [form, setForm] = useState<Omit<TGATSet, "id">>(() =>
    initial ? { ...initial, battles: initial.battles ?? [], directAdds: initial.directAdds ?? [] }
            : emptySet()
  );

  function setField<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  // ── 対決スロット操作 ──────────────────────────────────────────────────────
  function setBattleTrigger(i: number, trigger: string) {
    const next = [...form.battles];
    next[i] = { trigger, result: next[i]?.result ?? "" };
    setField("battles", next.slice(0, TG_MAX_BATTLE_RESULTS));
  }

  function toggleBattleResult(i: number) {
    const next = [...form.battles];
    const cur = next[i]?.result ?? "";
    const nxt = cur === "" ? "×" : cur === "×" ? "○" : "";
    next[i] = { trigger: next[i]?.trigger ?? "", result: nxt };
    setField("battles", next.slice(0, TG_MAX_BATTLE_RESULTS));
  }

  // ── 直乗せスロット操作 ────────────────────────────────────────────────────
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

  function handleSave() {
    // 空スロットをトリム
    const battles    = form.battles.filter((b) => b.trigger || b.result);
    const directAdds = form.directAdds.filter((d) => d.trigger || d.coins != null);
    onSave({ id: initial?.id ?? crypto.randomUUID(), ...form, battles, directAdds });
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-32">

        {/* AT種別 */}
        <Section title="AT種別">
          <div className="flex gap-2">
            {TG_AT_TYPES.map((t) => (
              <button key={t} onClick={() => setField("atType", t)}
                className="flex-1 text-[10px] font-mono font-bold py-2.5 rounded border-2 transition-colors leading-tight text-center"
                style={
                  form.atType === t
                    ? t === "裏AT"
                      ? { backgroundColor: "#b91c1c", color: "#fff", borderColor: "#b91c1c" }
                      : t === "隠れ裏AT（推測）"
                      ? { backgroundColor: "#4a148c", color: "#fff", borderColor: "#4a148c" }
                      : { backgroundColor: "#374151", color: "#fff", borderColor: "#374151" }
                    : { backgroundColor: "#fff", color: "#9ca3af", borderColor: "#d1d5db" }
                }
              >{t}</button>
            ))}
          </div>
        </Section>

        {/* 敵キャラ */}
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

        {/* 不利益 */}
        <Section title="不利益">
          <div className="flex gap-2">
            {TG_DISADVANTAGE.map((d) => (
              <button key={d} onClick={() => setField("disadvantage", d)}
                className="flex-1 py-3 rounded text-[11px] font-mono font-bold border-2 transition-colors"
                style={
                  form.disadvantage === d
                    ? d === "不利益⭕️"
                      ? { backgroundColor: "#2e7d32", color: "#fff", borderColor: "#2e7d32" }
                      : d === "不利益❌"
                      ? { backgroundColor: "#c62828", color: "#fff", borderColor: "#c62828" }
                      : { backgroundColor: "#374151", color: "#f9fafb", borderColor: "#374151" }
                    : { backgroundColor: "#fff", color: "#9ca3af", borderColor: "#d1d5db" }
                }
              >{d}</button>
            ))}
          </div>
        </Section>

        {/* BITES種別 */}
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

        {/* BITES獲得 */}
        <Section title="BITES獲得">
          <div className="grid grid-cols-5 gap-2">
            {TG_BITES_COINS.map((c) => (
              <button key={c} onClick={() => setField("bitesCoins", String(c))}
                className="py-3 rounded text-[11px] font-mono font-bold border-2 transition-colors"
                style={
                  form.bitesCoins === String(c)
                    ? { backgroundColor: "#1f2937", color: "#f9fafb", borderColor: "#1f2937" }
                    : { backgroundColor: "#fff", color: "#374151", borderColor: "#d1d5db" }
                }
              >{c === "ED" ? "ED" : `${c}枚`}</button>
            ))}
          </div>
        </Section>

        {/* 対決（契機+成績 統合10枠） */}
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
            ↑ 上段: 対決契機を選択　下段: タップで × → ○ → 空
          </p>
        </Section>

        {/* 直乗せ（契機+枚数 10枠） */}
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
            ↑ 上段: 役を選択　下段: 獲得枚数を選択
          </p>
        </Section>
      </div>

      <SaveBar onSave={handleSave} color="#b91c1c" />
    </>
  );
}

// ─── BattleSlot ──────────────────────────────────────────────────────────────

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
      style={active ? { borderColor: "#374151" } : { borderColor: "#e5e7eb" }}
    >
      {/* スロット番号 */}
      <div className="text-center text-[8px] font-mono text-gray-400 pt-0.5 leading-none">
        {index + 1}
      </div>
      {/* 上段: 契機セレクト */}
      <select
        className="w-full text-[9px] font-mono border-0 border-b border-gray-200 bg-gray-50 text-center py-1.5 focus:outline-none"
        style={{ color: hasTrigger ? "#1f2937" : "#9ca3af" }}
        value={trigger}
        onChange={(e) => onTriggerChange(e.target.value)}
      >
        <option value="">—</option>
        {TG_BATTLE_TRIGGERS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {/* 下段: 成績トグル */}
      <button
        onClick={onResultToggle}
        className="flex-1 flex items-center justify-center py-2 text-sm font-bold transition-colors"
        style={
          result === "○"
            ? { backgroundColor: "#1b5e20", color: "#ffffff" }
            : result === "×"
            ? { backgroundColor: "#b71c1c", color: "#ffffff" }
            : { backgroundColor: "#f9fafb", color: "#d1d5db" }
        }
      >
        {result || "—"}
      </button>
    </div>
  );
}

// ─── DirectAddSlot ────────────────────────────────────────────────────────────

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
      style={active ? { borderColor: "#1565c0" } : { borderColor: "#e5e7eb" }}
    >
      <div className="text-center text-[8px] font-mono text-gray-400 pt-0.5 leading-none">
        {index + 1}
      </div>
      {/* 上段: 役 */}
      <select
        className="w-full text-[9px] font-mono border-0 border-b border-gray-200 bg-gray-50 text-center py-1.5 focus:outline-none"
        style={{ color: trigger ? "#1f2937" : "#9ca3af" }}
        value={trigger}
        onChange={(e) => onTriggerChange(e.target.value)}
      >
        <option value="">—</option>
        {TG_DIRECT_ADD_TRIGGERS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {/* 下段: 枚数 */}
      <select
        className="w-full text-[9px] font-mono border-0 bg-white text-center py-1.5 focus:outline-none"
        style={{ color: coins != null ? "#1565c0" : "#9ca3af", fontWeight: coins != null ? "bold" : "normal" }}
        value={coins ?? ""}
        onChange={(e) => onCoinsChange(e.target.value === "" ? null : Number(e.target.value))}
      >
        <option value="">—</option>
        {TG_DIRECT_ADD_COINS.map((c) => (
          <option key={c} value={c}>{c}枚</option>
        ))}
      </select>
    </div>
  );
}

// =============================================================================
// 有馬ジャッジメント フォーム
// =============================================================================

function ArimaForm({ initial, onSave }: { initial: TGArimaJudgment | null; onSave: (r: TGATRow) => void }) {
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
          <div className="flex gap-3">
            {TG_ARIMA_RESULTS.map((r) => (
              <button key={r} onClick={() => setField("result", r)}
                className="flex-1 py-5 rounded text-base font-mono font-black border-2 transition-colors"
                style={
                  form.result === r
                    ? r === "成功"
                      ? { backgroundColor: "#f9a825", color: "#000", borderColor: "#f9a825" }
                      : { backgroundColor: "#424242", color: "#fff", borderColor: "#424242" }
                    : { backgroundColor: "#fff", color: "#9ca3af", borderColor: "#d1d5db" }
                }
              >{r}</button>
            ))}
          </div>
        </Section>

        <Section title="役">
          <div className="flex gap-2">
            {TG_ARIMA_ROLES.map((r) => (
              <button key={r} onClick={() => setField("role", r)}
                className="flex-1 py-3 rounded text-[11px] font-mono font-bold border-2 transition-colors"
                style={
                  form.role === r
                    ? { backgroundColor: "#374151", color: "#fff", borderColor: "#374151" }
                    : { backgroundColor: "#fff", color: "#9ca3af", borderColor: "#d1d5db" }
                }
              >{r}</button>
            ))}
          </div>
        </Section>

        {form.result === "成功" && (
          <Section title="CCGの死神（獲得枚数）">
            <div className="flex gap-3">
              {TG_CCG_COINS.map((c) => (
                <button key={c}
                  onClick={() => setField("ccgCoins", form.ccgCoins === c ? null : c)}
                  className="flex-1 py-4 rounded text-sm font-mono font-bold border-2 transition-colors"
                  style={
                    form.ccgCoins === c
                      ? { backgroundColor: "#b91c1c", color: "#fff", borderColor: "#b91c1c" }
                      : { backgroundColor: "#fff", color: "#374151", borderColor: "#d1d5db" }
                  }
                >{c.toLocaleString()}枚</button>
              ))}
            </div>
          </Section>
        )}
      </div>

      <SaveBar
        onSave={() => onSave({ id: initial?.id ?? crypto.randomUUID(), ...form })}
        color="#f9a825"
        textColor="#000000"
        disabled={!form.result}
      />
    </>
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
  onSave, color, textColor = "#ffffff", disabled = false,
}: {
  onSave: () => void;
  color: string;
  textColor?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex-shrink-0 bg-white border-t-2 border-gray-400 safe-area-bottom px-4 py-3">
      <button
        onClick={onSave}
        disabled={disabled}
        className="w-full font-mono font-bold text-lg py-5 rounded-xl shadow-lg active:scale-95 transition-transform disabled:opacity-40"
        style={{ backgroundColor: color, color: textColor }}
      >
        保存
      </button>
    </div>
  );
}
