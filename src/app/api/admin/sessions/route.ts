import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return null;
  return user;
}

// GET: 全セッション一覧
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    if (!(await checkAdmin(supabase))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { data: sessions, error: sErr } = await supabase
      .from("play_sessions")
      .select("*")
      .order("created_at", { ascending: false });

    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

    const { data: profiles } = await supabase.from("profiles").select("id, email, avatar_url");
    const profileMap = new Map((profiles ?? []).map((p: Record<string, unknown>) => [p.id as string, p]));

    const result = (sessions ?? []).map((s: Record<string, unknown>) => {
      const blocks = Array.isArray(s.normal_blocks) ? s.normal_blocks : [];
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
        adminRank: (s.admin_rank as string) ?? null,
        userEmail: (p?.email as string) ?? "不明",
        userAvatar: (p?.avatar_url as string) ?? null,
      };
    });

    return NextResponse.json(result);
  } catch (e) {
    console.error("[admin/sessions GET]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH: ランク更新
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!(await checkAdmin(supabase))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { sessionId, adminRank } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const { error } = await supabase
      .from("play_sessions")
      .update({ admin_rank: adminRank } as never)
      .eq("id", sessionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/sessions PATCH]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE: 物理削除
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!(await checkAdmin(supabase))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { sessionId } = await request.json();
    if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

    const { error } = await supabase
      .from("play_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/sessions DELETE]", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
