import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { upgradeUserToPro } from "@/lib/pro/upgradeUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/payments/approve
 *  - body: { requestId: string, adminNote?: string }
 *  - 管理者のみ実行可
 *  - payment_requests を approved に更新
 *  - upgradeUserToPro() を呼んで is_pro / show_pro_popup / メール / Discord を一括処理
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

    // service_role で操作（profiles update + payment_requests update を確実にする）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { data: req, error: fetchErr } = await supabaseAdmin
      .from("payment_requests")
      .select("id, user_id, email, status")
      .eq("id", requestId)
      .single();
    if (fetchErr || !req) {
      return NextResponse.json({ error: "送金報告が見つかりません" }, { status: 404 });
    }
    if (req.status !== "pending") {
      return NextResponse.json({ error: `既に ${req.status} です` }, { status: 400 });
    }

    // Pro昇格（共通ヘルパー）
    const result = await upgradeUserToPro(supabaseAdmin, req.user_id, req.email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Pro昇格に失敗しました" }, { status: 500 });
    }

    // payment_requests を approved に
    const { error: updateErr } = await supabaseAdmin
      .from("payment_requests")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        admin_note: adminNote ?? null,
      })
      .eq("id", requestId);
    if (updateErr) {
      console.error("[admin/payments/approve] update error:", updateErr.message);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/payments/approve] unexpected:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
