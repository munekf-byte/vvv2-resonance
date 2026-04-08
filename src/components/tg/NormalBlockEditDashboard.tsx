"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時周期 編集ダッシュボード v1.6
// UIレギュレーション1準拠
// セクション順: メインカード(3+3+2) → 前兆履歴 → 招待状 → 赫眼状態 → 精神世界 → フリーメモ
// nd-10/12/14: 5スロット独立プルダウン方式（最大5回入力）
// =============================================================================

import { useState, useRef } from "react";
import type { NormalBlock } from "@/types";
import {
  TG_ZONES, TG_MODES, TG_WIN_TRIGGERS, TG_EVENTS,
  TG_ENDING_SUGGESTIONS, TG_TROPHIES, TG_KAKUGAN,
  TG_SHINSEKAI, TG_INVITATIONS,
  TG_ZENCHO_ZONES, TG_ZENCHO_TYPES,
  TG_EYECATCH,
} from "@/lib/engine/constants";
import {
  getZoneCellColor, getModeCellColor, getTriggerCellColor, getEventCellColor,
  getEndingCellColor, getTrophyCellColor,
  getSuggestionListLines,
  abbrevMode, abbrevTrigger, abbrevEvent,
  type CellColor,
} from "@/lib/tg/cellColors";

// 通常時では CZ失敗系のみ / AT側では終了画面系のみ (重複排除)
const ENDING_SUGGESTIONS_NORMAL = TG_ENDING_SUGGESTIONS.filter((s) =>
  s.startsWith("[cz失敗]")
);

// 招待状の短縮ラベル (アイコン表示時は説明を省略)
function invShortLabel(full: string): string {
  const sep = full.indexOf(" - ");
  return sep !== -1 ? full.slice(0, sep) : full;
}

interface Props {
  block: NormalBlock | null;
  blockIndex: number;
  onSave: (block: NormalBlock) => void;
  onTempSave: (block: NormalBlock) => void;
  onClose: () => void;
  onYame?: (block: NormalBlock) => void;
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
    eyecatch: "",
    czCounter: { bell: 0, replay: 0, weakRare: 0, strongRare: 0, hitRole: "" },
    memo: "",
    yame: false,
  };
}

const MAX_SLOTS = 5;

// ─── メインコンポーネント ──────────────────────────────────────────────────────

