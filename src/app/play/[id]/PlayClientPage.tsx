"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 実戦セッション Client Shell
// データ永続化: localStorage を一次ストレージとして使用
// (Supabase 認証バイパス中のため API 保存は行わない)
// =============================================================================

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlaySession, NormalBlock } from "@/types";
import { useSessionStore } from "@/store/useSessionStore";
import { NormalBlockList } from "@/components/tg/NormalBlockList";
import { NormalBlockEditDashboard } from "@/components/tg/NormalBlockEditDashboard";
import { lsLoadSession, lsSaveSession } from "@/lib/tg/localStore";

interface PlayClientPageProps {
  initialSession: PlaySession;
}

function computeAtLabels(blocks: NormalBlock[]): Map<string, string> {
  const map = new Map<string, string>();
  let count = 0;
  for (const block of blocks) {
    if (block.atWin) { count++; map.set(block.id, `AT${count}`); }
  }
  return map;
}

interface EditingState {
  open: boolean;
  block: NormalBlock | null;
  index: number;
}

const CLOSED: EditingState = { open: false, block: null, index: 0 };

export function PlayClientPage({ initialSession }: PlayClientPageProps) {
  const router = useRouter();
  const loadSession       = useSessionStore((s) => s.loadSession);
  const clearSession      = useSessionStore((s) => s.clearSession);
  const session           = useSessionStore((s) => s.session);
  const appendNormalBlock = useSessionStore((s) => s.appendNormalBlock);
  const updateNormalBlock = useSessionStore((s) => s.updateNormalBlock);
  const deleteNormalBlock = useSessionStore((s) => s.deleteNormalBlock);

  const [editing, setEditing] = useState<EditingState>(CLOSED);

  // ── 起動時: localStorage を優先して復元 ──────────────────────────────────
  useEffect(() => {
    const local = lsLoadSession(initialSession.id);
    // localStorage に保存済みデータがあればそちらを使用
    if (local && local.normalBlocks.length >= initialSession.normalBlocks.length) {
      loadSession(local);
    } else {
      loadSession(initialSession);
    }
    return () => clearSession();
  }, [initialSession.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── state 変更時: localStorage に即時保存 ────────────────────────────────
  const lastSavedRef = useRef<string>("");
  const persistSession = useCallback((s: PlaySession) => {
    const json = JSON.stringify(s);
    if (json === lastSavedRef.current) return; // 変更なければスキップ
    lastSavedRef.current = json;
    lsSaveSession(s);
  }, []);

  useEffect(() => {
    if (session && session.id === initialSession.id) persistSession(session);
  }, [session, initialSession.id, persistSession]);

  const blocks   = session?.normalBlocks ?? [];
  const atLabels = computeAtLabels(blocks);
  const atCount  = blocks.filter((b) => b.atWin).length;

  function handleEdit(block: NormalBlock, index: number) {
    setEditing({ open: true, block, index: index + 1 });
  }

  function handleOpenNew() {
    setEditing({ open: true, block: null, index: blocks.length + 1 });
  }

  function handleSave(block: NormalBlock) {
    if (editing.block === null) appendNormalBlock(block);
    else updateNormalBlock(block.id, block);
    setEditing(CLOSED);
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>

      {/* ===== ヘッダー (固定) ===== */}
      <header
        className="flex-none border-b-2 border-gray-600 safe-area-top shadow-md"
        style={{ backgroundColor: "#1f2937" }}
      >
        <div className="max-w-2xl mx-auto px-3 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-gray-300 hover:text-white text-sm font-mono flex-shrink-0 transition-colors"
          >
            ← 戻る
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono font-bold text-white truncate">
              {session?.machineName ?? "セッション"}
            </p>
            <p className="text-[10px] font-mono text-gray-400">
              通常時 · {blocks.length} 周期
            </p>
          </div>
          {atCount > 0 && (
            <span className="text-xs font-mono font-bold text-green-400 flex-shrink-0">
              AT ×{atCount}
            </span>
          )}
        </div>
      </header>

      {/* ===== メインコンテンツ (スクロール領域) ===== */}
      <main className="flex-1 overflow-y-auto min-h-0 max-w-2xl w-full mx-auto pb-32">
        <NormalBlockList
          blocks={blocks}
          atLabels={atLabels}
          onEdit={handleEdit}
          onDelete={(blockId) => deleteNormalBlock(blockId)}
        />
      </main>

      {/* ===== FAB: 周期追加 ===== */}
      {!editing.open && (
        <div className="fixed bottom-6 right-4 z-40">
          <button
            onClick={handleOpenNew}
            className="flex items-center gap-2 bg-v2-red text-white font-mono font-bold text-sm px-5 py-3 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            ＋ 周期追加
          </button>
        </div>
      )}

      {/* ===== 編集ダッシュボード オーバーレイ ===== */}
      {editing.open && (
        <NormalBlockEditDashboard
          block={editing.block}
          blockIndex={editing.index}
          onSave={handleSave}
          onClose={() => setEditing(CLOSED)}
        />
      )}
    </div>
  );
}
