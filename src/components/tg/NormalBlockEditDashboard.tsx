"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 通常時周期 編集ダッシュボード v1.6
// UIレギュレーション1準拠
// セクション順: メインカード(3+3+2) → 前兆履歴 → 招待状 → 赫眼状態 → 精神世界 → フリーメモ
// nd-10/12/14: 5スロット独立プルダウン方式（最大5回入力）
// =============================================================================

import { useEffect, useRef, useState } from "react";
import type { NormalBlock, TGShinsekaiCounter } from "@/types";
import {
  TG_ZONES, TG_MODES, TG_WIN_TRIGGERS, TG_EVENTS,
  TG_ENDING_SUGGESTIONS, TG_TROPHIES, TG_KAKUGAN,
  TG_SHINSEKAI, TG_SHINSEKAI_TRIGGER, TG_INVITATIONS,
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
import { logAnalyticsEvent } from "@/lib/analytics/event-logger";
import { LandscapeSelectOverlay } from "./LandscapeSelect";

// CZイベント名 → analytics cz_type マッピング (合致しなければ analytics に送らない)
function detectCzType(event: string): "reminiscence" | "oogui_rize" | null {
  if (event === "レミニセンス") return "reminiscence";
  if (event === "大喰いの利世") return "oogui_rize";
  return null;
}

// CZカウンターのキー → analytics role マッピング
const CZ_ROLE_MAP: Record<"bell" | "replay" | "weakRare" | "strongRare", string> = {
  bell: "bell",
  replay: "replay",
  weakRare: "weak_rare",
  strongRare: "strong_rare",
};

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
  medalStamp?: number | null;
  /** セッション全体で1つの精神世界弱レア役カウンター */
  shinsekaiWeakRare: TGShinsekaiCounter | null;
  onShinsekaiWeakRareChange: (counter: TGShinsekaiCounter) => void;
  /** 赫眼 後追い確定 — 既に保留中なら新規開始は不可 */
  pendingKakuganActive: boolean;
  onStartPendingKakugan: (savedBlock: NormalBlock) => void;
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
    shinsekaiTrigger: [],
    invitation: [],
    zencho:     [],
    eyecatch: [],
    czCounter: { bell: 0, replay: 0, weakRare: 0, strongRare: 0, hitRole: "" },
    memo: "",
    yame: false,
  };
}

const MAX_SLOTS = 5;

// =============================================================================
// 横モード（ソフトウェア回転）— 著しい不具合が出た場合は LANDSCAPE_ENABLED を
// false にデプロイすればトグル機能ごと無効化できる（UI・ストレージ・transform
// すべて停止）。完全撤去したい場合は本ファイル単体の git revert で戻る。
// =============================================================================
const LANDSCAPE_ENABLED = true;
const LANDSCAPE_STORAGE_KEY = "tgr_normal_dashboard_landscape";

// ─── メインコンポーネント ──────────────────────────────────────────────────────

