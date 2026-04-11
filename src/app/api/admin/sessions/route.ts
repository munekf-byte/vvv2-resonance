import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // 全セッション取得
    const { data: sessions, error: sErr } = await supabase
      .from("play_sessions")
      .select("id, user_id, machine_name, created_at, updated_at, is_deleted, normal_blocks, at_entries")
      .order("created_at", { ascending: false });

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    // 全プロフィール取得（ユーザー名マッピング用）
    const { data: profiles } = await supabase.from("profiles").select("id, email, avatar_url");
    const profileMap = new Map((profiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p]));

    const result = (sessions ?? []).map((s: Record<string, unknown>) => {
      const blocks = Array.isArray(s.normal_blocks) ? s.normal_blocks : [];
      const atEntries = Array.isArray(s.at_entries) ? s.at_entries : [];
      const atCount = blocks.filter((b: unknown) => (b as { atWin?: boolean })?.atWin).length;
      const totalGames = blocks.reduce((sum: number, b: unknown) => sum + ((b as { jisshuG?: number })?.jisshuG ?? 0), 0);
      const p = profileMap.get(s.user_id as string) as Record<string, unknown> | undefined;
      return {
        id: s.id,
        userId: s.user_id,
        machineName: s.machine_name ?? "—",
        createdAt: s.created_at,
        updatedAt: s.updated_at,
        isDeleted: s.is_deleted ?? false,
        blockCount: blocks.length,
        atCount,
        totalGames,
        userEmail: (p?.email as string) ?? "不明",
        userAvatar: (p?.avatar_url as string) ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[admin/sessions]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
