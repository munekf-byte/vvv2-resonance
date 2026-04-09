// =============================================================================
// VALVRAVE-RESONANCE: セッション保存 API Route
// POST /api/session/[id]/save
// Client Component からセッションをDBに保存する
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let session: PlaySession;
  try {
    session = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (session.id !== id || session.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[save session]", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
