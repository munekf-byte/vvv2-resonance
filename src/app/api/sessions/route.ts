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

    const sessions = (data ?? []).map((row: Record<string, unknown>) => {
      const blocks = Array.isArray(row.normal_blocks) ? row.normal_blocks : [];
      const atEntries = Array.isArray(row.at_entries) ? row.at_entries : [];
      const atCount = blocks.filter((b: unknown) => (b as { atWin?: boolean })?.atWin).length;
      const totalGames = blocks.reduce((sum: number, b: unknown) => sum + ((b as { jisshuG?: number })?.jisshuG ?? 0), 0);
      const sh = row.shushi as { coinRate?: number; handCoins?: number | null; cashInvestK?: number | null; exchangeCoins?: number | null } | null;
      const balance = sh
        ? ((sh.exchangeCoins ?? 0) - ((sh.handCoins ?? 0) + (sh.cashInvestK ?? 0) * (sh.coinRate ?? 46)))
        : null;

      // 設定確定情報: サーバーでは軽量に算出（inferSettingに依存しない）
      const hints: string[] = [];
      // CZ失敗終了画面
      for (const b of blocks) {
        const es = (b as { endingSuggestion?: string })?.endingSuggestion ?? "";
        if (es.includes("設定6濃厚")) hints.push("6確定濃厚");
        else if (es.includes("設定5以上")) hints.push("5以上濃厚");
        else if (es.includes("設定4以上")) hints.push("4以上濃厚");
        else if (es.includes("設定3以上")) hints.push("3以上濃厚");
        else if (es.includes("設定2以上")) hints.push("2以上濃厚");
        else if (es.includes("設定1否定")) hints.push("1否定");
      }
      // AT終了画面
      for (const e of atEntries) {
        for (const r of ((e as { rows?: unknown[] })?.rows ?? [])) {
          const row2 = r as { rowType?: string; endingSuggestion?: string; trophy?: string; coinsHint?: string; endingCard?: Record<string, number> };
          if (row2.rowType !== "set") continue;
          const es = row2.endingSuggestion ?? "";
          if (es.includes("設定6濃厚")) hints.push("6確定濃厚");
          else if (es.includes("設定5以上")) hints.push("5以上濃厚");
          else if (es.includes("設定4以上")) hints.push("4以上濃厚");
          // トロフィー
          const t = row2.trophy ?? "";
          if (t.includes("虹")) hints.push("6確定濃厚");
          else if (t.includes("喰種柄")) hints.push("5以上濃厚");
          else if (t.includes("金")) hints.push("4以上濃厚");
          else if (t.includes("銀")) hints.push("3以上濃厚");
          else if (t.includes("銅")) hints.push("2以上濃厚");
          // 枚数表示示唆
          if (row2.coinsHint === "666OVER" || row2.coinsHint === "1000-7OVER") hints.push("6確定濃厚");
          else if (row2.coinsHint === "456OVER") hints.push("4以上濃厚");
          // エンディングカード
          const ec = row2.endingCard;
          if (ec) {
            if ((ec.confirmed4 ?? 0) > 0) hints.push("6確定濃厚");
            if ((ec.confirmed3 ?? 0) > 0) hints.push("5以上濃厚");
            if ((ec.confirmed2 ?? 0) > 0) hints.push("4以上濃厚");
            if ((ec.confirmed1 ?? 0) > 0) hints.push("3以上濃厚");
          }
        }
      }
      const priority = ["6確定濃厚", "5以上濃厚", "4以上濃厚", "3以上濃厚", "2以上濃厚", "1否定"];
      const settingHint = [...new Set(hints)].sort((a, b) => priority.indexOf(a) - priority.indexOf(b)).join(" / ");

      return {
        id: row.id as string,
        machineName: (row.machine_name as string) ?? "セッション",
        createdAt: (row.created_at as string) ?? "",
        updatedAt: (row.updated_at as string) ?? "",
        blockCount: blocks.length,
        atCount,
        totalGames,
        balance,
        settingHint,
        userSettingGuess: ((row.user_setting_guess as string) ?? ""),
      };
    });

    return NextResponse.json(sessions);
  } catch (e) {
    console.error("[/api/sessions] unexpected:", e);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
