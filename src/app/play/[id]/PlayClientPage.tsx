"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: 実戦セッション Client Shell
// =============================================================================

import { useEffect, useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PlaySession, NormalBlock } from "@/types";
import { useSessionStore } from "@/store/useSessionStore";
import { NormalBlockList } from "@/components/tg/NormalBlockList";
import { NormalBlockEditDashboard } from "@/components/tg/NormalBlockEditDashboard";

interface PlayClientPageProps {
  initialSession: PlaySession;
}

/** atWin=true のブロックに AT1, AT2... ラベルを割り当てる */
function computeAtLabels(blocks: NormalBlock[]): Map<string, string> {
  const map = new Map<string, string>();
  let count = 0;
  for (const block of blocks) {
    if (block.atWin) {
      count++;
      map.set(block.id, `AT${count}`);
    }
  }
  return map;
}

export function PlayClientPage({ initialSession }: PlayClientPageProps) {
  const router = useRouter();
  const loadSession    = useSessionStore((s) => s.loadSession);
  const clearSession   = useSessionStore((s) => s.clearSession);
  const session        = useSessionStore((s) => s.session);
  const appendNormalBlock = useSessionStore((s) => s.appendNormalBlock);
  const updateNormalBlock = useSessionStore((s) => s.updateNormalBlock);
  const deleteNormalBlock = useSessionStore((s) => s.deleteNormalBlock);

  /**
   * undefined  → 編集ダッシュボード非表示
   * null       → 新規追加モード
   * NormalBlock → 既存編集モード
   */
  const [editingBlock, setEditingBlock] = useState<NormalBlock | null | undefined>(undefined);

  // 初回マウント時にストアへロード
  useEffect(() => {
    loadSession(initialSession);
    return () => clearSession();
  }, [initialSession.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // セッション変更のたびにDBへバックグラウンド保存 (800ms debounce)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSession = useCallback((s: PlaySession) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      fetch(`/api/session/${s.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(s),
      }).catch(() => {});
    }, 800);
  }, []);

  useEffect(() => {
    if (session && session.id === initialSession.id) {
      persistSession(session);
    }
  }, [session, initialSession.id, persistSession]);

  const blocks   = session?.normalBlocks ?? [];
  const atLabels = computeAtLabels(blocks);
  const atCount  = blocks.filter((b) => b.atWin).length;

  function handleSave(block: NormalBlock) {
    if (editingBlock === null) {
      appendNormalBlock(block);
    } else if (editingBlock !== undefined) {
      updateNormalBlock(block.id, block);
    }
    setEditingBlock(undefined);
  }

  return (
    <div className="min-h-screen bg-v2-black flex flex-col">

      {/* ===== Sticky ヘッダー ===== */}
      <header className="sticky top-0 z-40 bg-white border-b border-v2-border safe-area-top shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-v2-text-secondary text-sm font-mono flex-shrink-0"
          >
            ← 戻る
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-mono font-bold text-v2-text-primary truncate">
              {session?.machineName ?? "セッション"}
            </p>
            <p className="text-[10px] font-mono text-v2-text-muted">
              通常時 · {blocks.length} 周期
            </p>
          </div>
          <span className="text-xs font-mono text-green-700 font-bold flex-shrink-0">
            {atCount > 0 ? `AT ×${atCount}` : ""}
          </span>
        </div>
      </header>

      {/* ===== メインコンテンツ ===== */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-4 pb-32">
        <NormalBlockList
          blocks={blocks}
          atLabels={atLabels}
          onEdit={(block) => setEditingBlock(block)}
          onDelete={(blockId) => deleteNormalBlock(blockId)}
        />
      </main>

      {/* ===== FAB: 周期追加 (ダッシュボード非表示時のみ) ===== */}
      {editingBlock === undefined && (
        <div className="fixed bottom-6 right-4 z-40 safe-area-bottom">
          <button
            onClick={() => setEditingBlock(null)}
            className="flex items-center gap-2 bg-v2-red text-white font-mono font-bold text-sm px-5 py-3 rounded-full shadow-lg active:scale-95 transition-transform"
          >
            ＋ 周期追加
          </button>
        </div>
      )}

      {/* ===== 編集ダッシュボード オーバーレイ ===== */}
      {editingBlock !== undefined && (
        <NormalBlockEditDashboard
          block={editingBlock}
          onSave={handleSave}
          onClose={() => setEditingBlock(undefined)}
        />
      )}
    </div>
  );
}
