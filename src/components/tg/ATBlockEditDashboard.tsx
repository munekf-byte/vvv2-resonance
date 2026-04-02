"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: AT記録 編集ダッシュボード
// SET行 / 有馬ジャッジメント行 の2モード切替
// =============================================================================

import { useState } from "react";
import type { TGATRow, TGATSet, TGArimaJudgment, TGDirectAdd } from "@/types";
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
  row: TGATRow | null;          // null = 新規
  defaultRowType?: "set" | "arima";
  onSave: (row: TGATRow) => void;
  onClose: () => void;
}

// ─── SET行 初期値 ─────────────────────────────────────────────────────────────

function emptySet(): Omit<TGATSet, "id"> {
  return {
    rowType: "set",
    atType: "通常AT",
    character: "",
    battleTrigger: "",
    disadvantage: "-",
    bitesType: "",
    bitesCoins: "",
    directAdds: [],
    battleResults: [],
  };
}

function emptyArima(): Omit<TGArimaJudgment, "id"> {
  return {
    rowType: "arima",
    result: "",
    role: "",
    ccgCoins: null,
  };
}

// ─── メインコンポーネント ─────────────────────────────────────────────────────

export function ATBlockEditDashboard({ atKey, row, defaultRowType = "set", onSave, onClose }: Props) {
  const isNew      = row === null;
  const initType   = row?.rowType ?? defaultRowType;
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
            className="text-[12px] font-mono text-gray-300 border border-gray-500 rounded px-3 py-1.5 flex-shrink-0 whitespace-nowrap hover:bg-gray-700 transition-colors"
          >
            一覧へ戻る
          </button>
          <p className="flex-1 text-[12px] font-mono font-bold text-white text-center truncate px-1">
            {atKey} — {isNew ? "新規追加" : "編集"}
          </p>
        </div>

        {/* 行タイプ切替（新規のみ） */}
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

      {/* フォーム */}
      {rowType === "set" ? (
        <SetForm
          initial={row?.rowType === "set" ? row : null}
          atKey={atKey}
          onSave={onSave}
        />
      ) : (
        <ArimaForm
          initial={row?.rowType === "arima" ? row : null}
          onSave={onSave}
        />
      )}
    </div>
  );
}

// =============================================================================
// SET行 フォーム
// =============================================================================

