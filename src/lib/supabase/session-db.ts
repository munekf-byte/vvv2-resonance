// =============================================================================
// VALVRAVE-RESONANCE: セッション DB 操作 (サーバー用)
// =============================================================================

import type { PlaySession, NormalBlock, TGATEntry, SessionSummary } from "@/types";
import { createServerSupabaseClient } from "./server";

// -----------------------------------------------------------------------------
// JSONB キャスト ヘルパー
// -----------------------------------------------------------------------------

function castJson<T>(v: unknown): T {
  return v as T;
}

/** DB行 → PlaySession 変換 */
function rowToSession(row: Record<string, unknown>): PlaySession {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    machineName: row.machine_name as string,
    startedAt: row.started_at as string,
    endedAt: (row.ended_at as string | null) ?? null,
    status: row.status as PlaySession["status"],
    startDiff: (row.start_diff as number) ?? 0,
    initialThroughCount: (row.initial_through_count as number) ?? 0,
    normalBlocks: castJson<NormalBlock[]>(row.normal_blocks ?? []),
    atEntries: castJson<TGATEntry[]>(row.at_entries ?? []),
    summary: castJson<SessionSummary | null>(row.summary ?? null),
    modeInferences: castJson<null[]>(row.mode_inferences ?? []),
    memo: (row.memo as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// -----------------------------------------------------------------------------
// セッション取得 (Server Component / Route Handler 用)
// -----------------------------------------------------------------------------

/**
 * セッションIDとuserIdでセッションを取得する
 * @returns PlaySession | null
 */
export async function loadSessionById(
  id: string,
  userId: string
): Promise<PlaySession | null> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("play_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .eq("is_deleted", false)
    .single();

  if (error || !data) return null;

  return rowToSession(data as Record<string, unknown>);
}

// -----------------------------------------------------------------------------
// セッション保存 (Client Component から呼ぶ場合は API Route 経由)
// -----------------------------------------------------------------------------

/**
 * セッション全体をDBに保存 (upsert)
 * NOTE: クライアントからは /api/session/save を経由することを推奨
 */
export async function saveSessionToDb(session: PlaySession): Promise<boolean> {
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("play_sessions")
    .update({
      normal_blocks: session.normalBlocks as unknown as import("@/types").Json,
      at_entries: session.atEntries as unknown as import("@/types").Json,
      summary: session.summary as unknown as import("@/types").Json,
      mode_inferences: session.modeInferences as unknown as import("@/types").Json,
      ended_at: session.endedAt,
      status: session.status,
      start_diff: session.startDiff,
      initial_through_count: session.initialThroughCount,
      memo: session.memo,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("user_id", session.userId);

  return !error;
}
