// =============================================================================
// VALVRAVE-RESONANCE: セッション保存 API Route
// POST /api/session/[id]/save
// v4.2: 認証必須 + auth.uid()をuser_idに使用 + RLS対応
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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let session: PlaySession;
  try {
    session = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (session.id !== id) {
    return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
  }

  // ペイロード構築 — user_idは常にauth.uid()（フロント由来は使わない）
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

  // まずUPDATEを試行
  const { error, count } = await supabase
    .from("play_sessions")
    .update(payload)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("[save]", error.code, error.message, "user:", user.id, "session:", id);

    // PGRST204: スキーマキャッシュ問題 → 問題カラム除外して再試行
    if (error.code === "PGRST204" && error.message) {
      const match = error.message.match(/the '(\w+)' column/);
      if (match) {
        delete payload[match[1]];
        const { error: retryErr } = await supabase
          .from("play_sessions").update(payload).eq("id", id).eq("user_id", user.id);
        if (!retryErr) return NextResponse.json({ ok: true, dropped: match[1] });
      }
    }

    return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
  }

  // UPDATE対象が0行 = DBにそのIDの行が存在しない → INSERTにフォールバック
  if (count === 0) {
    console.log("[save] no rows updated, attempting INSERT for:", id);
    const insertPayload = {
      id,
      ...payload,
      machine_name: (session as Record<string, unknown>).machineName ?? "東京喰種 RESONANCE",
      started_at: (session as Record<string, unknown>).startedAt ?? new Date().toISOString(),
    };
    const { error: insertErr } = await supabase.from("play_sessions").insert(insertPayload);
    if (insertErr) {
      console.error("[save] INSERT fallback failed:", insertErr.message);
      return NextResponse.json({ error: insertErr.message, code: insertErr.code }, { status: 500 });
    }
    return NextResponse.json({ ok: true, inserted: true });
  }

  return NextResponse.json({ ok: true });
}
