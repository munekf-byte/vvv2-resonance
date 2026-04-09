import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();

  // 管理者チェック
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 全セッション取得（is_deleted 問わず全て）
  const { data, error } = await supabase
    .from("play_sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // DB Row → PlaySession 変換
  const sessions = (data ?? []).map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    machineName: row.machine_name as string,
    startedAt: row.started_at as string,
    endedAt: (row.ended_at as string | null) ?? null,
    status: row.status as string,
    startDiff: (row.start_diff as number) ?? 0,
    initialThroughCount: (row.initial_through_count as number) ?? 0,
    normalBlocks: Array.isArray(row.normal_blocks) ? row.normal_blocks : [],
    atEntries: Array.isArray(row.at_entries) ? row.at_entries : [],
    summary: row.summary ?? null,
    modeInferences: row.mode_inferences ?? [],
    memo: (row.memo as string | null) ?? null,
    uchidashi: row.uchidashi ?? null,
    shushi: row.shushi ?? null,
    userSettingGuess: (row.user_setting_guess as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    isDeleted: row.is_deleted ?? false,
  }));

  return NextResponse.json(sessions);
}
