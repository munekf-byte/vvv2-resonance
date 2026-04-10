// =============================================================================
// VALVRAVE-RESONANCE: セッション保存 API Route
// POST /api/session/[id]/save
// 認証必須 + user_id厳格検証
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { PlaySession } from "@/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createServerSupabaseClient();

  // 認証チェック（必須）
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let session: PlaySession;
  try {
    session = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ID厳格検証: URLのid、ペイロードのid、ログインユーザーのidが全て一致すること
  if (session.id !== id) {
    return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
  }
  if (session.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden: user_id mismatch" }, { status: 403 });
  }

  // ペイロード構築（PGRST204回避: 動的カラム追加）
  const payload: Record<string, unknown> = {
    normal_blocks: session.normalBlocks ?? [],
    at_entries: session.atEntries ?? [],
    memo: session.memo,
    updated_at: new Date().toISOString(),
  };
  if (session.uchidashi !== undefined) payload.uchidashi = session.uchidashi;
  if (session.shushi !== undefined) payload.shushi = session.shushi;
  if (session.userSettingGuess !== undefined) payload.user_setting_guess = session.userSettingGuess;
  if (session.summary !== undefined) payload.summary = session.summary;
  if (session.modeInferences !== undefined) payload.mode_inferences = session.modeInferences;
  if (session.endedAt !== undefined) payload.ended_at = session.endedAt;
  if (session.startDiff !== undefined) payload.start_diff = session.startDiff;
  if (session.initialThroughCount !== undefined) payload.initial_through_count = session.initialThroughCount;
  if (session.status !== undefined) payload.status = session.status;

  // user_idでフィルタ（RLS + API二重防護）
  const { error } = await supabase
    .from("play_sessions")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[save session] ERROR:", error.message, error.code);

    // PGRST204: スキーマキャッシュにカラムがない → 問題カラムを除外して再試行
    if (error.code === "PGRST204" && error.message) {
      const match = error.message.match(/the '(\w+)' column/);
      if (match) {
        const badCol = match[1];
        delete payload[badCol];
        const { error: retryErr } = await supabase
          .from("play_sessions")
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id);
        if (!retryErr) return NextResponse.json({ ok: true, dropped: badCol });
      }
    }

    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
