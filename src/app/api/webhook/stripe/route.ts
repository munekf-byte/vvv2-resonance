import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";

// 環境変数チェック（モジュール読み込み時）
const whSecPrefix = process.env.STRIPE_WEBHOOK_SECRET?.slice(0, 6) ?? "UNDEFINED";
console.log(`[Stripe Webhook Module] STRIPE_WEBHOOK_SECRET loaded: ${whSecPrefix}...`);

export async function POST(request: NextRequest) {
  console.log("🔥🔥🔥 WEBHOOK HIT! 🔥🔥🔥");
  console.log("[Stripe Webhook] Method:", request.method, "URL:", request.url);

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  console.log("[Stripe Webhook] Body length:", body.length, "sig present:", !!sig);

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

  console.log("[Stripe Webhook] Event type:", event.type, "ID:", event.id);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    console.log("[Stripe Webhook] Session ID:", session.id);
    console.log("[Stripe Webhook] client_reference_id:", session.client_reference_id);
    console.log("[Stripe Webhook] customer_email:", session.customer_email);
    console.log("[Stripe Webhook] payment_status:", session.payment_status);

    const userId = session.client_reference_id;

    if (!userId) {
      console.error("[Stripe Webhook] No client_reference_id in session — cannot identify user");
      return NextResponse.json({ error: "No user ID" }, { status: 400 });
    }

    // Supabase Admin Client (service role) で RLS バイパス
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[Stripe Webhook] Missing SUPABASE_URL or SERVICE_ROLE_KEY env vars");
      return NextResponse.json({ error: "Server config error" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // まず対象ユーザーが存在するか確認
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, is_pro")
      .eq("id", userId)
      .single();

    if (fetchError || !profile) {
      console.error("[Stripe Webhook] Profile not found for userId:", userId, fetchError?.message);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("[Stripe Webhook] Found profile:", profile.email, "current is_pro:", profile.is_pro);

    if (profile.is_pro) {
      console.log("[Stripe Webhook] User already Pro, skipping update");
      return NextResponse.json({ received: true, already_pro: true });
    }

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({ is_pro: true })
      .eq("id", userId);

    if (updateError) {
      console.error("[Stripe Webhook] Failed to update is_pro:", updateError.message, updateError.details);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    console.log("[Stripe Webhook] SUCCESS: is_pro = true for user:", userId, profile.email);
  }

  return NextResponse.json({ received: true });
}
