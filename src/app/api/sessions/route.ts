import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("play_sessions")
    .select("id, machine_name, created_at, updated_at, status, normal_blocks, at_entries")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sessions = (data ?? []).map((row) => {
    const blocks = Array.isArray(row.normal_blocks) ? row.normal_blocks : [];
    const atCount = blocks.filter((b: unknown) => (b as { atWin?: boolean })?.atWin).length;
    return {
      id: row.id,
      machineName: row.machine_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      blockCount: blocks.length,
      atCount,
    };
  });

  return NextResponse.json(sessions);
}
