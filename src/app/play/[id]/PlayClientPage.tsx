"use client";
// =============================================================================
// VALVRAVE-RESONANCE: 実戦セッション Client Shell
// Zustand store へ initial session をロード、UI を組み立てる
// =============================================================================

import { useEffect, useCallback, useRef } from "react";
import type { PlaySession } from "@/types";
import { useSessionStore } from "@/store/useSessionStore";
import { StickyHeader } from "@/components/play/StickyHeader";
import { TimelineList } from "@/components/play/TimelineList";
import { InputFAB } from "@/components/play/InputFAB";

interface PlayClientPageProps {
  initialSession: PlaySession;
}

export function PlayClientPage({ initialSession }: PlayClientPageProps) {
  const loadSession = useSessionStore((s) => s.loadSession);
  const clearSession = useSessionStore((s) => s.clearSession);
  const session = useSessionStore((s) => s.session);

  // 初回マウント時にセッションをストアへロード
  useEffect(() => {
    loadSession(initialSession);
    return () => clearSession();
  }, [initialSession.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // セッション変更のたびにDBへバックグラウンド保存
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const persistSession = useCallback(
    (s: PlaySession) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        fetch(`/api/session/${s.id}/save`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(s),
        }).catch(() => {/* fire and forget */});
      }, 800); // 800ms debounce
    },
    []
  );

  useEffect(() => {
    if (session && session.id === initialSession.id) {
      persistSession(session);
    }
  }, [session, initialSession.id, persistSession]);

  return (
    <div className="min-h-screen bg-v2-black">
      {/* Sticky ヘッダー */}
      <StickyHeader sessionId={initialSession.id} />

      {/* タイムライン */}
      <main className="pb-32 pt-2">
        <TimelineList />
      </main>

      {/* 入力 FAB */}
      <InputFAB />
    </div>
  );
}
