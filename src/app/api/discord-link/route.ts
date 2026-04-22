// =============================================================================
// Discord ID 保存 + 即時ロール付与 API
// POST /api/discord-link  { discord_id: "123..." }
// =============================================================================

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { discord_id } = await request.json();

    if (!discord_id || !/^\d{17,20}$/.test(discord_id)) {
      return NextResponse.json({ error: "無効な Discord ID です" }, { status: 400 });
    }

    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ discord_id })
      .eq("id", user.id);

    if (updateErr) {
      console.error("[discord-link] Update error:", updateErr.message);
      return NextResponse.json({ error: "保存に失敗しました" }, { status: 500 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro")
      .eq("id", user.id)
      .single();

    if (profile?.is_pro) {
      await grantDiscordRole(discord_id, "TGR-Pro");
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[discord-link] error:", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function grantDiscordRole(discord_id: string, role: string) {
  const botApiUrl = process.env.DISCORD_BOT_API_URL;
  const botApiSecret = process.env.DISCORD_BOT_API_SECRET;

  if (!botApiUrl || !botApiSecret) {
    console.warn("[discord-link] Bot API URL/Secret not configured, skipping role grant");
    return;
  }

  try {
    const res = await fetch(`${botApiUrl}/api/discord/grant-role`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${botApiSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ discord_id, role }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[discord-link] Bot API error:", res.status, body);
    } else {
      console.log("[discord-link] Role granted:", role, "to", discord_id);
    }
  } catch (err) {
    console.error("[discord-link] Bot API fetch failed:", err);
  }
}
