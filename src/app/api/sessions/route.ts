import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error("[/api/sessions] auth error:", authError.message);
      return NextResponse.json({ error: "Auth failed", detail: authError.message }, { status: 401 });
    }
    if (!user) {
      console.error("[/api/sessions] no user found in session");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[/api/sessions] fetching for user:", user.id);

    // RLS任せにせず明示的に user_id でフィルタ
    // PGRST204回避: select('*') で全カラム取得
    const { data, error } = await supabase
      .from("play_sessions")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_deleted", false)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("[/api/sessions] query error:", error.message, error.details, error.hint, error.code);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    console.log("[/api/sessions] found", (data ?? []).length, "sessions");

    const sessions = (data ?? []).map((row: Record<string, unknown>) => {
      const blocks = Array.isArray(row.normal_blocks) ? row.normal_blocks : [];
      const atEntries = Array.isArray(row.at_entries) ? row.at_entries : [];
      const atCount = blocks.filter((b: unknown) => (b as { atWin?: boolean })?.atWin).length;
      const totalGames = blocks.reduce((sum: number, b: unknown) => sum + ((b as { jisshuG?: number })?.jisshuG ?? 0), 0);
      const sh = row.shushi as { coinRate?: number; handCoins?: number | null; cashInvestK?: number | null; exchangeCoins?: number | null } | null;
      const balance = sh
        ? ((sh.exchangeCoins ?? 0) - ((sh.handCoins ?? 0) + (sh.cashInvestK ?? 0) * (sh.coinRate ?? 46)))
        : null;
      return {
        id: row.id as string,
        machineName: (row.machine_name as string) ?? "セッション",
        createdAt: (row.created_at as string) ?? "",
        updatedAt: (row.updated_at as string) ?? "",
        blockCount: blocks.length,
        atCount,
        totalGames,
        balance,
        settingHint: "",
        userSettingGuess: ((row.user_setting_guess as string) ?? ""),
      };
    });

    return NextResponse.json(sessions);
  } catch (e) {
    console.error("[/api/sessions] unexpected:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