export function NormalBlockEditDashboard({ block, blockIndex, medalStamp, shinsekaiWeakRare, onShinsekaiWeakRareChange, pendingKakuganActive, onStartPendingKakugan, onSave, onTempSave, onClose, onYame }: Props) {
  const isNew = block === null;
  const [form, setForm] = useState<FormState>(() =>
    block ? { ...block, memo: block.memo ?? "", shinsekaiTrigger: block.shinsekaiTrigger ?? [] } : emptyForm()
  );
  const [yamePopup, setYamePopup] = useState(false);
  const [yameG, setYameG] = useState<string>("");

  // 保留確定で外部から block.kakugan が伸びたら form 側にも即追従させる。
  // ローカル編集中は block.kakugan は保存まで動かないので、長さが増えた時だけ
  // 同期すればユーザーの未保存編集を踏み潰さない。
  useEffect(() => {
    if (!block) return;
    const ext = block.kakugan ?? [];
    setForm((prev) => {
      const cur = prev.kakugan ?? [];
      if (ext.length > cur.length) {
        return { ...prev, kakugan: ext };
      }
      return prev;
    });
  }, [block?.kakugan]);

  // analytics: cz_instance_id をマウント時に確定（buildBlock 時の id と一致させる）
  const [instanceId] = useState<string>(() => block?.id ?? crypto.randomUUID());
  // analytics: 既存ブロック再編集時の event_seq_in_cz は既存カウンターの合計から続ける
  const seqRef = useRef<number>(
    block?.czCounter
      ? (block.czCounter.bell + block.czCounter.replay
         + block.czCounter.weakRare + block.czCounter.strongRare)
      : 0
  );

  /**
   * CZイベント1件を analytics に送信（fire-and-forget）。
   * - レミニセンス / 大喰いの利世 以外では送信しない（CZ ではないため）。
   * - PUSH / 当 = is_correction:false / -1 = is_correction:true
   * - triggered: 当ボタンのみ true
   */
  function logCZEvent(roleKey: "bell" | "replay" | "weakRare" | "strongRare", opts: {
    triggered: boolean;
    isCorrection: boolean;
  }) {
    const cz_type = detectCzType(form.event);
    if (!cz_type) return;
    seqRef.current += 1;
    logAnalyticsEvent("cz-event", {
      cz_instance_id: instanceId,
      cz_type,
      event_seq_in_cz: seqRef.current,
      role: CZ_ROLE_MAP[roleKey],
      triggered: opts.triggered,
      is_correction: opts.isCorrection,
      is_final_game: opts.triggered ? true : null,
      recorded_at: new Date().toISOString(),
    });
  }

  const [landscape, setLandscape] = useState(false);
  const [vp, setVp] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (!LANDSCAPE_ENABLED) return;
    try {
      setLandscape(localStorage.getItem(LANDSCAPE_STORAGE_KEY) === "1");
    } catch {}
    const update = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  function toggleLandscape() {
    setLandscape((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(LANDSCAPE_STORAGE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  const useLandscape = LANDSCAPE_ENABLED && landscape && vp !== null;
  const stageStyle: React.CSSProperties | undefined = useLandscape
    ? {
        position: "fixed",
        top: "50%",
        left: "50%",
        width: `${vp.h}px`,
        height: `${vp.w}px`,
        transform: "translate(-50%, -50%) rotate(90deg)",
        transformOrigin: "center center",
      }
    : undefined;
  const stageClass = useLandscape
    ? "z-50 flex flex-col bg-gray-100 overflow-hidden"
    : "fixed inset-0 z-50 flex flex-col bg-gray-100";

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function setCZCounter(key: "bell" | "replay" | "weakRare" | "strongRare", delta: number) {
    const cz = form.czCounter ?? { bell: 0, replay: 0, weakRare: 0, strongRare: 0, hitRole: "" };
    const currentVal = cz[key as keyof typeof cz] as number;
    const nextVal = Math.max(0, currentVal + delta);
    setField("czCounter", { ...cz, [key]: nextVal });
    // analytics: 実際にカウントが動いた場合のみログ送信（0からの-1など無効操作はスキップ）
    if (nextVal !== currentVal) {
      logCZEvent(key, { triggered: false, isCorrection: delta < 0 });
    }
  }

  /** 精神世界弱レア役カウンター（セッション全体）を増減 */
  function bumpShinsekaiWeakRare(key: "miss" | "win", delta: number) {
    const cur = shinsekaiWeakRare ?? { miss: 0, win: 0 };
    onShinsekaiWeakRareChange({
      ...cur,
      [key]: Math.max(0, cur[key] + delta),
    });
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
    // analytics: 当タップは triggered=true として記録
    if (key === "bell" || key === "replay" || key === "weakRare" || key === "strongRare") {
      logCZEvent(key, { triggered: true, isCorrection: false });
    }
  }

  /** スロット方式の個別セット (kakugan / shinsekai / shinsekaiTrigger / invitation) */
  function setSlot(field: "kakugan" | "shinsekai" | "shinsekaiTrigger" | "invitation", index: number, value: string) {
    const current = [...((form[field] as string[] | undefined) ?? [])];
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
      id: instanceId,
      ...form,
      createdAt: block?.createdAt ?? new Date().toISOString(),
    };
  }

  /**
   * analytics: 保存タイミングで cz_instance_id 配下の全イベントの cz_outcome を確定する。
   * - atWin=true → 'success' / atWin=false → 'fail'
   * - レミニセンス / 大喰いの利世 以外では呼ばない（CZ ではないため）
   * - fire-and-forget（失敗してもユーザー操作を阻害しない）
   */
  function flushCzOutcome() {
    if (typeof window === "undefined") return;
    if (!detectCzType(form.event)) return;
    try {
      void fetch("/api/analytics/cz-outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cz_instance_id: instanceId,
          cz_outcome: form.atWin ? "success" : "fail",
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }

  function handleSave()     { flushCzOutcome(); onSave(buildBlock()); }
  function handleTempSave() { onTempSave(buildBlock()); }

  /** 赫眼発生 — 現フォームを保存しつつ pending を開始（ダッシュボードは閉じない） */
  function handleStartPendingKakugan() {
    const saved = buildBlock();
    onStartPendingKakugan(saved);
  }

  return (
    <>
      {useLandscape && <div className="fixed inset-0 z-40" style={{ backgroundColor: "#f3f4f6" }} />}
      <div className={stageClass} style={stageStyle}>

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
          {LANDSCAPE_ENABLED && (
            <button
              onClick={toggleLandscape}
              aria-label={landscape ? "縦画面にする" : "横画面にする"}
              title={landscape ? "縦画面にする" : "横画面にする"}
              className="text-[11px] font-mono font-bold rounded px-2.5 py-1.5 flex-shrink-0 whitespace-nowrap active:scale-95 transition-transform shadow-sm"
              style={{ backgroundColor: "#fbbf24", color: "#1f2937", border: "1.5px solid #f59e0b" }}
            >
              {landscape ? "縦画面にする" : "横画面にする"}
            </button>
          )}
        </div>
      </div>

      {/* ===== 差枚数スタンプ ===== */}
      {medalStamp != null && (
        <div className="flex-shrink-0 flex items-center justify-center py-1.5"
          style={{ backgroundColor: medalStamp >= 0 ? "#14532d" : "#7f1d1d" }}>
          <span className="text-[10px] font-mono font-bold text-white/60 mr-1.5">差枚数</span>
          <span className="text-[15px] font-mono font-black text-white tracking-wide">
            {medalStamp >= 0 ? "+" : ""}{medalStamp.toLocaleString()}枚
          </span>
        </div>
      )}

      {/* ===== スクロール可能フォーム ===== */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 pb-32">

        {/* ── メインカード ── */}
        <div className="relative bg-white rounded border border-gray-400 px-3 pt-3 pb-4 space-y-3 overflow-hidden">
          {/* 背景画像（東京喰種ゴールド） */}
          <div className="absolute inset-0 z-0 pointer-events-none" style={{
            backgroundImage: "url('/images/tujo_dashboard_main.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.08,
          }} />

          {/* Row 1: 実G数 | ゾーン | 推定MODE */}
          <div className="grid grid-cols-3 gap-2">
            <FormCell label="実G数">
              <input
                type="number"
                inputMode="numeric"
                placeholder="G数"
                className="w-full text-sm font-mono rounded px-1 py-3 focus:outline-none bg-white text-center"
                style={{ border: "2px solid #111827" }}
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
                landscape={useLandscape}
              />
            </FormCell>
            <FormCell label="推定MODE">
              <ColoredSelectIcon
                value={form.estimatedMode}
                onChange={(v) => setField("estimatedMode", v)}
                options={[...TG_MODES]}
                colorFn={getModeCellColor}
                labelFn={(v) => v === "不明" ? "不明" : abbrevMode(v)}
                landscape={useLandscape}
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
                landscape={useLandscape}
              />
            </FormCell>
            <FormCell label="イベント">
              <ColoredSelectIcon
                value={form.event}
                onChange={(v) => {
                  setField("event", v);
                  // AT自動ON: エピボ/直撃AT/引き戻し/ロングフリーズ
                  if (["エピソードボーナス", "直撃AT", "引き戻し", "ロングフリーズ"].includes(v)) {
                    setField("atWin", true);
                  }
                }}
                options={["", ...TG_EVENTS]}
                colorFn={getEventCellColor}
                labelFn={(v) => v ? abbrevEvent(v) : "なし"}
                emptyLabel="なし"
                landscape={useLandscape}
              />
            </FormCell>
            <FormCell label="AT初当たり">
              <button
                onClick={() => setField("atWin", !form.atWin)}
                className="w-full font-mono font-bold text-[11px] rounded transition-all active:scale-95"
                style={{
                  ...(form.atWin
                    ? { backgroundColor: "#38761d", color: "#fff", border: "2px solid #111827", boxShadow: "0 0 0 2px #1f2937" }
                    : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #111827" }),
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
                landscape={useLandscape}
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
                landscape={useLandscape}
              />
            </FormCell>
          </div>
        </div>

        {/* ── CZ内容カウンター ── */}
        {(() => {
          const cz = form.czCounter ?? { bell: 0, replay: 0, weakRare: 0, strongRare: 0, hitRole: "" };
          const hasHit = !!cz.hitRole;
          const isOogui = form.event === "大喰いの利世";
          const bgImg      = isOogui ? "/images/rize_pre_hit.jpg"    : "/images/pre_hit.png";
          const hitImg1    = isOogui ? "/images/rize_after_hit.jpg"  : "/images/after_hit.png";
          const hitImg2    = isOogui ? "/images/rize_after_hit_1.jpg": "/images/after_hit_2.png";
          return (
            <div className="relative rounded border border-gray-400 overflow-hidden">
              {/* 背景画像: pre_hit（うっすら） */}
              <div className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `url(${bgImg})`,
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
                      ? `url(${hitImg1})`
                      : `url(${hitImg2})`,
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
                    <div key={key} className="flex items-center" style={{ minHeight: "48px", borderBottom: "2px solid #111827" }}>
                      <div className="flex items-center justify-center font-mono font-bold text-[13px] shrink-0"
                        style={{ width: "68px", height: "48px", backgroundColor: bg, color, borderRight: "2px solid #111827" }}>
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
                        style={{ width: "48px", height: "48px", border: "2px solid #111827", borderRadius: "4px", marginRight: "4px",
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
        <Section title="前兆履歴" bgImage="/images/tokyo_joku.jpg">
          <div className="grid grid-cols-3 gap-2">
            {([...TG_ZENCHO_ZONES] as string[]).map((zone) => (
              <ZenchoSlot
                key={zone}
                zone={zone}
                value={getZenchoType(zone)}
                onChange={(type) => setZencho(zone, type)}
                landscape={useLandscape}
              />
            ))}
          </div>
        </Section>

        {/* ── 招待状 (nd-10) — 5スロット独立プルダウン ── */}
        <Section title="招待状（最大5回）" bgImage="/images/invitationcard.jpg">
          <MultiSlotPicker
            values={form.invitation}
            options={[...TG_INVITATIONS]}
            onChange={(vals) => setField("invitation", vals)}
            displayFn={invShortLabel}
            accentColor="#5b21b6"
            borderActive="#7c3aed"
            landscape={useLandscape}
          />
          <p className="text-[8px] text-gray-400 font-mono mt-1.5">各スロットを独立してタップ選択できます</p>
        </Section>

        {/* ── アイキャッチ（5スロット独立プルダウン） ── */}
        <Section title="アイキャッチ（複数記録可）" bgImage="/images/eye_catch.jpg">
          <MultiSlotPicker
            values={Array.isArray(form.eyecatch) ? form.eyecatch : (form.eyecatch ? [form.eyecatch] : [])}
            options={[...TG_EYECATCH]}
            onChange={(vals) => setField("eyecatch", vals)}
            colorFn={(v) => v === "赫眼/喰種ver." ? { backgroundColor: "#b91c1c", color: "#ffffff" } : { backgroundColor: "#374151", color: "#ffffff" }}
            landscape={useLandscape}
          />
        </Section>

        {/* ── 赫眼状態 (nd-12) — 5スロット独立プルダウン + 後追い確定ボタン ── */}
        <Section title="赫眼状態（最大5回）" bgImage="/images/kakugan.jpg">
          <MultiSlotPicker
            values={form.kakugan}
            options={[...TG_KAKUGAN]}
            onChange={(vals) => setField("kakugan", vals)}
            accentColor="#b91c1c"
            borderActive="#991b1b"
            landscape={useLandscape}
          />
          {/* 後追い確定ボタン: 通常→AT へ赫眼が継続する場面で、継続Gが未確定でも先に発生だけマークしたい時に使う */}
          <button
            onClick={handleStartPendingKakugan}
            disabled={pendingKakuganActive}
            className="w-full mt-2 py-3 rounded-lg font-mono font-bold text-[12px] active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100"
            style={{
              backgroundColor: pendingKakuganActive ? "#9ca3af" : "#b91c1c",
              color: "#ffffff",
              border: "2px solid #7f1d1d",
              boxShadow: pendingKakuganActive ? "none" : "0 2px 8px rgba(185,28,28,0.35)",
            }}
          >
            {pendingKakuganActive
              ? "他の赫眼が保留中（先にバナーから確定）"
              : "🔴 赫眼発生（継続Gは後で確定）"}
          </button>
          <p className="text-[9px] text-gray-500 font-mono mt-1.5 leading-snug">
            この周期で赫眼が発生したことだけを記録し、最終的な継続G数は画面遷移後に追従バナーから確定できます。
          </p>
        </Section>

        {/* ── 精神世界 (nd-14) — 5スロット 2階建てピッカー（上: ゲーム数 / 下: 当選契機） ── */}
        <Section title="精神世界（最大5回）" bgImage="/images/seishin_sekai.jpg">
          <MultiSlotPicker
            values={form.shinsekai}
            options={[...TG_SHINSEKAI]}
            onChange={(vals) => setField("shinsekai", vals)}
            accentColor="#1e40af"
            borderActive="#1d4ed8"
            landscape={useLandscape}
            tier2={{
              values: form.shinsekaiTrigger ?? [],
              options: [...TG_SHINSEKAI_TRIGGER],
              onChange: (vals) => setField("shinsekaiTrigger", vals),
              accentColor: "#7c3aed",
              borderActive: "#6d28d9",
              label: "当選契機",
            }}
          />

          {/* セッション全体の弱レア役カウンター（常時表示・どの周期からも同じ値を編集） */}
          <div className="mt-3 space-y-2">
            <p className="text-[9px] font-mono text-gray-500 leading-tight">
              精神世界中の弱レア役（セッション全体・全周期で共通カウンター）
            </p>
            <div
              className="rounded border-2 overflow-hidden"
              style={{ borderColor: "#1d4ed8" }}
            >
              <div
                className="flex items-center justify-between px-2 py-1"
                style={{ backgroundColor: "#1e40af", color: "#ffffff" }}
              >
                <span className="text-[10px] font-mono font-bold tracking-wide">
                  弱レア役 / セッション合計
                </span>
              </div>
              <ShinsekaiCounterRow
                label="ハズレ"
                bg="#fce4ec"
                color="#880e4f"
                value={shinsekaiWeakRare?.miss ?? 0}
                onPlus={() => bumpShinsekaiWeakRare("miss", 1)}
                onMinus={() => bumpShinsekaiWeakRare("miss", -1)}
              />
              <ShinsekaiCounterRow
                label="当選"
                bg="#c8e6c9"
                color="#1b5e20"
                value={shinsekaiWeakRare?.win ?? 0}
                onPlus={() => bumpShinsekaiWeakRare("win", 1)}
                onMinus={() => bumpShinsekaiWeakRare("win", -1)}
              />
            </div>
          </div>
        </Section>

        {/* ── フリーメモ (nd-16) ── */}
        <Section title="フリ���メモ">
          <textarea
            placeholder="メモを入力..."
            className="w-full rounded px-2 py-2 text-[12px] font-mono focus:outline-none resize-none bg-white"
            style={{ border: "2px solid #111827" }}
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
      <NormalSaveBar onTempSave={handleTempSave} onSave={handleSave} />

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
                    id: instanceId,
                    ...form,
                    jisshuG: finalG,
                    yame: true,
                    createdAt: block?.createdAt ?? new Date().toISOString(),
                  };
                  flushCzOutcome();
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
    </>
  );
}

// ─── MultiSlotPicker (nd-10/12/14 用) ─────────────────────────────────────────
// 5個のスロットを並べ、各スロットが独立してプルダウン選択できる形式

function MultiSlotPicker({
  values, options, onChange, displayFn, colorFn,
  accentColor = "#374151", borderActive = "#374151",
  maxSlots = MAX_SLOTS, slotHeight = 60,
  landscape = false,
  tier2,
}: {
  values: string[];
  options: string[];
  onChange: (vals: string[]) => void;
  displayFn?: (v: string) => string;
  colorFn?: (v: string) => { backgroundColor: string; color: string };
  accentColor?: string;
  borderActive?: string;
  maxSlots?: number;
  slotHeight?: number;
  landscape?: boolean;
  /** 2階建てピッカー（精神世界 当選契機 用）。tier1 と同じ index に紐づく独立選択肢。 */
  tier2?: {
    values: string[];
    options: string[];
    onChange: (vals: string[]) => void;
    accentColor?: string;
    borderActive?: string;
    label?: string;
    slotHeight?: number;
  };
}) {
  function setSlot(index: number, value: string) {
    const next = [...values];
    while (next.length <= index) next.push("");
    next[index] = value;
    while (next.length > 0 && next[next.length - 1] === "") next.pop();
    onChange(next);
  }

  function setTier2Slot(index: number, value: string) {
    if (!tier2) return;
    const next = [...tier2.values];
    while (next.length <= index) next.push("");
    next[index] = value;
    while (next.length > 0 && next[next.length - 1] === "") next.pop();
    tier2.onChange(next);
  }

  const tier2Accent = tier2?.accentColor ?? "#475569";
  const tier2Border = tier2?.borderActive ?? "#334155";
  const tier2Height = tier2?.slotHeight ?? 44;

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {Array.from({ length: maxSlots }, (_, i) => {
        const value = values[i] ?? "";
        const hasValue = value !== "";
        const displayLabel = hasValue ? (displayFn ? displayFn(value) : value) : "—";

        const tier2Value = tier2?.values[i] ?? "";
        const tier2HasValue = tier2Value !== "";

        return (
          <div key={i} className="flex flex-col rounded overflow-hidden border-2"
            style={hasValue ? { borderColor: borderActive } : { borderColor: "#6b7280" }}>
            {/* スロット番号 */}
            <div className="text-center text-[8px] font-mono py-0.5 leading-none"
              style={{ backgroundColor: "#f3f4f6", color: "#9ca3af" }}>
              {i + 1}
            </div>
            {/* 選択エリア (tier1) */}
            <div className="relative overflow-hidden" style={{ minHeight: `${slotHeight}px` }}>
              <div
                className="absolute inset-0 flex items-center justify-center px-0.5 pointer-events-none"
                style={hasValue
                  ? (colorFn ? colorFn(value) : { backgroundColor: accentColor, color: "#ffffff" })
                  : { backgroundColor: "#f9fafb", color: "#d1d5db" }
                }
              >
                <span className="text-[9px] font-mono font-bold text-center leading-tight break-all line-clamp-4">
                  {displayLabel}
                </span>
              </div>
              <LandscapeSelectOverlay
                value={value}
                options={["", ...options]}
                onChange={(v) => setSlot(i, v)}
                landscape={landscape}
                emptyLabel="—"
                optionLabel={displayFn}
              />
            </div>
            {/* 選択エリア (tier2 — 当選契機) */}
            {tier2 && (
              <>
                {tier2.label && (
                  <div className="text-center text-[8px] font-mono py-0.5 leading-none border-t"
                    style={{ backgroundColor: "#f1f5f9", color: "#64748b", borderColor: "#e2e8f0" }}>
                    {tier2.label}
                  </div>
                )}
                <div className="relative overflow-hidden border-t"
                  style={{ minHeight: `${tier2Height}px`, borderColor: tier2HasValue ? tier2Border : "#e5e7eb" }}>
                  <div
                    className="absolute inset-0 flex items-center justify-center px-0.5 pointer-events-none"
                    style={tier2HasValue
                      ? { backgroundColor: tier2Accent, color: "#ffffff" }
                      : { backgroundColor: "#f9fafb", color: "#d1d5db" }
                    }
                  >
                    <span className="text-[9px] font-mono font-bold text-center leading-tight break-all line-clamp-3">
                      {tier2HasValue ? tier2Value : "—"}
                    </span>
                  </div>
                  <LandscapeSelectOverlay
                    value={tier2Value}
                    options={["", ...tier2.options]}
                    onChange={(v) => setTier2Slot(i, v)}
                    landscape={landscape}
                    emptyLabel="—"
                  />
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── ShinsekaiCounterRow (精神世界 弱レア役 ハズレ/当選 +/- カウンター) ────────

function ShinsekaiCounterRow({
  label, bg, color, value, onPlus, onMinus,
}: {
  label: string;
  bg: string;
  color: string;
  value: number;
  onPlus: () => void;
  onMinus: () => void;
}) {
  return (
    <div
      className="flex items-center"
      style={{ minHeight: "44px", borderTop: "2px solid #111827" }}
    >
      <div
        className="flex items-center justify-center font-mono font-bold text-[12px] shrink-0"
        style={{ width: "68px", height: "44px", backgroundColor: bg, color, borderRight: "2px solid #111827" }}
      >
        {label}
      </div>
      <div className="flex items-center gap-1.5 flex-1 justify-center px-1">
        <button
          onClick={onPlus}
          className="w-9 h-9 rounded-full font-mono font-black text-[8px] active:scale-95 transition-transform"
          style={{ backgroundColor: "#c8e6c9", color: "#1b5e20" }}
        >
          PUSH
        </button>
        <button
          onClick={onMinus}
          className="w-9 h-9 rounded-full font-mono font-black text-sm active:scale-95 transition-transform"
          style={{ backgroundColor: "#fce4ec", color: "#880e4f" }}
        >
          -1
        </button>
      </div>
      <div
        className="flex items-center justify-center font-mono font-black text-xl shrink-0"
        style={{
          width: "48px", height: "44px", border: "2px solid #111827", borderRadius: "4px", marginRight: "4px",
          backgroundColor: value > 0 ? "#1f2937" : "#f9fafb",
          color: value > 0 ? "#ffffff" : "#9ca3af",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// ─── ZenchoSlot (nd-9) ────────────────────────────────────────────────────────

const ZENCHO_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  "前兆":     { bg: "#1565c0", color: "#ffffff" },
  "東京上空": { bg: "#c62828", color: "#ffffff" },
  "前兆なし": { bg: "#78909c", color: "#ffffff" },
  "不明":     { bg: "#fde68a", color: "#92400e" }, // 「ウォッチしたが判定不能」をデフォルト「ー」と区別する黄色系
};

function ZenchoSlot({ zone, value, onChange, landscape }: {
  zone: string;
  value: string;
  onChange: (v: string) => void;
  landscape: boolean;
}) {
  // 選択肢の意味:
  //   ""        = ユーザーが手をつけていない（無視した）→ 表示は「ー」
  //   "前兆"     = 本前兆演出あり
  //   "東京上空" = 東京上空ステージ
  //   "前兆なし" = 前兆ステージに上がらなかった
  //   "不明"     = ウォッチしたが判定不能だった
  // 即前兆ゾーン: 性質上「東京上空」のみが意味を持つ前兆判定。判定不能なら「不明」を選べる。
  const options: string[] = zone === "即前兆"
    ? ["", "東京上空", "不明"]
    : ["", ...TG_ZENCHO_TYPES];

  const hasValue = value !== "";
  const col = hasValue ? ZENCHO_TYPE_COLORS[value] : null;
  const zoneLabel = zone === "即前兆" ? "即前兆" : `${zone}G`;

  return (
    <div
      className="flex flex-col rounded border-2 overflow-hidden"
      style={hasValue ? { borderColor: "#374151" } : { borderColor: "#6b7280" }}
    >
      {/* 上段: ゾーン数（即前兆はそのままラベル） */}
      <div
        className="text-center text-[9px] font-mono font-bold py-1 leading-none"
        style={{ backgroundColor: "#dde0e3", color: "#6b7280" }}
      >
        {zoneLabel}
      </div>
      {/* 下段: プルダウン選択。"" = ユーザー未対応の「ー」、"不明" = 判定不能 */}
      <div className="relative" style={{ minHeight: "52px" }}>
        <div
          className="absolute inset-0 flex items-center justify-center px-0.5 pointer-events-none"
          style={{
            backgroundColor: col ? col.bg : "#f9fafb",
            color: col ? col.color : "#9ca3af",
          }}
        >
          {hasValue ? (
            <span className="text-[10px] font-mono font-bold text-center leading-tight">
              {value}
            </span>
          ) : (
            <span className="text-[13px] font-mono font-bold leading-tight">ー</span>
          )}
        </div>
        <LandscapeSelectOverlay
          value={value}
          options={options}
          onChange={onChange}
          landscape={landscape}
          emptyLabel="ー"
          title={`${zoneLabel} 前兆履歴`}
        />
      </div>
    </div>
  );
}

// ─── 共通サブコンポーネント ───────────────────────────────────────────────────

function Section({ title, children, bgImage }: { title: string; children: React.ReactNode; bgImage?: string }) {
  return (
    <div className="relative bg-white rounded border-2 border-gray-700 px-3 pt-3 pb-4 overflow-hidden shadow-md">
      {bgImage && (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url('${bgImage}')`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            opacity: 0.25,
          }}
        />
      )}
      <div className="relative z-10">
        <div
          className="inline-flex items-center gap-2 mb-3 px-3 py-1.5 rounded"
          style={{ backgroundColor: "#1f2937", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
        >
          <span className="block w-1.5 h-5 rounded-sm" style={{ backgroundColor: "#fbbf24" }} />
          <span className="text-[14px] font-mono font-black tracking-wider text-white uppercase">{title}</span>
        </div>
        {children}
      </div>
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
  value, onChange, options, colorFn, labelFn, emptyLabel = "未選択", landscape = false,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  colorFn?: (v: string) => CellColor;
  labelFn?: (v: string) => string;
  emptyLabel?: string;
  landscape?: boolean;
}) {
  const hasValue = value !== "" && value !== undefined;
  const color: CellColor | null = hasValue && colorFn ? colorFn(value) : null;
  const displayLabel = hasValue ? (labelFn ? labelFn(value) : value) : emptyLabel;

  return (
    <div
      className="relative rounded overflow-hidden"
      style={{ minHeight: "56px", border: "2px solid #111827" }}
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
      <LandscapeSelectOverlay
        value={value}
        options={options}
        onChange={onChange}
        landscape={landscape}
        emptyLabel={emptyLabel}
        optionLabel={labelFn}
      />
    </div>
  );
}

// ─── 一時保存フィードバック付きSaveBar ────────────────────────────────────────

function NormalSaveBar({ onTempSave, onSave }: { onTempSave: () => void; onSave: () => void }) {
  const [tempSaved, setTempSaved] = useState(false);

  function handleTempSave() {
    onTempSave();
    setTempSaved(true);
    setTimeout(() => setTempSaved(false), 1200);
  }

  return (
    <div className="flex-shrink-0 bg-white border-t-2 border-gray-400 safe-area-bottom px-4 py-3">
      <div className="flex gap-2">
        <button
          onClick={handleTempSave}
          disabled={tempSaved}
          className="flex-1 font-mono font-bold text-base py-5 rounded-xl border-2 transition-all duration-300 disabled:opacity-90"
          style={tempSaved
            ? { backgroundColor: "#16a34a", color: "#ffffff", borderColor: "#16a34a", transform: "scale(0.97)" }
            : { backgroundColor: "#ffffff", color: "#374151", borderColor: "#9ca3af" }
          }
        >
          {tempSaved ? "✓ 保存しました" : "一時保存"}
        </button>
        <button
          onClick={onSave}
          className="flex-1 font-mono font-bold text-base py-5 rounded-xl shadow-lg active:scale-95 transition-transform text-white"
          style={{ backgroundColor: "#b91c1c" }}
        >
          保存
        </button>
      </div>
    </div>
  );
}
