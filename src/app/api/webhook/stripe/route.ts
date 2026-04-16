import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";

// Webhook は Stripe 署名検証のため raw body が必要
// Next.js App Router では request.text() で取得
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  // checkout.session.completed のみ処理
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id;

    if (!userId) {
      console.error("[Stripe Webhook] No client_reference_id in session");
      return NextResponse.json({ error: "No user ID" }, { status: 400 });
    }

    console.log(`[Stripe Webhook] Payment completed for user: ${userId}`);

    // Supabase Admin Client (service role) で RLS バイパス
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_pro: true })
      .eq("id", userId);

    if (error) {
      console.error("[Stripe Webhook] Failed to update is_pro:", error.message);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    console.log(`[Stripe Webhook] is_pro = true for user: ${userId}`);
  }

  return NextResponse.json({ received: true });
}
