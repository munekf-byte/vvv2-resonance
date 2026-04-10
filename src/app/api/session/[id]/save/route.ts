// =============================================================================
// VALVRAVE-RESONANCE: セッション保存 API Route
// POST /api/session/[id]/save
// 認証必須 + user_id厳格検証 + AUDIT完全ログ
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

  // 認証チェック
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    console.error("[AUDIT] auth failed:", authError?.message ?? "no user");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let session: PlaySession;
  try {
    session = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // AUDIT: 全IDを出力
  console.log("[AUDIT] 1. auth user.id:", user.id);
  console.log("[AUDIT] 2. payload session.userId:", session.userId);
  console.log("[AUDIT] 3. URL param id:", id);
  console.log("[AUDIT] 4. payload session.id:", session.id);

  // ID検証
  if (session.id !== id) {
    console.error("[AUDIT] REJECTED: session.id !== URL id");
    return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
  }

  // user_id検証 — session.userIdが異なる場合はauth.uidで上書きして続行
  // （DATA-RESCUE期間中に作られたセッションの userId が不一致の可能性があるため）
  if (session.userId !== user.id) {
    console.warn("[AUDIT] WARNING: session.userId mismatch. session:", session.userId, "auth:", user.id, "— overriding with auth user.id");
  }

  // ペイロード構築 — user_id は必ず auth.uid() を使用（ペイロードのuserIdは信用しない）
  const payload: Record<string, unknown> = {
    user_id: user.id,
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

  console.log("[AUDIT] 5. payload keys:", Object.keys(payload));

  // DB更新 — user_id でフィルタ
  const { error } = await supabase
    .from("play_sessions")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[AUDIT] DB ERROR:", error.message, "| code:", error.code, "| details:", error.details, "| hint:", error.hint);

    // PGRST204: スキーマキャッシュ問題 → 問題カラム除外して再試行
    if (error.code === "PGRST204" && error.message) {
      const match = error.message.match(/the '(\w+)' column/);
      if (match) {
        const badCol = match[1];
        console.log("[AUDIT] Removing column:", badCol, "and retrying");
        delete payload[badCol];
        const { error: retryErr } = await supabase
          .from("play_sessions")
          .update(payload)
          .eq("id", id)
          .eq("user_id", user.id);
        if (!retryErr) {
          console.log("[AUDIT] Retry succeeded without:", badCol);
          return NextResponse.json({ ok: true, dropped: badCol });
        }
        console.error("[AUDIT] Retry failed:", retryErr.message);
      }
    }

    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  console.log("[AUDIT] SUCCESS: saved session", id);
  return NextResponse.json({ ok: true });
}