export function NormalBlockEditDashboard({ block, blockIndex, onSave, onTempSave, onClose, onYame }: Props) {
  const isNew = block === null;
  const [form, setForm] = useState<FormState>(() =>
    block ? { ...block, memo: block.memo ?? "" } : emptyForm()
  );
  const [yamePopup, setYamePopup] = useState(false);
  const [yameG, setYameG] = useState<string>("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setCZCounter(key: "bell" | "replay" | "weakRare" | "strongRare", delta: number) {
    const cz = form.czCounter ?? { bell: 0, replay: 0, weakRare: 0, strongRare: 0, hitRole: "" };
    setField("czCounter", { ...cz, [key]: Math.max(0, (cz[key as keyof typeof cz] as number) + delta) });
  }
  const [czOverlay, setCZOverlay] = useState(false);
  const [czOverlayPhase, setCZOverlayPhase] = useState<1 | 2>(1);
  const czTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function setCZHit(key: string) {
    const cz = form.czCounter ?? { bell: 0, replay: 0, weakRare: 0, strongRare: 0, hitRole: "" };
    // カウント+1 + hitRole設定 + AT Get自動ON + オーバーレイ表示
    setForm((prev) => ({
      ...prev,
      atWin: true,
      czCounter: {
        ...cz,
        [key]: (cz[key as keyof typeof cz] as number) + 1,
        hitRole: key,
      },
    }));
    setCZOverlayPhase(1);
    setCZOverlay(true);
    if (czTimerRef.current) clearTimeout(czTimerRef.current);
    czTimerRef.current = setTimeout(() => setCZOverlayPhase(2), 4500);
  }

  /** スロット方式の個別セット (kakugan / shinsekai / invitation) */
  function setSlot(field: "kakugan" | "shinsekai" | "invitation", index: number, value: string) {
    const current = [...(form[field] as string[])];
    while (current.length <= index) current.push("");
    current[index] = value;
    // 末尾の空要素を除去
    while (current.length > 0 && current[current.length - 1] === "") current.pop();
    setField(field, current);
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
    return {
      id: block?.id ?? crypto.randomUUID(),
      ...form,
      createdAt: block?.createdAt ?? new Date().toISOString(),
    };
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
                className="w-full text-sm font-mono rounded px-1 py-3 focus:outline-none bg-white text-center"
                style={{ border: "1px solid #374151" }}
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
                className="w-full font-mono font-bold text-[11px] rounded transition-all active:scale-95"
                style={{
                  ...(form.atWin
                    ? { backgroundColor: "#38761d", color: "#fff", border: "1px solid #374151", boxShadow: "0 0 0 2px #1f2937" }
                    : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "1px solid #374151" }),
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
                options={["", ...ENDING_SUGGESTIONS_NORMAL]}
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

        {/* ── CZ内容カウンター ── */}
        {(() => {
          const cz = form.czCounter ?? { bell: 0, replay: 0, weakRare: 0, strongRare: 0, hitRole: "" };
          const hasHit = !!cz.hitRole;
          return (
            <div className="relative rounded border border-gray-400 overflow-hidden">
              {/* 背景画像: pre_hit（うっすら） */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: "url(/images/pre_hit.png)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  opacity: 0.08,
                }} />

              {/* 当選時オーバーレイ: after_hit → 3秒後に after_hit_2 へ切替 */}
              {czOverlay && hasHit && (
                <div
                  key={czOverlayPhase}
                  className="absolute inset-0 z-50 animate-[fadeIn_0.15s_ease-out]"
                  style={{
                    backgroundImage: czOverlayPhase === 1
                      ? "url(/images/after_hit.png)"
                      : "url(/images/after_hit_2.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.85,
                  }}>
                  {/* タップでオーバーレイだけ閉じる（hitRoleは維持） */}
                  <button className="absolute inset-0 w-full h-full" onClick={() => {
                    if (czTimerRef.current) clearTimeout(czTimerRef.current);
                    setCZOverlay(false);
                  }} />
                </div>
              )}

              {/* ヘッダー */}
              <div className="relative z-20 px-3 pt-3 pb-1">
                <p className="text-[10px] font-mono text-gray-500 font-bold uppercase tracking-wide">CZ内容カウンター</p>
              </div>

              {/* カウンター行 */}
              <div className="relative z-20">
                {([
                  { key: "bell"       as const, label: "押/斜🔔", bg: "#fef9c3", color: "#713f12" },
                  { key: "replay"     as const, label: "リプ",     bg: "#cffafe", color: "#155e75" },
                  { key: "weakRare"   as const, label: "弱レア",   bg: "#ede9fe", color: "#5b21b6" },
                  { key: "strongRare" as const, label: "強レア",   bg: "#c084fc", color: "#ffffff" },
                ]).map(({ key, label, bg, color }) => {
                  const val = cz[key] as number;
                  const isHit = cz.hitRole === key;
                  return (
                    <div key={key} className="flex items-center" style={{ minHeight: "48px", borderBottom: "2px solid #374151" }}>
                      <div className="flex items-center justify-center font-mono font-bold text-[13px] shrink-0"
                        style={{ width: "68px", height: "48px", backgroundColor: bg, color, borderRight: "2px solid #374151" }}>
                        {label}
                      </div>
                      <div className="flex items-center gap-1.5 flex-1 justify-center px-1">
                        <button onClick={() => setCZCounter(key, 1)}
                          className="w-9 h-9 rounded-full font-mono font-black text-[8px] active:scale-95 transition-transform"
                          style={{ backgroundColor: "#c8e6c9", color: "#1b5e20" }}>
                          PUSH
                        </button>
                        <button onClick={() => setCZCounter(key, -1)}
                          className="w-9 h-9 rounded-full font-mono font-black text-sm active:scale-95 transition-transform"
                          style={{ backgroundColor: "#fce4ec", color: "#880e4f" }}>
                          -1
                        </button>
                        <button onClick={() => setCZHit(key)}
                          className="w-9 h-9 rounded-full font-mono font-black text-sm active:scale-95 transition-transform"
                          style={isHit
                            ? { backgroundColor: "#b91c1c", color: "#ffffff", boxShadow: "0 0 0 3px #fca5a5, 0 0 12px rgba(185,28,28,0.5)" }
                            : { backgroundColor: "transparent", color: "#dc2626", border: "2px solid #dc2626" }
                          }>
                          当
                        </button>
                      </div>
                      <span className="text-[22px] shrink-0 mr-0.5" style={{ color: isHit ? "#f59e0b" : "transparent" }}>★</span>
                      <div className="flex items-center justify-center font-mono font-black text-xl shrink-0"
                        style={{ width: "48px", height: "48px", border: "2px solid #374151", borderRadius: "4px", marginRight: "4px",
                          backgroundColor: isHit ? "#b91c1c" : val > 0 ? "#1f2937" : "#f9fafb",
                          color: val > 0 || isHit ? "#ffffff" : "#9ca3af" }}>
                        {val}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── 前兆履歴 (nd-8) ── */}
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
        </Section>

        {/* ── 招待状 (nd-10) — 5スロット独立プルダウン ── */}
        <Section title="招待状（最大5回）">
          <MultiSlotPicker
            values={form.invitation}
            options={[...TG_INVITATIONS]}
            onChange={(vals) => setField("invitation", vals)}
            displayFn={invShortLabel}
            accentColor="#5b21b6"
            borderActive="#7c3aed"
          />
          <p className="text-[8px] text-gray-400 font-mono mt-1.5">各スロットを独立してタップ選択できます</p>
        </Section>

        {/* ── アイキャッチ ── */}
        <Section title="アイキャッチ">
          <div className="grid grid-cols-3 gap-2">
            {(["", ...TG_EYECATCH] as string[]).map((ec) => (
              <button
                key={ec || "__empty__"}
                onClick={() => setField("eyecatch", ec)}
                className="py-3 rounded text-[10px] font-mono font-bold transition-all active:scale-95 text-center leading-tight"
                style={
                  form.eyecatch === ec
                    ? ec === "赫眼/喰種ver."
                      ? { backgroundColor: "#b91c1c", color: "#fff", boxShadow: "0 0 0 2px #1f2937" }
                      : { backgroundColor: "#374151", color: "#fff", boxShadow: "0 0 0 2px #1f2937" }
                    : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }
                }
              >
                {ec || "なし"}
              </button>
            ))}
          </div>
        </Section>

        {/* ── 赫眼状態 (nd-12) — 5スロット独立プルダウン ── */}
        <Section title="赫眼状態（最大5回）">
          <MultiSlotPicker
            values={form.kakugan}
            options={[...TG_KAKUGAN]}
            onChange={(vals) => setField("kakugan", vals)}
            accentColor="#b91c1c"
            borderActive="#991b1b"
          />
        </Section>

        {/* ── 精神世界 (nd-14) — 5スロット独立プルダウン ── */}
        <Section title="精神世界（最大5回）">
          <MultiSlotPicker
            values={form.shinsekai}
            options={[...TG_SHINSEKAI]}
            onChange={(vals) => setField("shinsekai", vals)}
            accentColor="#1e40af"
            borderActive="#1d4ed8"
          />
        </Section>

        {/* ── フリーメモ (nd-16) ── */}
        <Section title="フリ���メモ">
          <textarea
            placeholder="メモを入力..."
            className="w-full rounded px-2 py-2 text-[12px] font-mono focus:outline-none resize-none bg-white"
            style={{ border: "1px solid #374151" }}
            rows={3}
            value={form.memo ?? ""}
            onChange={(e) => setField("memo", e.target.value || undefined)}
          />
        </Section>

        {/* ── ヤメボタン ── */}
        {onYame && (
          <button
            onClick={() => {
              setYameG(form.jisshuG != null ? String(form.jisshuG) : "");
              setYamePopup(true);
            }}
            className="w-full py-4 rounded-xl font-mono font-bold text-base text-white active:scale-95 transition-transform shadow-md"
            style={{ backgroundColor: "#1e3a5f" }}
          >
            {form.yame ? "ヤメ���み" : "ヤメ"}
          </button>
        )}
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

      {/* ===== ヤメ確認ポッ��アップ ===== */}
      {yamePopup && (
        <div
          className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-4"
          onClick={(e) => e.target === e.currentTarget && setYamePopup(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4" style={{ backgroundColor: "#1e3a5f" }}>
              <p className="text-white font-mono font-bold text-sm">ヤメ</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              <p className="text-gray-700 font-mono text-sm">
                稼働終了時の消化実ゲーム��を入力してください
              </p>
              <input
                type="number"
                inputMode="numeric"
                placeholder="��ーム数（任意）"
                className="w-full text-sm font-mono rounded px-3 py-3 focus:outline-none bg-white text-center"
                style={{ border: "2px solid #1e3a5f" }}
                value={yameG}
                onChange={(e) => setYameG(e.target.value)}
                min={0}
                autoFocus
              />
              <p className="text-[10px] font-mono text-gray-400">
                入力しなくてもヤメを記録できます
              </p>
            </div>
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => setYamePopup(false)}
                className="flex-1 py-4 text-sm font-mono font-bold text-gray-600 hover:bg-gray-50 transition-colors border-r border-gray-200"
              >
                キャンセル
              </button>
              <button
                onClick={() => {
                  const finalG = yameG !== "" ? Number(yameG) : form.jisshuG;
                  const yameBlock: NormalBlock = {
                    id: block?.id ?? crypto.randomUUID(),
                    ...form,
                    jisshuG: finalG,
                    yame: true,
                    createdAt: block?.createdAt ?? new Date().toISOString(),
                  };
                  setYamePopup(false);
                  onYame?.(yameBlock);
                }}
                className="flex-1 py-4 text-sm font-mono font-bold text-white transition-colors"
                style={{ backgroundColor: "#1e3a5f" }}
              >
                ヤメ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MultiSlotPicker (nd-10/12/14 用) ─────────────────────────────────────────
// 5個のスロットを並べ、各スロットが独立してプルダウン選択できる形式

function MultiSlotPicker({
  values, options, onChange, displayFn,
  accentColor = "#374151", borderActive = "#374151",
  maxSlots = MAX_SLOTS, slotHeight = 60,
}: {
  values: string[];
  options: string[];
  onChange: (vals: string[]) => void;
  displayFn?: (v: string) => string;
  accentColor?: string;
  borderActive?: string;
  maxSlots?: number;
  slotHeight?: number;
}) {
  function setSlot(index: number, value: string) {
    const next = [...values];
    while (next.length <= index) next.push("");
    next[index] = value;
    while (next.length > 0 && next[next.length - 1] === "") next.pop();
    onChange(next);
  }

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {Array.from({ length: maxSlots }, (_, i) => {
        const value = values[i] ?? "";
        const hasValue = value !== "";
        const displayLabel = hasValue ? (displayFn ? displayFn(value) : value) : "—";

        return (
          <div key={i} className="flex flex-col rounded overflow-hidden border-2"
            style={hasValue ? { borderColor: borderActive } : { borderColor: "#e5e7eb" }}>
            {/* スロット番号 */}
            <div className="text-center text-[8px] font-mono py-0.5 leading-none"
              style={{ backgroundColor: "#f3f4f6", color: "#9ca3af" }}>
              {i + 1}
            </div>
            {/* 選択エリア */}
            <div className="relative flex-1 overflow-hidden" style={{ minHeight: `${slotHeight}px` }}>
              <div
                className="absolute inset-0 flex items-center justify-center px-0.5 pointer-events-none"
                style={hasValue
                  ? { backgroundColor: accentColor, color: "#ffffff" }
                  : { backgroundColor: "#f9fafb", color: "#d1d5db" }
                }
              >
                <span className="text-[9px] font-mono font-bold text-center leading-tight break-all line-clamp-4">
                  {displayLabel}
                </span>
              </div>
              <select
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                value={value}
                onChange={(e) => setSlot(i, e.target.value)}
              >
                <option value="">—</option>
                {options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── ZenchoSlot (nd-9) ────────────────────────────────────────────────────────

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
      {/* 下段: タイプ or 切替インジケーター (2倍サイズ) */}
      <button
        onClick={cycle}
        className="flex flex-col items-center justify-center transition-colors active:opacity-80"
        style={{
          minHeight: "52px",
          backgroundColor: col ? col.bg : "#f9fafb",
          color: col ? col.color : "#9ca3af",
        }}
      >
        {hasValue ? (
          <span className="text-[10px] font-mono font-bold text-center leading-tight px-0.5">
            {value}
          </span>
        ) : (
          <>
            <span className="text-[28px] leading-none">⋄</span>
            <span className="text-[12px] font-mono leading-tight mt-0.5">タップ切替</span>
          </>
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

function ColoredSelectIcon({
  value, onChange, options, colorFn, labelFn, emptyLabel = "未選択",
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  colorFn?: (v: string) => CellColor;
  labelFn?: (v: string) => string;
  emptyLabel?: string;
}) {
  const hasValue = value !== "" && value !== undefined;
  const color: CellColor | null = hasValue && colorFn ? colorFn(value) : null;
  const displayLabel = hasValue ? (labelFn ? labelFn(value) : value) : emptyLabel;

  return (
    <div
      className="relative rounded overflow-hidden"
      style={{ minHeight: "56px", border: "1px solid #374151" }}
    >
      <div
        className="absolute inset-0 flex items-center justify-center gap-1 font-mono font-bold text-[11px] text-center px-1 pointer-events-none"
        style={
          color
            ? { ...color }
            : { backgroundColor: "#f3f4f6", color: "#9ca3af" }
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
