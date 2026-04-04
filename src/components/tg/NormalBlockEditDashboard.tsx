"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時周期 編集ダッシュボード v1.3
// UIデザインレギュレーション1準拠: 全選択肢をスクエアボタングリッド化
// <select> ドロップダウン完全廃止 → 四角いボタン形式に統一
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
  };
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

  /** multi-toggle: 選択済みなら除去、未選択なら追加 */
  function toggleMulti(field: "kakugan" | "shinsekai" | "invitation", value: string) {
    const current = form[field] as string[];
    setField(field, current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    );
  }

  /** 前兆履歴: "zone:type" 形式でセット。type="" なら削除 */
  function setZencho(zone: string, type: string) {
    const filtered = form.zencho.filter((v) => !v.startsWith(zone + ":"));
    setField("zencho", type ? [...filtered, `${zone}:${type}`] : filtered);
  }

  /** 現在の前兆タイプを取得 */
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

        {/* ── 実G数 ── */}
        <Section title="実G数">
          <input
            type="number"
            inputMode="numeric"
            placeholder="G数を入力"
            className="w-full text-sm font-mono border-2 border-gray-300 rounded px-3 py-4 focus:outline-none focus:border-gray-500 bg-white text-center"
            value={form.jisshuG ?? ""}
            onChange={(e) =>
              setField("jisshuG", e.target.value === "" ? null : Number(e.target.value))
            }
          />
        </Section>

        {/* ── ゾーン (20択) ── */}
        <Section title="ゾーン">
          <div className="grid grid-cols-5 gap-1">
            {([...TG_ZONES] as string[]).map((z) => (
              <IconBtn
                key={z}
                selected={form.zone === z}
                onClick={() => setField("zone", z)}
                color={getZoneCellColor(z)}
                label={z}
              />
            ))}
          </div>
        </Section>

        {/* ── 推定モード (8択) ── */}
        <Section title="推定モード">
          <div className="grid grid-cols-4 gap-2">
            {([...TG_MODES] as string[]).map((m) => {
              const lbl = m === "不明" ? "不明" : abbrevMode(m);
              return (
                <IconBtn
                  key={m}
                  selected={form.estimatedMode === m}
                  onClick={() => setField("estimatedMode", m)}
                  color={getModeCellColor(m)}
                  label={lbl}
                />
              );
            })}
          </div>
        </Section>

        {/* ── 当選契機 (11択) ── */}
        <Section title="当選契機">
          <div className="grid grid-cols-4 gap-1.5">
            {([...TG_WIN_TRIGGERS] as string[]).map((t) => {
              const lbl = t === "不明" ? "不明" : abbrevTrigger(t);
              return (
                <IconBtn
                  key={t}
                  selected={form.winTrigger === t}
                  onClick={() => setField("winTrigger", t)}
                  color={getTriggerCellColor(t)}
                  label={lbl}
                />
              );
            })}
          </div>
        </Section>

        {/* ── イベント (6択 + なし) ── */}
        <Section title="イベント">
          <div className="grid grid-cols-4 gap-2">
            <IconBtn
              selected={form.event === ""}
              onClick={() => setField("event", "")}
              color={{ backgroundColor: "#e5e7eb", color: "#6b7280" }}
              label="なし"
            />
            {([...TG_EVENTS] as string[]).map((e) => (
              <IconBtn
                key={e}
                selected={form.event === e}
                onClick={() => setField("event", e)}
                color={getEventCellColor(e)}
                label={abbrevEvent(e)}
              />
            ))}
          </div>
        </Section>

        {/* ── AT初当り ── */}
        <Section title="AT初当り">
          <button
            onClick={() => setField("atWin", !form.atWin)}
            className="w-full py-7 rounded font-mono font-black text-lg transition-all active:scale-95"
            style={
              form.atWin
                ? { backgroundColor: "#38761d", color: "#fff", border: "2px solid #38761d", boxShadow: "0 0 0 2px #1f2937" }
                : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }
            }
          >
            {form.atWin ? "AT Get ✓" : "なし"}
          </button>
        </Section>

        {/* ── 終了画面示唆 (CZ失敗 / 終了画面 2カテゴリ) ── */}
        <Section title="終了画面示唆">
          {/* なし */}
          <button
            onClick={() => setField("endingSuggestion", "")}
            className="w-full mb-2 py-3 rounded font-mono font-bold text-[11px] transition-all active:scale-95"
            style={
              form.endingSuggestion === ""
                ? { backgroundColor: "#374151", color: "#fff", border: "2px solid #374151", boxShadow: "0 0 0 2px #1f2937" }
                : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }
            }
          >
            なし
          </button>

          {/* CZ失敗 カテゴリ */}
          <p className="text-[9px] font-mono text-gray-400 mb-1.5 font-bold">— CZ失敗画面 —</p>
          <div className="grid grid-cols-3 gap-1 mb-3">
            {([...TG_ENDING_SUGGESTIONS] as string[])
              .filter((s) => s.startsWith("[cz失敗]"))
              .map((s) => {
                const lines = getSuggestionListLines(s);
                return (
                  <IconBtn
                    key={s}
                    selected={form.endingSuggestion === s}
                    onClick={() => setField("endingSuggestion", s)}
                    color={getEndingCellColor(s)}
                    label={lines?.name ?? s}
                    subLabel={lines?.hint}
                  />
                );
              })}
          </div>

          {/* 終了画面 カテゴリ */}
          <p className="text-[9px] font-mono text-gray-400 mb-1.5 font-bold">— 終了画面 —</p>
          <div className="grid grid-cols-3 gap-1">
            {([...TG_ENDING_SUGGESTIONS] as string[])
              .filter((s) => s.startsWith("[終了画面]"))
              .map((s) => {
                const lines = getSuggestionListLines(s);
                return (
                  <IconBtn
                    key={s}
                    selected={form.endingSuggestion === s}
                    onClick={() => setField("endingSuggestion", s)}
                    color={getEndingCellColor(s)}
                    label={lines?.name ?? s}
                    subLabel={lines?.hint}
                  />
                );
              })}
          </div>
        </Section>

        {/* ── トロフィー (6択 + なし) ── */}
        <Section title="トロフィー">
          <div className="grid grid-cols-4 gap-2">
            <IconBtn
              selected={form.trophy === ""}
              onClick={() => setField("trophy", "")}
              color={{ backgroundColor: "#e5e7eb", color: "#6b7280" }}
              label="なし"
            />
            {([...TG_TROPHIES] as string[]).map((t) => {
              const lines = getSuggestionListLines(t);
              return (
                <IconBtn
                  key={t}
                  selected={form.trophy === t}
                  onClick={() => setField("trophy", t)}
                  color={getTrophyCellColor(t)}
                  label={lines?.name ?? t}
                  subLabel={lines?.hint}
                />
              );
            })}
          </div>
        </Section>

        {/* ── 前兆履歴 (ゾーン別 3択ボタン) ── */}
        <Section title="前兆履歴">
          <div className="space-y-1.5">
            {([...TG_ZENCHO_ZONES] as string[]).map((zone) => {
              const current = getZenchoType(zone);
              return (
                <div key={zone} className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-gray-500 w-10 text-right shrink-0">
                    {zone}G
                  </span>
                  <div className="flex flex-1 gap-1.5">
                    {/* クリアボタン */}
                    <button
                      onClick={() => setZencho(zone, "")}
                      className="flex-1 py-2.5 rounded text-[10px] font-mono font-bold transition-all active:scale-95"
                      style={
                        current === ""
                          ? { backgroundColor: "#374151", color: "#fff", border: "2px solid #374151", boxShadow: "0 0 0 2px #1f2937" }
                          : { backgroundColor: "#f3f4f6", color: "#9ca3af", border: "2px solid #e5e7eb" }
                      }
                    >—</button>
                    {([...TG_ZENCHO_TYPES] as string[]).map((type) => (
                      <button
                        key={type}
                        onClick={() => setZencho(zone, type)}
                        className="flex-1 py-2.5 rounded text-[9px] font-mono font-bold transition-all active:scale-95"
                        style={
                          current === type
                            ? type === "東京上空"
                              ? { backgroundColor: "#c62828", color: "#fff", border: "2px solid #c62828", boxShadow: "0 0 0 2px #1f2937" }
                              : { backgroundColor: "#1565c0", color: "#fff", border: "2px solid #1565c0", boxShadow: "0 0 0 2px #1f2937" }
                            : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }
                        }
                      >
                        {type === "東京上空" ? "上空" : type}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Section>

        {/* ── 赫眼状態 (4択・複数選択可) ── */}
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

        {/* ── 精神世界 (3択・複数選択可) ── */}
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

        {/* ── 招待状 (16択・複数選択可) ── */}
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

// ─── 共通サブコンポーネント ───────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded border border-gray-400 px-3 pt-3 pb-4">
      <p className="text-[10px] font-mono text-gray-500 font-bold mb-2 uppercase tracking-wide">{title}</p>
      {children}
    </div>
  );
}

/**
 * UIレギュレーション1準拠スクエアボタン
 * 選択時: 指定カラー + boxShadow / 未選択: グレー
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
