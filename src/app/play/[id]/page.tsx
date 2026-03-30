// =============================================================================
// VALVRAVE-RESONANCE: 実戦セッション画面 [BYPASS MODE]
// ID不明・DB取得失敗でも必ずゲスト用空セッションを表示する
// =============================================================================

import { loadSessionById } from "@/lib/supabase/session-db";
import { PlayClientPage } from "./PlayClientPage";
import type { PlaySession } from "@/types";

interface PlayPageProps {
  params: Promise<{ id: string }>;
}

function makeMockSession(id: string): PlaySession {
  return {
    id,
    userId: "guest-user",
    machineName: "ヴァルヴレイヴ2",
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

  // DB取得を試みる（失敗時はモックで継続）
  let session: PlaySession | null = null;
  try {
    session = await loadSessionById(id, "guest-user");
  } catch {
    // DB接続エラー等 → モックで継続
  }

  // notFound() は呼ばない — 必ずゲスト用空セッションで表示
  return <PlayClientPage initialSession={session ?? makeMockSession(id)} />;
}
