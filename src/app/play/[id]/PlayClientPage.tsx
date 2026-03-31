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

/** atWin=true のブロックを順カウントして AT1/AT2... マップを生成 */
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

interface EditingState {
  open: boolean;
  block: NormalBlock | null; // null = 新規
  index: number;             // 表示用 1-based
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

  useEffect(() => {
    loadSession(initialSession);
    return () => clearSession();
  }, [initialSession.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // 800ms debounce で DB 保存
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
    if (editing.block === null) {
      appendNormalBlock(block);
    } else {
      updateNormalBlock(block.id, block);
    }
    setEditing(CLOSED);
  }

  return (
    <div className="min-h-screen bg-v2-black flex flex-col">

      {/* ===== Sticky ヘッダー ===== */}
      <header className="sticky top-0 z-40 bg-white border-b border-v2-border safe-area-top shadow-sm">
        <div className="max-w-2xl mx-auto px-3 h-14 flex items-center gap-3">
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
          {atCount > 0 && (
            <span className="text-xs font-mono font-bold text-green-700 flex-shrink-0">
              AT ×{atCount}
            </span>
          )}
        </div>
      </header>

      {/* ===== メインコンテンツ ===== */}
      <main className="flex-1 max-w-2xl w-full mx-auto pb-32 pt-1">
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
