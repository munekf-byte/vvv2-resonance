import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function checkAdmin(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) return null;
  return user;
}

/**
 * GET /api/admin/payments
 *  - クエリパラメータ: ?status=pending|approved|rejected|all（デフォルト pending）
 *  - 管理者のみアクセス可、payment_requests を一覧で返す
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    if (!(await checkAdmin(supabase))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") ?? "pending";

    let query = supabase
      .from("payment_requests")
      .select("id, user_id, email, payment_method, payment_date, amount, status, admin_note, created_at, approved_at")
      .order("created_at", { ascending: false });

    if (status === "pending" || status === "approved" || status === "rejected") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      console.error("[admin/payments GET]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data ?? []);
  } catch (e) {
    console.error("[admin/payments GET] unexpected:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
