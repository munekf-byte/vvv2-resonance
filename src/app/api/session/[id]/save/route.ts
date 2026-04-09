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

  // ペイロード構築（PGRST204回避: スキーマキャッシュで認識されないカラムを除外）
  // 必須のJSONBデータ + 確実に存在するカラムのみ
  const payload: Record<string, unknown> = {
    normal_blocks: session.normalBlocks ?? [],
    at_entries: session.atEntries ?? [],
    memo: session.memo,
    updated_at: new Date().toISOString(),
  };
  // オプショナルカラム: 存在すれば追加（エラー時は除外して再試行可能に）
  if (session.uchidashi !== undefined) payload.uchidashi = session.uchidashi;
  if (session.shushi !== undefined) payload.shushi = session.shushi;
  if (session.userSettingGuess !== undefined) payload.user_setting_guess = session.userSettingGuess;
  if (session.summary !== undefined) payload.summary = session.summary;
  if (session.modeInferences !== undefined) payload.mode_inferences = session.modeInferences;
  if (session.endedAt !== undefined) payload.ended_at = session.endedAt;
  if (session.startDiff !== undefined) payload.start_diff = session.startDiff;
  if (session.initialThroughCount !== undefined) payload.initial_through_count = session.initialThroughCount;
  if (session.status !== undefined) payload.status = session.status;

  // DEBUG: ペイロードのキー一覧を出力
  console.log("[save session] payload keys:", Object.keys(payload));
  console.log("[save session] target id:", id);

  const { error } = await supabase
    .from("play_sessions")
    .update(payload)
    .eq("id", id);

  if (error) {
    console.error("[save session] ERROR:", error.message, error.details, error.hint, error.code);

    // PGRST204: スキーマキャッシュにカラムがない → 問題カラムを除外して再試行
    if (error.code === "PGRST204" && error.message) {
      const match = error.message.match(/the '(\w+)' column/);
      if (match) {
        const badCol = match[1];
        console.log(`[save session] Removing column '${badCol}' and retrying...`);
        delete payload[badCol];
        const { error: retryErr } = await supabase
          .from("play_sessions")
          .update(payload)
          .eq("id", id);
        if (!retryErr) {
          console.log("[save session] Retry succeeded without column:", badCol);
          return NextResponse.json({ ok: true, dropped: badCol });
        }
        console.error("[save session] Retry also failed:", retryErr.message);
      }
    }

    return NextResponse.json({
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
