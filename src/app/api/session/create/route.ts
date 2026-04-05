import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { machineName } = await request.json();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  const { error } = await supabase.from("play_sessions").insert({
    id,
    user_id: user.id,
    machine_name: machineName || "東京喰種 RESONANCE",
    started_at: now,
    status: "ACTIVE",
    start_diff: 0,
    initial_through_count: 0,
    normal_blocks: [],
    at_entries: [],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id, userId: user.id });
}
