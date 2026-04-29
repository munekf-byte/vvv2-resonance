import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { sendAdminPaymentNotification } from "@/lib/email/sendMail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/payment/request
 *  - body: { paymentDate: string (ISO8601) }
 *  - 自分の payment_requests を pending で作成
 *  - 既に pending がある場合は 409 を返す
 *  - 既に Pro の場合は 400 を返す
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await request.json()) as { paymentDate?: string };
    const paymentDate = body?.paymentDate;
    if (!paymentDate || isNaN(Date.parse(paymentDate))) {
      return NextResponse.json({ error: "paymentDate が不正です" }, { status: 400 });
    }

    // 既に Pro なら不要
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro, email")
      .eq("id", user.id)
      .single();
    if (profile?.is_pro) {
      return NextResponse.json({ error: "既にProプランをご利用中です" }, { status: 400 });
    }

    // 既存 pending チェック
    const { data: existing } = await supabase
      .from("payment_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "既に確認中の送金報告があります", id: existing.id }, { status: 409 });
    }

    const email = profile?.email || user.email || "";
    const { data: inserted, error } = await supabase
      .from("payment_requests")
      .insert({
        user_id: user.id,
        email,
        payment_method: "paypay",
        payment_date: paymentDate,
        amount: 1500,
        status: "pending",
      })
      .select("id, created_at")
      .single();

    if (error || !inserted) {
      console.error("[payment/request] insert failed:", error?.message);
      return NextResponse.json({ error: error?.message || "DB insert failed" }, { status: 500 });
    }

    // 管理者通知（best-effort）
    sendAdminPaymentNotification({
      userEmail: email,
      paymentDate: new Date(paymentDate).toLocaleString("ja-JP"),
      reportedAt: new Date(inserted.created_at).toLocaleString("ja-JP"),
    }).catch((err) => console.error("[payment/request] admin notify failed:", err));

    return NextResponse.json({ ok: true, id: inserted.id });
  } catch (e) {
    console.error("[payment/request] unexpected:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
