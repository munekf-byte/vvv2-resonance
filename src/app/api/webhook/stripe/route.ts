import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";

// Node.js ランタイムを明示（Edge では Stripe SDK が動作しない場合がある）
export const runtime = "nodejs";

// Stripe Webhook は raw body が必要なため、Next.js の自動パースを無効化
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  console.log("🔥🔥🔥 WEBHOOK HIT! 🔥🔥🔥");

  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  console.log("[Webhook] STRIPE_WEBHOOK_SECRET present:", !!whSecret, whSecret?.slice(0, 6) ?? "NONE");

  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  console.log("[Webhook] Body length:", body.length, "sig present:", !!sig);

  if (!sig || !whSecret) {
    console.error("[Webhook] Missing sig or secret");
    return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
  }

  let event;
  try {
    event = getStripe().webhooks.constructEvent(body, sig, whSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[Webhook] Signature verification failed:", msg);
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  console.log("[Webhook] Event type:", event.type, "ID:", event.id);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id;

    console.log("[Webhook] client_reference_id:", userId);
    console.log("[Webhook] customer_email:", session.customer_email);

    if (!userId) {
      console.error("[Webhook] No client_reference_id");
      return NextResponse.json({ error: "No user ID" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      console.error("[Webhook] Missing Supabase env vars");
      return NextResponse.json({ error: "Config error" }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    const { data: profile, error: fetchErr } = await supabaseAdmin
      .from("profiles")
      .select("id, email, is_pro")
      .eq("id", userId)
      .single();

    if (fetchErr || !profile) {
      console.error("[Webhook] Profile not found:", userId, fetchErr?.message);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("[Webhook] Profile:", profile.email, "is_pro:", profile.is_pro);

    if (!profile.is_pro) {
      const { error: updateErr } = await supabaseAdmin
        .from("profiles")
        .update({ is_pro: true })
        .eq("id", userId);

      if (updateErr) {
        console.error("[Webhook] Update failed:", updateErr.message);
        return NextResponse.json({ error: "DB error" }, { status: 500 });
      }
      console.log("[Webhook] SUCCESS: is_pro=true for", userId);
    } else {
      console.log("[Webhook] Already Pro, skipped");
    }
  }

  return NextResponse.json({ received: true });
}
