import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";
import { upgradeUserToPro } from "@/lib/pro/upgradeUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  console.log("🔥🔥🔥 WEBHOOK HIT! 🔥🔥🔥");

  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  if (!sig || !whSecret) {
    console.error("[Webhook] Missing sig or secret");
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, whSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Webhook] Sig verify failed:", msg);
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  console.log("[Webhook] Event:", event.type, event.id);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id;
    const email = session.customer_email ?? "";

    console.log("[Webhook] userId:", userId, "email:", email);

    if (!userId) {
      console.error("[Webhook] No client_reference_id");
      return NextResponse.json({ error: "No user ID" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 共通ヘルパーで Pro 昇格（is_pro + show_pro_popup + メール + Discord ロール）
    const result = await upgradeUserToPro(supabaseAdmin, userId, email);
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "upgrade failed" }, { status: 500 });
    }
    console.log("[Webhook] SUCCESS: upgraded", userId);
  }

  return NextResponse.json({ received: true });
}
