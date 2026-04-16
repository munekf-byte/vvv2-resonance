import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/server";
import { createClient } from "@supabase/supabase-js";

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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // 直接 update（select不要）
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("profiles")
      .update({ is_pro: true })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    if (updateErr) {
      console.error("[Webhook] Update error:", updateErr.message);
      return NextResponse.json({ error: "DB update failed" }, { status: 500 });
    }

    if (updated) {
      console.log("[Webhook] SUCCESS: is_pro=true for", userId);
    } else {
      // プロフィール未作成 → insert で新規作成 + Pro付与
      console.log("[Webhook] Profile not found, inserting new profile for", userId);
      const { error: insertErr } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          email: email,
          is_pro: true,
        });

      if (insertErr) {
        console.error("[Webhook] Insert error:", insertErr.message);
        return NextResponse.json({ error: "DB insert failed" }, { status: 500 });
      }
      console.log("[Webhook] SUCCESS: New profile created with is_pro=true for", userId);
    }
  }

  return NextResponse.json({ received: true });
}
