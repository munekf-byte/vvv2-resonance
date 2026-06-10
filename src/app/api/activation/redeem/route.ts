// =============================================================================
// POST /api/activation/redeem
// アクティベーションキーを使って Pro 化する API。
//   - 要認証（ログイン中のユーザーのみ）
//   - キー検索 → 発行時メール vs ログインメール一致確認
//   - 通過したら upgradeUserToPro() を呼んで Pro 化（Stripe/PayPay と同じ経路）
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { upgradeUserToPro } from "@/lib/pro/upgradeUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeKey(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toUpperCase();
  // 形式: PRO-XXXX-XXXX-XXXX (各セグメント4文字、英数字)
  if (!/^PRO-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(trimmed)) return null;
  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as { key?: unknown };
    const key = normalizeKey(body.key);
    if (!key) {
      return NextResponse.json({ ok: false, error: "Invalid or expired key" }, { status: 400 });
    }

    // 既に Pro なら早期リターン
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro, email")
      .eq("id", user.id)
      .single();
    if (profile?.is_pro) {
      return NextResponse.json({ ok: false, error: "Already pro" }, { status: 400 });
    }

    const loginEmail = (profile?.email || user.email || "").trim().toLowerCase();
    if (!loginEmail) {
      return NextResponse.json({ ok: false, error: "Email mismatch" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // キー検索（未使用のみ）
    const { data: keyRow, error: keyErr } = await supabaseAdmin
      .from("activation_keys")
      .select("id, email, used")
      .eq("activation_key", key)
      .eq("used", false)
      .maybeSingle();

    if (keyErr) {
      console.error("[activation/redeem] key lookup error:", keyErr.message);
      return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }

    if (!keyRow) {
      return NextResponse.json({ ok: false, error: "Invalid or expired key" }, { status: 400 });
    }

    if ((keyRow.email as string).trim().toLowerCase() !== loginEmail) {
      return NextResponse.json({ ok: false, error: "Email mismatch" }, { status: 400 });
    }

    // Pro 昇格（共通ヘルパー）
    const result = await upgradeUserToPro(supabaseAdmin, user.id, loginEmail);
    if (!result.ok) {
      console.error("[activation/redeem] upgrade failed:", result.error);
      return NextResponse.json(
        { ok: false, error: result.error || "Pro upgrade failed" },
        { status: 500 },
      );
    }

    // キーを消費済みに
    const { error: updateErr } = await supabaseAdmin
      .from("activation_keys")
      .update({
        used: true,
        used_by: user.id,
        used_at: new Date().toISOString(),
      })
      .eq("id", keyRow.id);

    if (updateErr) {
      // Pro 化は成功しているのでログのみ。ユーザーには成功を返す。
      console.error("[activation/redeem] key mark-used failed (pro upgrade succeeded):", updateErr.message);
    }

    return NextResponse.json({ ok: true, message: "Pro activated" });
  } catch (e) {
    console.error("[activation/redeem] unexpected:", e);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
