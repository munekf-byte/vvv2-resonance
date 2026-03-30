// =============================================================================
// VALVRAVE-RESONANCE: 実戦セッション画面 [BYPASS MODE]
// 認証チェック無効 — RLS回避のためモックセッションで描画確認
// =============================================================================

import { notFound } from "next/navigation";
import { loadSessionById } from "@/lib/supabase/session-db";
import { PlayClientPage } from "./PlayClientPage";
import type { PlaySession } from "@/types";

interface PlayPageProps {
  params: Promise<{ id: string }>;
}

/** RLS/認証バイパス時のモックセッション */
function makeMockSession(id: string): PlaySession {
  return {
    id,
    userId: "guest-user",
    machineName: "バルvrave2",
    startedAt: new Date().toISOString(),
    endedAt: null,
    status: "ACTIVE",
    startDiff: 0,
    initialThroughCount: 0,
    normalBlocks: [],
    atEntries: [],
    summary: null,
    modeInferences: [],
    memo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { id } = await params;

  if (!id) notFound();

  // 認証バイパス: ゲストユーザーIDで試みる → 失敗時はモックセッションを使用
  const session = (await loadSessionById(id, "guest-user")) ?? makeMockSession(id);

  return <PlayClientPage initialSession={session} />;
}
