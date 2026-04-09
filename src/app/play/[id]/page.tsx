// =============================================================================
// TOKYO GHOUL RESONANCE: 実戦セッション画面
// 認証済みユーザーのセッションをDBから読み込む
// =============================================================================

import { loadSessionById } from "@/lib/supabase/session-db";
import { getCurrentUser } from "@/lib/supabase/server";
import { PlayClientPage } from "./PlayClientPage";
import type { PlaySession } from "@/types";

interface PlayPageProps {
  params: Promise<{ id: string }>;
}

function makeFallbackSession(id: string, userId: string): PlaySession {
  return {
    id,
    userId,
    machineName: "東京喰種 RESONANCE",
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
    uchidashi: null,
    shushi: null,
    userSettingGuess: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default async function PlayPage({ params }: PlayPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const userId = user?.id ?? "guest-user";

  let session: PlaySession | null = null;
  try {
    session = await loadSessionById(id, userId);
  } catch {
    // DB接続エラー → フォールバック
  }

  return <PlayClientPage initialSession={session ?? makeFallbackSession(id, userId)} />;
}
