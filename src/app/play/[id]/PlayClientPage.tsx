"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 実戦セッション Client Shell
// タブ: 通常時 | AT記録
// =============================================================================

import { useEffect, useCallback, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { PlaySession, NormalBlock, TGATRow, TGATSet, TGATEntry, UchidashiState, ShushiData } from "@/types";
import { useSessionStore } from "@/store/useSessionStore";
import { NormalBlockList } from "@/components/tg/NormalBlockList";
import { NormalBlockEditDashboard } from "@/components/tg/NormalBlockEditDashboard";
import { ATBlockList } from "@/components/tg/ATBlockList";
import { ATBlockEditDashboard } from "@/components/tg/ATBlockEditDashboard";
import { SummaryTab } from "@/components/tg/SummaryTab";
import { UchidashiEditDashboard } from "@/components/tg/UchidashiEditDashboard";
import { ShushiEditDashboard } from "@/components/tg/ShushiEditDashboard";
import { lsSaveSession, flushPendingSaves, onSyncStatusChange, type SyncStatus } from "@/lib/tg/localStore";
import { estimateAllModes } from "@/lib/engine/modeEstimation";
import { captureAndDownload, captureAndShare } from "@/lib/tg/captureImage";
import { inferSetting } from "@/components/tg/SummaryTab";

interface PlayClientPageProps {
  initialSession: PlaySession;
}

// ── AT番号リストを通常ブロックから導出 ──────────────────────────────────────────
function computeAtLabels(blocks: NormalBlock[]): Map<string, string> {
  const map = new Map<string, string>();
  let count = 0;
  for (const block of blocks) {
    if (block.atWin) { count++; map.set(block.id, `AT${count}`); }
  }
  return map;
}

function computeAtKeyList(blocks: NormalBlock[]): string[] {
  let count = 0;
  return blocks.filter((b) => b.atWin).map(() => `AT${++count}`);
}

// ── 通常時編集状態 ───────────────────────────────────────────────────────────
interface NormalEditingState {
  open: boolean;
  block: NormalBlock | null;
  index: number;
}
const NORMAL_CLOSED: NormalEditingState = { open: false, block: null, index: 0 };

// ── AT編集状態 ───────────────────────────────────────────────────────────────
interface ATEditingState {
  open: boolean;
  atKey: string;
  row: TGATRow | null;
  defaultRowType: "set" | "arima";
  defaultAtType?: string;
}
const AT_CLOSED: ATEditingState = { open: false, atKey: "", row: null, defaultRowType: "set" };

export function PlayClientPage({ initialSession }: PlayClientPageProps) {
  const router = useRouter();

  const loadSession        = useSessionStore((s) => s.loadSession);
  const clearSession       = useSessionStore((s) => s.clearSession);
  const session            = useSessionStore((s) => s.session);
  const appendNormalBlock  = useSessionStore((s) => s.appendNormalBlock);
  const updateNormalBlock  = useSessionStore((s) => s.updateNormalBlock);
  const deleteNormalBlock  = useSessionStore((s) => s.deleteNormalBlock);
  const appendTGATEntry    = useSessionStore((s) => s.appendTGATEntry);
  const appendTGATRow      = useSessionStore((s) => s.appendTGATRow);
  const updateTGATRow      = useSessionStore((s) => s.updateTGATRow);
  const deleteTGATRow         = useSessionStore((s) => s.deleteTGATRow);
  const updateUchidashi       = useSessionStore((s) => s.updateUchidashi);
  const updateShushi          = useSessionStore((s) => s.updateShushi);
  const updateUserSettingGuess = useSessionStore((s) => s.updateUserSettingGuess);

  const [activeTab,    setActiveTab]    = useState<"normal" | "at" | "summary">("normal");
  const [normalEdit,   setNormalEdit]   = useState<NormalEditingState>(NORMAL_CLOSED);
  const [atEdit,       setATEdit]       = useState<ATEditingState>(AT_CLOSED);
  const [uchidashiOpen, setUchidashiOpen] = useState(false);
  const [shushiOpen,    setShushiOpen]    = useState(false);
  const [settingGuessOpen, setSettingGuessOpen] = useState(false);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>("synced");

  // ── 起動: DBが絶対正義 → localStorageに無条件上書き ─────────────────────
  useEffect(() => {
    // initialSession はSSRでDBから取得済み → これを正とする
    loadSession(initialSession);
    // localStorageにDB内容を無条件書き戻し
    try {
      localStorage.setItem(`tgr_session_${initialSession.id}`, JSON.stringify(initialSession));
    } catch {}
    // 未保存データがあればリカバリ
    flushPendingSaves();
    return () => clearSession();
  }, [initialSession.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── 同期状態の監視 ──────────────────────────────────────────────────────
  useEffect(() => {
    return onSyncStatusChange(setSyncStatus);
  }, []);

  // ── 変更時: localStorage 即時保存 ──────────────────────────────────────────
  const lastSavedRef = useRef<string>("");
  const persistSession = useCallback((s: PlaySession) => {
    const json = JSON.stringify(s);
    if (json === lastSavedRef.current) return;
    lastSavedRef.current = json;
    lsSaveSession(s);
  }, []);

  useEffect(() => {
    if (session && session.id === initialSession.id) persistSession(session);
  }, [session, initialSession.id, persistSession]);

  const blocks     = session?.normalBlocks ?? [];
  const atEntries  = session?.atEntries   ?? [];
  const uchidashi        = session?.uchidashi        ?? null;
  const shushi           = session?.shushi           ?? null;
  const userSettingGuess = session?.userSettingGuess ?? null;

  // ヘッダー用サマリー
  const totalGames = blocks.reduce((s, b) => s + (b.jisshuG ?? 0), 0);
  const headerBalance = shushi
    ? (shushi.exchangeCoins ?? 0) - ((shushi.handCoins ?? 0) + (shushi.cashInvestK ?? 0) * shushi.coinRate)
    : null;
  const headerSetting = useMemo(() => {
    const czFail = blocks.filter((b) => b.endingSuggestion.startsWith("[cz失敗]")).map((b) => b.endingSuggestion);
    const allSets = atEntries.flatMap((e) => e.rows.filter((r): r is import("@/types").TGATSet => r.rowType === "set"));
    const endScreen = allSets.map((s) => s.endingSuggestion ?? "").filter((s) => s.startsWith("[終了画面]"));
    return inferSetting(czFail, endScreen, blocks, atEntries);
  }, [blocks, atEntries]);
  const atLabels   = computeAtLabels(blocks);
  const atKeyList  = computeAtKeyList(blocks);
  const atCount    = blocks.filter((b) => b.atWin).length;
  const modeProbs  = useMemo(() => estimateAllModes(blocks), [blocks]);

  // ── 通常時ハンドラ ──────────────────────────────────────────────────────────
  function handleNormalEdit(block: NormalBlock, index: number) {
    setNormalEdit({ open: true, block, index: index + 1 });
  }
  const [showEmptyBlockAlert, setShowEmptyBlockAlert] = useState(false);
  function handleNormalOpenNew() {
    // 空白チェック: 最後の周期に実G数が未入力なら追加不可
    if (blocks.length > 0) {
      const last = blocks[blocks.length - 1];
      if (last.jisshuG == null) {
        setShowEmptyBlockAlert(true);
        return;
      }
    }
    setNormalEdit({ open: true, block: null, index: blocks.length + 1 });
  }
  function handleNormalTempSave(block: NormalBlock) {
    if (normalEdit.block === null) {
      appendNormalBlock(block);
      setNormalEdit((prev) => ({ ...prev, block })); // ID確定後に参照を更新
    } else {
      updateNormalBlock(block.id, block);
    }
  }
  function handleNormalSave(block: NormalBlock) {
    if (normalEdit.block === null) appendNormalBlock(block);
    else updateNormalBlock(block.id, block);
    setNormalEdit(NORMAL_CLOSED);
  }

  // ── ATハンドラ ─────────────────────────────────────────────────────────────
  function handleATAddRow(atKey: string, rowType: "set" | "arima") {
    // 空白チェック: 最後のSET行にキャラ未設定なら追加不可
    const entry = atEntries.find((e) => e.atKey === atKey);
    if (entry && entry.rows.length > 0) {
      const lastRow = entry.rows[entry.rows.length - 1];
      if (lastRow.rowType === "set" && !lastRow.character) {
        setShowEmptyBlockAlert(true);
        return;
      }
    }
    // ATEntryが存在しない場合は自動生成
    if (!entry) {
      appendTGATEntry({ atKey, rows: [] });
    }
    // 直前のSET行のAT種別を引き継ぐ
    const sets = (entry?.rows ?? []).filter((r): r is TGATSet => r.rowType === "set");
    const defaultAtType = sets.length > 0 ? sets[sets.length - 1].atType : undefined;
    setATEdit({ open: true, atKey, row: null, defaultRowType: rowType, defaultAtType });
  }

  function handleATEditRow(atKey: string, row: TGATRow) {
    setATEdit({ open: true, atKey, row, defaultRowType: row.rowType });
  }

  function handleATTempSave(row: TGATRow) {
    const { atKey } = atEdit;
    if (!atEntries.find((e) => e.atKey === atKey)) {
      appendTGATEntry({ atKey, rows: [row] });
      setATEdit((prev) => ({ ...prev, row }));
    } else if (atEdit.row === null) {
      appendTGATRow(atKey, row);
      setATEdit((prev) => ({ ...prev, row }));
    } else {
      updateTGATRow(atKey, row.id, row);
    }
  }
  function handleATSave(row: TGATRow) {
    const { atKey } = atEdit;
    if (!atEntries.find((e) => e.atKey === atKey)) {
      const newEntry: TGATEntry = { atKey, rows: [row] };
      appendTGATEntry(newEntry);
    } else if (atEdit.row === null) {
      appendTGATRow(atKey, row);
    } else {
      updateTGATRow(atKey, row.id, row);
    }
    setATEdit(AT_CLOSED);
  }

  function handleATDeleteRow(atKey: string, rowId: string) {
    deleteTGATRow(atKey, rowId);
  }

  const normalListRef = useRef<HTMLDivElement>(null);
  const atListRef = useRef<HTMLDivElement>(null);

  const anyEditOpen = normalEdit.open || atEdit.open || uchidashiOpen || shushiOpen || settingGuessOpen;

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>

      {/* ===== ヘッダー ===== */}
      <header
        className="flex-none border-b-2 border-gray-600 safe-area-top shadow-md"
        style={{ backgroundColor: "#1f2937" }}
      >
        <div className="max-w-2xl mx-auto px-3 py-1.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/dashboard")}
              className="text-gray-300 hover:text-white text-sm font-mono flex-shrink-0 transition-colors"
            >
              ← 戻る
            </button>
            <p className="text-sm font-mono font-bold text-white truncate flex-1 min-w-0">
              {session?.machineName ?? "セッション"}
            </p>
            <SyncIndicator status={syncStatus} />
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {totalGames > 0 && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "#e0e7ff", color: "#3730a3" }}>
                総G数 {totalGames.toLocaleString()}G
              </span>
            )}
            {atCount > 0 && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{ backgroundColor: "#dcfce7", color: "#14532d" }}>
                AT初当たり {atCount}回
              </span>
            )}
            {headerBalance != null && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: headerBalance >= 0 ? "#f0fdf4" : "#fef2f2",
                  color: headerBalance >= 0 ? "#16a34a" : "#dc2626",
                }}>
                収支 {headerBalance >= 0 ? "+" : ""}{headerBalance.toLocaleString()}枚
              </span>
            )}
            {headerSetting && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded truncate max-w-[140px]"
                style={{ backgroundColor: "#fef3c7", color: "#92400e" }}>
                確定 {headerSetting}
              </span>
            )}
            {userSettingGuess && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded truncate"
                style={{ backgroundColor: "#fce7f3", color: "#9d174d" }}>
                推測 {userSettingGuess}
              </span>
            )}
          </div>
        </div>

        {/* タブバー */}
        <div className="flex border-t border-gray-700 max-w-2xl mx-auto w-full">
          <button
            onClick={() => setActiveTab("normal")}
            className="flex-1 py-2 text-[11px] font-mono font-bold transition-colors"
            style={
              activeTab === "normal"
                ? { color: "#f9fafb", borderBottom: "2px solid #ef4444" }
                : { color: "#6b7280", borderBottom: "2px solid transparent" }
            }
          >
            通常時
          </button>
          <button
            onClick={() => setActiveTab("at")}
            className="flex-1 py-2 text-[11px] font-mono font-bold transition-colors"
            style={
              activeTab === "at"
                ? { color: "#f9fafb", borderBottom: "2px solid #ef4444" }
                : { color: "#6b7280", borderBottom: "2px solid transparent" }
            }
          >
            AT記録 {atCount > 0 ? `(${atCount})` : ""}
          </button>
          <button
            onClick={() => setActiveTab("summary")}
            className="flex-1 py-2 text-[11px] font-mono font-bold transition-colors"
            style={
              activeTab === "summary"
                ? { color: "#f9fafb", borderBottom: "2px solid #ef4444" }
                : { color: "#6b7280", borderBottom: "2px solid transparent" }
            }
          >
            集計
          </button>
        </div>
      </header>

      {/* ===== メインコンテンツ ===== */}
      <main className="flex-1 overflow-y-auto min-h-0 max-w-2xl w-full mx-auto pb-24">

        {/* 通常時タブ */}
        {activeTab === "normal" && (
          <>
            <div className="flex justify-end gap-1.5 px-3 py-1.5 border-b border-gray-200">
              <button
                onClick={() => normalListRef.current && captureAndShare(normalListRef.current, `TG_Normal_${new Date().toISOString().slice(0, 10)}.png`, `#東京喰種レゾナンス #パチスロ`)}
                className="text-[10px] font-mono px-3 py-1 rounded text-white active:scale-95 transition-transform"
                style={{ backgroundColor: "#000000" }}
              >
                𝕏 共有
              </button>
              <button
                onClick={() => normalListRef.current && captureAndDownload(normalListRef.current, `TG_Normal_${new Date().toISOString().slice(0, 10)}.png`)}
                className="text-[10px] font-mono px-3 py-1 rounded bg-gray-700 text-white active:scale-95 transition-transform"
              >
                画像で保存
              </button>
            </div>

            {/* ── 打ち出し状態・収支 表示セクション ── */}
            {(uchidashi || shushi) && (
              <div className="px-3 pt-2 pb-1 space-y-2">
                {uchidashi && <UchidashiDisplayCard data={uchidashi} onEdit={() => setUchidashiOpen(true)} />}
                {shushi && <ShushiDisplayCard data={shushi} onEdit={() => setShushiOpen(true)} />}
              </div>
            )}

            <div ref={normalListRef}>
              <NormalBlockList
                blocks={blocks}
                atLabels={atLabels}
                atEntries={atEntries}
                modeProbs={modeProbs}
                onEdit={handleNormalEdit}
                onDelete={(blockId) => deleteNormalBlock(blockId)}
              />
            </div>
          </>
        )}

        {/* AT記録タブ */}
        {activeTab === "at" && (
          <>
            <div className="flex justify-end gap-1.5 px-3 py-1.5 border-b border-gray-200">
              <button
                onClick={() => atListRef.current && captureAndShare(atListRef.current, `TG_AT_${new Date().toISOString().slice(0, 10)}.png`, `#東京喰種レゾナンス #パチスロ`)}
                className="text-[10px] font-mono px-3 py-1 rounded text-white active:scale-95 transition-transform"
                style={{ backgroundColor: "#000000" }}
              >
                𝕏 共有
              </button>
              <button
                onClick={() => atListRef.current && captureAndDownload(atListRef.current, `TG_AT_${new Date().toISOString().slice(0, 10)}.png`)}
                className="text-[10px] font-mono px-3 py-1 rounded bg-gray-700 text-white active:scale-95 transition-transform"
              >
                画像で保存
              </button>
            </div>
            <div ref={atListRef}>
              <ATBlockList
                atKeyList={atKeyList}
                atEntries={atEntries}
                atEventMap={atLabels}
                blocks={blocks}
                onAddRow={handleATAddRow}
                onEditRow={(atKey, row) => handleATEditRow(atKey, row)}
                onDeleteRow={handleATDeleteRow}
              />
            </div>
          </>
        )}

        {/* 集計タブ */}
        {activeTab === "summary" && (
          <SummaryTab
            blocks={blocks}
            atEntries={atEntries}
            sessionId={initialSession.id}
            userSettingGuess={userSettingGuess}
            uchidashi={uchidashi}
          />
        )}
      </main>

      {/* ===== FAB: 通常時タブのみ ===== */}
      {activeTab === "normal" && !anyEditOpen && (
        <div className="fixed bottom-6 inset-x-0 z-40 flex justify-center gap-2 px-4 max-w-2xl mx-auto">
          <button
            onClick={() => setUchidashiOpen(true)}
            className="flex items-center gap-1 font-mono font-bold text-[13px] px-5 py-3.5 rounded-full shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: "#1e40af", color: "#fff" }}
          >
            打ち出し設定
          </button>
          <button
            onClick={() => setShushiOpen(true)}
            className="flex items-center gap-1 font-mono font-bold text-[13px] px-5 py-3.5 rounded-full shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: "#059669", color: "#fff" }}
          >
            収支入力
          </button>
          <button
            onClick={() => setSettingGuessOpen(true)}
            className="flex items-center gap-1 font-mono font-bold text-[13px] px-5 py-3.5 rounded-full shadow-lg active:scale-95 transition-transform"
            style={{ backgroundColor: "#92400e", color: "#fff" }}
          >
            推測設定
          </button>
          <button
            onClick={handleNormalOpenNew}
            className="flex items-center gap-1 bg-v2-red text-white font-mono font-bold text-[15px] px-6 py-4 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            ＋ 周期追加
          </button>
        </div>
      )}

      {/* ===== 通常時 編集ダッシュボード ===== */}
      {normalEdit.open && (
        <NormalBlockEditDashboard
          block={normalEdit.block}
          blockIndex={normalEdit.index}
          onSave={handleNormalSave}
          onTempSave={handleNormalTempSave}
          onClose={() => setNormalEdit(NORMAL_CLOSED)}
          onYame={(yameBlock) => {
            if (normalEdit.block === null) appendNormalBlock(yameBlock);
            else updateNormalBlock(yameBlock.id, yameBlock);
            setNormalEdit(NORMAL_CLOSED);
          }}
        />
      )}

      {/* ===== AT 編集ダッシュボード ===== */}
      {atEdit.open && (
        <ATBlockEditDashboard
          atKey={atEdit.atKey}
          row={atEdit.row}
          defaultRowType={atEdit.defaultRowType}
          defaultAtType={atEdit.defaultAtType}
          onSave={handleATSave}
          onTempSave={handleATTempSave}
          onClose={() => setATEdit(AT_CLOSED)}
        />
      )}

      {/* ===== 打ち出し状態設定ダッシュボード ===== */}
      {uchidashiOpen && (
        <UchidashiEditDashboard
          data={uchidashi}
          onSave={(data) => { updateUchidashi(data); setUchidashiOpen(false); }}
          onClose={() => setUchidashiOpen(false)}
        />
      )}

      {/* ===== 収支入力ダッシュボード ===== */}
      {shushiOpen && (
        <ShushiEditDashboard
          data={shushi}
          onSave={(data) => { updateShushi(data); setShushiOpen(false); }}
          onClose={() => setShushiOpen(false)}
        />
      )}

      {/* ===== 推測設定入力ポップアップ ===== */}
      {settingGuessOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-4"
          onClick={(e) => e.target === e.currentTarget && setSettingGuessOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4" style={{ backgroundColor: "#92400e" }}>
              <p className="text-white font-mono font-bold text-sm">推測設定入力</p>
              <p className="text-amber-200 text-[10px] font-mono mt-0.5">
                当日の島状況や経験から推測した設定を記録
              </p>
            </div>
            <div className="px-5 py-4">
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: "推定低設定", color: "#6b7280" },
                  { value: "推定4", color: "#2563eb" },
                  { value: "推定456", color: "#7c3aed" },
                  { value: "推定56", color: "#ea580c" },
                  { value: "推定6", color: "#dc2626" },
                ].map(({ value, color }) => (
                  <button
                    key={value}
                    onClick={() => { updateUserSettingGuess(value); setSettingGuessOpen(false); }}
                    className="py-3 rounded-lg font-mono font-bold text-sm active:scale-95 transition-transform"
                    style={{
                      backgroundColor: userSettingGuess === value ? color : "#f9fafb",
                      color: userSettingGuess === value ? "#ffffff" : "#374151",
                      border: `2px solid ${color}`,
                      boxShadow: userSettingGuess === value ? `0 0 0 2px ${color}` : "none",
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex border-t border-gray-200">
              <button
                onClick={() => { updateUserSettingGuess(null); setSettingGuessOpen(false); }}
                className="flex-1 py-3.5 text-sm font-mono text-gray-500 hover:bg-gray-50 border-r border-gray-200"
              >
                クリア
              </button>
              <button
                onClick={() => setSettingGuessOpen(false)}
                className="flex-1 py-3.5 text-sm font-mono font-bold text-gray-700 hover:bg-gray-50"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 空白周期アラート ===== */}
      {showEmptyBlockAlert && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center px-4"
          onClick={(e) => e.target === e.currentTarget && setShowEmptyBlockAlert(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4" style={{ backgroundColor: "#92400e" }}>
              <p className="text-white font-mono font-bold text-sm">入力が必要です</p>
            </div>
            <div className="px-5 py-4 space-y-2">
              <p className="text-gray-700 font-mono text-sm">
                前の行にデータが入力されていません。先に現在の行を入力してから追加してください。
              </p>
            </div>
            <div className="border-t border-gray-200">
              <button onClick={() => setShowEmptyBlockAlert(false)}
                className="w-full py-3.5 text-sm font-mono font-bold text-gray-700 hover:bg-gray-50">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── クラウド同期インジケーター ──────────────────────────────────────────────

function SyncIndicator({ status }: { status: SyncStatus }) {
  const configs: Record<SyncStatus, { bg: string; text: string; icon: string }> = {
    synced:     { bg: "#16a34a", text: "保存済", icon: "●" },
    saving:     { bg: "#2563eb", text: "保存中", icon: "◌" },
    pending:    { bg: "#f59e0b", text: "未同期", icon: "◎" },
    error:      { bg: "#dc2626", text: "同期エラー", icon: "!" },
    auth_error: { bg: "#dc2626", text: "要再ログイン", icon: "!" },
  };
  const config = configs[status];

  return (
    <span
      className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0"
      style={{ backgroundColor: config.bg, color: "#fff" }}
      title={status === "auth_error" ? "認証が切れています。再ログインしてください。" : undefined}
    >
      {config.icon} {config.text}
    </span>
  );
}

// ─── 打ち出し状態 表示カード ─────────────────────────────────────────────────

function UchidashiDisplayCard({ data, onEdit }: { data: UchidashiState; onEdit: () => void }) {
  const items: { label: string; value: string }[] = [];
  if (data.currentGames != null) items.push({ label: "現在G数", value: `${data.currentGames}G` });
  if (data.totalGames != null) items.push({ label: "Total G数", value: `${data.totalGames}G` });
  if (data.samai != null) items.push({ label: "差枚数", value: `${data.samai >= 0 ? "+" : ""}${data.samai}枚` });
  if (data.reminiscence != null) items.push({ label: "レミニセンス", value: `${data.reminiscence}回` });
  if (data.rize != null) items.push({ label: "大食いの利世", value: `${data.rize}回` });
  if (data.episodeBonus != null) items.push({ label: "エピソードBONUS", value: `${data.episodeBonus}回` });

  if (items.length === 0) return null;

  return (
    <div
      className="rounded border px-3 py-2 cursor-pointer active:scale-[0.98] transition-transform"
      style={{ borderColor: "#1e40af", backgroundColor: "#eff6ff" }}
      onClick={onEdit}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-mono font-bold" style={{ color: "#1e40af" }}>打ち出し状態</p>
        <span className="text-[9px] font-mono text-gray-400">タップで編集</span>
      </div>
      <div className="grid grid-cols-3 gap-x-3 gap-y-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-baseline gap-1">
            <span className="text-[9px] font-mono text-gray-500">{item.label}</span>
            <span className="text-[11px] font-mono font-bold text-gray-800">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 収支 表示カード ────────────────────────────────────────────────────────

function ShushiDisplayCard({ data, onEdit }: { data: ShushiData; onEdit: () => void }) {
  const totalInvest = (data.handCoins ?? 0) + (data.cashInvestK ?? 0) * data.coinRate;
  const balance = (data.exchangeCoins ?? 0) - totalInvest;
  const hasData = totalInvest > 0 || (data.exchangeCoins ?? 0) > 0;

  if (!hasData) return null;

  return (
    <div
      className="rounded border-2 px-3 py-2 cursor-pointer active:scale-[0.98] transition-transform"
      style={{
        borderColor: balance >= 0 ? "#16a34a" : "#dc2626",
        backgroundColor: balance >= 0 ? "#f0fdf4" : "#fef2f2",
      }}
      onClick={onEdit}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-mono font-bold" style={{ color: balance >= 0 ? "#16a34a" : "#dc2626" }}>
          収支
        </p>
        <span className="text-[9px] font-mono text-gray-400">タップで編集</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {totalInvest > 0 && (
            <div className="flex items-baseline gap-1">
              <span className="text-[9px] font-mono text-gray-500">投資</span>
              <span className="text-[11px] font-mono font-bold text-gray-700">{totalInvest.toLocaleString()}枚</span>
            </div>
          )}
          {(data.exchangeCoins ?? 0) > 0 && (
            <div className="flex items-baseline gap-1">
              <span className="text-[9px] font-mono text-gray-500">交換</span>
              <span className="text-[11px] font-mono font-bold text-gray-700">{(data.exchangeCoins ?? 0).toLocaleString()}枚</span>
            </div>
          )}
        </div>
        <p
          className="text-base font-mono font-black"
          style={{ color: balance >= 0 ? "#16a34a" : "#dc2626" }}
        >
          {balance >= 0 ? "+" : ""}{balance.toLocaleString()}枚
        </p>
      </div>
    </div>
  );
}
