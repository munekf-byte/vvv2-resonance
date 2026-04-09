import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return null;
  return user;
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const adminUser = await checkAdmin(supabase);
    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // profiles テーブルから取得を試みる
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url, is_pro, is_admin, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[admin/users GET] profiles query failed:", error.message);
      // RLSエラーの場合、自分のプロフィールだけでも返す
      const { data: selfProfile } = await supabase
        .from("profiles")
        .select("id, email, display_name, avatar_url, is_pro, is_admin, created_at")
        .eq("id", adminUser.id)
        .single();
      return NextResponse.json(selfProfile ? [
        { ...selfProfile, email: selfProfile.email || adminUser.email || "メール不明" }
      ] : []);
    }

    // emailが空のプロフィールを補完
    const result = (data ?? []).map((p: Record<string, unknown>) => ({
      ...p,
      email: p.email || "メール不明",
    }));

    return NextResponse.json(result);
  } catch (e) {
    console.error("[admin/users GET] unexpected:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { userId, is_pro } = await request.json();
    if (!userId || typeof is_pro !== "boolean") {
      return NextResponse.json({ error: "Invalid params" }, { status: 400 });
    }

    const { error } = await supabase
      .from("profiles")
      .update({ is_pro })
      .eq("id", userId);

    if (error) {
      console.error("[admin/users PATCH]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/users PATCH] unexpected:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
