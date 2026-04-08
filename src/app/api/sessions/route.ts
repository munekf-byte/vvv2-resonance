import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("play_sessions")
    .select("id, machine_name, created_at, updated_at, status, normal_blocks, at_entries, shushi")
    .eq("user_id", user.id)
    .eq("is_deleted", false)
    .order("updated_at", { ascending: false }) as unknown as { data: Record<string, unknown>[] | null; error: { message: string } | null };

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const sessions = (data ?? []).map((row: Record<string, unknown>) => {
    const blocks = Array.isArray(row.normal_blocks) ? row.normal_blocks : [];
    const atCount = blocks.filter((b: unknown) => (b as { atWin?: boolean })?.atWin).length;
    const totalGames = blocks.reduce((sum: number, b: unknown) => sum + ((b as { jisshuG?: number })?.jisshuG ?? 0), 0);
    const sh = row.shushi as { coinRate?: number; handCoins?: number | null; cashInvestK?: number | null; exchangeCoins?: number | null } | null;
    const balance = sh
      ? ((sh.exchangeCoins ?? 0) - ((sh.handCoins ?? 0) + (sh.cashInvestK ?? 0) * (sh.coinRate ?? 46)))
      : null;
    return {
      id: row.id as string,
      machineName: row.machine_name as string,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
      blockCount: blocks.length,
      atCount,
      totalGames,
      balance,
    };
  });

  return NextResponse.json(sessions);
}