function SetForm({
  initial, atKey, onSave,
}: {
  initial: TGATSet | null;
  atKey: string;
  onSave: (row: TGATRow) => void;
}) {
  const [form, setForm] = useState<Omit<TGATSet, "id">>(() =>
    initial ? { ...initial } : emptySet()
  );

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleBattleResult(index: number) {
    const current = form.battleResults[index] ?? "";
    const next = current === "" ? "×" : current === "×" ? "○" : "";
    const arr = [...form.battleResults];
    if (next === "") {
      arr.splice(index, 1);
    } else {
      arr[index] = next;
    }
    setField("battleResults", arr.slice(0, TG_MAX_BATTLE_RESULTS));
  }

  function setDirectAdd(index: number, field: "trigger" | "coins", value: string | number | null) {
    const next = [...form.directAdds];
    if (!next[index]) {
      next[index] = { id: crypto.randomUUID(), trigger: "", coins: null };
    }
    next[index] = { ...next[index], [field]: value };
    // 空スロットを末尾からトリム
    const trimmed = next.filter((d) => d.trigger || d.coins != null);
    setField("directAdds", trimmed);
  }

  function handleSave() {
    onSave({ id: initial?.id ?? crypto.randomUUID(), ...form });
  }

  // 直乗せスロット表示用 (MAX 4 + 1空スロット)
  const addSlots: TGDirectAdd[] = [
    ...form.directAdds,
    ...Array.from(
      { length: Math.max(0, TG_MAX_DIRECT_ADDS - form.directAdds.length) },
      () => ({ id: "", trigger: "", coins: null })
    ),
  ].slice(0, TG_MAX_DIRECT_ADDS);

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-32">

        {/* ── AT種別 ── */}
        <Section title="AT種別">
          <div className="flex gap-2">
            {TG_AT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setField("atType", t)}
                className="flex-1 text-[10px] font-mono font-bold py-2.5 rounded border-2 transition-colors leading-tight text-center"
                style={
                  form.atType === t
                    ? t === "通常AT"
                      ? { backgroundColor: "#374151", color: "#ffffff", borderColor: "#374151" }
                      : t === "裏AT"
                      ? { backgroundColor: "#b91c1c", color: "#ffffff", borderColor: "#b91c1c" }
                      : { backgroundColor: "#4a148c", color: "#ffffff", borderColor: "#4a148c" }
                    : { backgroundColor: "#ffffff", color: "#9ca3af", borderColor: "#d1d5db" }
                }
              >
                {t}
              </button>
            ))}
          </div>
        </Section>

        {/* ── 敵キャラ ── */}
        <Section title="敵キャラ">
          <div className="grid grid-cols-4 gap-2">
            {TG_AT_CHARACTERS.map((c) => {
              const col = getATCharColor(c);
              const sel = form.character === c;
              return (
                <button
                  key={c}
                  onClick={() => setField("character", c)}
                  className="py-3 rounded text-[11px] font-mono font-bold transition-all active:scale-95"
                  style={
                    sel
                      ? { ...col, boxShadow: "0 0 0 2px #1f2937" }
                      : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }
                  }
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── 対決契機 ── */}
        <Section title="対決契機">
          <div className="grid grid-cols-4 gap-1.5">
            {TG_BATTLE_TRIGGERS.map((t) => (
              <button
                key={t}
                onClick={() => setField("battleTrigger", t)}
                className="py-2.5 rounded text-[10px] font-mono font-bold transition-colors border-2"
                style={
                  form.battleTrigger === t
                    ? { backgroundColor: "#374151", color: "#f9fafb", borderColor: "#374151" }
                    : { backgroundColor: "#ffffff", color: "#374151", borderColor: "#d1d5db" }
                }
              >
                {t}
              </button>
            ))}
          </div>
        </Section>

        {/* ── 不利益 ── */}
        <Section title="不利益">
          <div className="flex gap-2">
            {TG_DISADVANTAGE.map((d) => (
              <button
                key={d}
                onClick={() => setField("disadvantage", d)}
                className="flex-1 py-3 rounded text-[11px] font-mono font-bold border-2 transition-colors"
                style={
                  form.disadvantage === d
                    ? d === "不利益⭕️"
                      ? { backgroundColor: "#2e7d32", color: "#ffffff", borderColor: "#2e7d32" }
                      : d === "不利益❌"
                      ? { backgroundColor: "#c62828", color: "#ffffff", borderColor: "#c62828" }
                      : { backgroundColor: "#374151", color: "#f9fafb", borderColor: "#374151" }
                    : { backgroundColor: "#ffffff", color: "#9ca3af", borderColor: "#d1d5db" }
                }
              >
                {d}
              </button>
            ))}
          </div>
        </Section>

        {/* ── BITES種別 ── */}
        <Section title="BITES種別">
          <div className="grid grid-cols-3 gap-2">
            {TG_BITES_TYPES.map((bt) => {
              const col = getBitesTypeCellColor(bt);
              const sel = form.bitesType === bt;
              return (
                <button
                  key={bt}
                  onClick={() => setField("bitesType", bt)}
                  className="py-3 rounded text-[10px] font-mono font-bold leading-tight text-center transition-all active:scale-95"
                  style={
                    sel
                      ? { ...col, boxShadow: "0 0 0 2px #1f2937" }
                      : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }
                  }
                >
                  {getBitesTypeShort(bt)}
                </button>
              );
            })}
          </div>
        </Section>

        {/* ── BITES獲得 ── */}
        <Section title="BITES獲得">
          <div className="grid grid-cols-5 gap-2">
            {TG_BITES_COINS.map((c) => (
              <button
                key={c}
                onClick={() => setField("bitesCoins", String(c))}
                className="py-3 rounded text-[11px] font-mono font-bold border-2 transition-colors"
                style={
                  form.bitesCoins === String(c)
                    ? { backgroundColor: "#1f2937", color: "#f9fafb", borderColor: "#1f2937" }
                    : { backgroundColor: "#ffffff", color: "#374151", borderColor: "#d1d5db" }
                }
              >
                {c === "ED" ? "ED" : `${c}枚`}
              </button>
            ))}
          </div>
        </Section>

        {/* ── 直乗せ ── */}
        <Section title={`直乗せ（最大${TG_MAX_DIRECT_ADDS}件）`}>
          <div className="space-y-2">
            {addSlots.map((slot, i) => (
              <DirectAddSlot
                key={i}
                index={i}
                slot={slot}
                onChange={setDirectAdd}
              />
            ))}
          </div>
        </Section>

        {/* ── 対決成績 ── */}
        <Section title="対決成績（タップで ×→○→空 切替）">
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: TG_MAX_BATTLE_RESULTS }, (_, i) => {
              const result = form.battleResults[i] ?? "";
              return (
                <button
                  key={i}
                  onClick={() => toggleBattleResult(i)}
                  className="aspect-square flex flex-col items-center justify-center rounded text-[11px] font-bold border-2 transition-all active:scale-90"
                  style={
                    result === "○"
                      ? { backgroundColor: "#1b5e20", color: "#ffffff", borderColor: "#1b5e20" }
                      : result === "×"
                      ? { backgroundColor: "#b71c1c", color: "#ffffff", borderColor: "#b71c1c" }
                      : { backgroundColor: "#f3f4f6", color: "#d1d5db", borderColor: "#e5e7eb" }
                  }
                >
                  <span>{result || (i + 1)}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-gray-400 font-mono mt-1">
            ← 15G・30G・45G・60G・75G・90G・105G・120G・135G・150G →
          </p>
        </Section>
      </div>

      {/* 保存ボタン */}
      <div className="flex-shrink-0 bg-white border-t-2 border-gray-400 safe-area-bottom px-4 py-3">
        <button
          onClick={handleSave}
          className="w-full font-mono font-bold text-lg py-5 rounded-xl shadow-lg active:scale-95 transition-transform text-white"
          style={{ backgroundColor: "#b91c1c" }}
        >
          保存
        </button>
      </div>
    </>
  );
}

