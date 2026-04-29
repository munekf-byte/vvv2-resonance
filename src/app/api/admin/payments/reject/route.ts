import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/payments/reject
 *  - body: { requestId: string, adminNote?: string }
 *  - 管理者のみ。payment_requests を rejected に更新（is_pro は変更なし）
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();
    if (!profile?.is_admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as { requestId?: string; adminNote?: string };
    const { requestId, adminNote } = body;
    if (!requestId) return NextResponse.json({ error: "requestId is required" }, { status: 400 });

    const { error } = await supabase
      .from("payment_requests")
      .update({ status: "rejected", admin_note: adminNote ?? null })
      .eq("id", requestId);
    if (error) {
      console.error("[admin/payments/reject]", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/payments/reject] unexpected:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
