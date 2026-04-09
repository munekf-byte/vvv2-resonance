// =============================================================================
// VALVRAVE-RESONANCE: セッション保存 API Route
// POST /api/session/[id]/save
// ⚠️ OPERATION-DATA-RESCUE: 認証一時開放中（データ救出後に戻すこと）
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlaySession, Json } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  // ⚠️ DATA-RESCUE: 認証チェック一時無効化
  // const { data: { user } } = await supabase.auth.getUser();
  // if (!user) {
  //   return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // }

  let session: PlaySession;
  try {
    session = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ⚠️ DATA-RESCUE: ID一致チェック一時無効化（user.idなし）
  if (session.id !== id) {
    return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
  }

  // user_id フィルタなしで upsert（RLS無効前提）
  const { error } = await supabase
    .from("play_sessions")
    .update({
      normal_blocks: session.normalBlocks as unknown as Json,
      at_entries: session.atEntries as unknown as Json,
      summary: session.summary as unknown as Json,
      mode_inferences: session.modeInferences as unknown as Json,
      ended_at: session.endedAt,
      status: session.status,
      start_diff: session.startDiff,
      initial_through_count: session.initialThroughCount,
      memo: session.memo,
      uchidashi: session.uchidashi as unknown as Json,
      shushi: session.shushi as unknown as Json,
      user_setting_guess: session.userSettingGuess,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[save session DATA-RESCUE]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