// ─── 直乗せスロット ───────────────────────────────────────────────────────────

function DirectAddSlot({
  index, slot, onChange,
}: {
  index: number;
  slot: TGDirectAdd;
  onChange: (index: number, field: "trigger" | "coins", value: string | number | null) => void;
}) {
  return (
    <div className="flex gap-2 items-center">
      <span className="text-[10px] font-mono text-gray-400 w-4 text-right flex-shrink-0">
        {index + 1}.
      </span>
      {/* 契機 */}
      <select
        className="flex-1 text-[11px] font-mono border-2 border-gray-300 rounded px-2 py-2.5 bg-white focus:outline-none focus:border-gray-500"
        value={slot.trigger}
        onChange={(e) => onChange(index, "trigger", e.target.value)}
      >
        <option value="">契機なし</option>
        {TG_DIRECT_ADD_TRIGGERS.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>
      {/* 枚数 */}
      <select
        className="flex-1 text-[11px] font-mono border-2 border-gray-300 rounded px-2 py-2.5 bg-white focus:outline-none focus:border-gray-500"
        value={slot.coins ?? ""}
        onChange={(e) => onChange(index, "coins", e.target.value === "" ? null : Number(e.target.value))}
      >
        <option value="">枚数</option>
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

function ArimaForm({
  initial, onSave,
}: {
  initial: TGArimaJudgment | null;
  onSave: (row: TGATRow) => void;
}) {
  const [form, setForm] = useState<Omit<TGArimaJudgment, "id">>(() =>
    initial ? { ...initial } : emptyArima()
  );

  function setField<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    onSave({ id: initial?.id ?? crypto.randomUUID(), ...form });
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-32">

        {/* ── 成否 ── */}
        <Section title="成否">
          <div className="flex gap-3">
            {TG_ARIMA_RESULTS.map((r) => (
              <button
                key={r}
                onClick={() => setField("result", r)}
                className="flex-1 py-5 rounded text-base font-mono font-black border-2 transition-colors"
                style={
                  form.result === r
                    ? r === "成功"
                      ? { backgroundColor: "#f9a825", color: "#000000", borderColor: "#f9a825" }
                      : { backgroundColor: "#424242", color: "#ffffff", borderColor: "#424242" }
                    : { backgroundColor: "#ffffff", color: "#9ca3af", borderColor: "#d1d5db" }
                }
              >
                {r}
              </button>
            ))}
          </div>
        </Section>

        {/* ── 役 ── */}
        <Section title="役">
          <div className="flex gap-2">
            {TG_ARIMA_ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setField("role", r)}
                className="flex-1 py-3 rounded text-[11px] font-mono font-bold border-2 transition-colors"
                style={
                  form.role === r
                    ? { backgroundColor: "#374151", color: "#ffffff", borderColor: "#374151" }
                    : { backgroundColor: "#ffffff", color: "#9ca3af", borderColor: "#d1d5db" }
                }
              >
                {r}
              </button>
            ))}
          </div>
        </Section>

        {/* ── CCGの死神（成功時のみ） ── */}
        {form.result === "成功" && (
          <Section title="CCGの死神（獲得枚数）">
            <div className="flex gap-3">
              {TG_CCG_COINS.map((c) => (
                <button
                  key={c}
                  onClick={() => setField("ccgCoins", form.ccgCoins === c ? null : c)}
                  className="flex-1 py-4 rounded text-sm font-mono font-bold border-2 transition-colors"
                  style={
                    form.ccgCoins === c
                      ? { backgroundColor: "#b91c1c", color: "#ffffff", borderColor: "#b91c1c" }
                      : { backgroundColor: "#ffffff", color: "#374151", borderColor: "#d1d5db" }
                  }
                >
                  {c.toLocaleString()}枚
                </button>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* 保存ボタン */}
      <div className="flex-shrink-0 bg-white border-t-2 border-gray-400 safe-area-bottom px-4 py-3">
        <button
          onClick={handleSave}
          disabled={!form.result}
          className="w-full font-mono font-bold text-lg py-5 rounded-xl shadow-lg active:scale-95 transition-transform text-white disabled:opacity-40"
          style={{ backgroundColor: "#f9a825" }}
        >
          <span style={{ color: "#000000" }}>保存</span>
        </button>
      </div>
    </>
  );
}

// ─── Section ラッパー ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4">
      <p className="text-[10px] font-mono text-gray-500 font-bold mb-2 uppercase tracking-wide">
        {title}
      </p>
      {children}
    </div>
  );
}
