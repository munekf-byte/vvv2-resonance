import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { APP_MACHINE_NAME } from "@/lib/config/app";

/** 有効セッション数を返す */
export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { count, error } = await supabase
    .from("play_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("machine_name", APP_MACHINE_NAME)
    .eq("is_deleted", false);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ count: count ?? 0 });
}
