// =============================================================================
// POST /api/activation/generate
// note / BOOTH 購入者がアクティベーションキーを発行する公開API。
//   - 認証不要
//   - 同一メールで未使用キーが既にあれば再利用（重複発行防止）
//   - 同一IPからの呼び出しは 1分間に5回まで（簡易レートリミット）
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── 簡易レートリミット（in-memory / IP単位 / 1分間に5回まで） ──────────────
// 注意: サーバーレス環境では cold start で初期化される。完全に防ぎたい場合は
// Upstash 等の外部ストアへ移行する。スペック上「簡易的でOK」のため許容。
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;
const ipHits = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (ipHits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_MAX) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

// ── キー生成 ────────────────────────────────────────────────────────────
// 形式: PRO-XXXX-XXXX-XXXX （英数字大文字、I/O/0/1 を除外して読み違い防止）
const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateActivationKey(): string {
  const bytes = randomBytes(12);
  const segments: string[] = [];
  for (let s = 0; s < 3; s++) {
    let seg = "";
    for (let i = 0; i < 4; i++) {
      seg += KEY_ALPHABET[bytes[s * 4 + i] % KEY_ALPHABET.length];
    }
    segments.push(seg);
  }
  return `PRO-${segments.join("-")}`;
}

function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const trimmed = input.trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) return null;
  if (trimmed.length > 254) return null;
  return trimmed;
}

export async function POST(request: NextRequest) {
  try {
    // クライアントIP抽出（Vercel: x-forwarded-for, fallback: x-real-ip）
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return NextResponse.json(
        { ok: false, error: "リクエストが多すぎます。しばらくお待ちください。" },
        { status: 429 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { email?: unknown };
    const email = normalizeEmail(body.email);
    if (!email) {
      return NextResponse.json({ ok: false, error: "Invalid email" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // ── 登録ユーザー存在チェック ────────────────────────────────────────
    // profiles は service_role でのみ全件参照可能。auth.users と1:1 で連動するため
    // profiles 側でメール一致を確認すれば登録済みかどうか判定できる。
    // 大文字小文字を吸収するため .ilike (ワイルドカード無し = case-insensitive eq)。
    const { data: existingProfile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (profileErr) {
      console.error("[activation/generate] profile lookup error:", profileErr.message);
      return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }

    if (!existingProfile) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "このメールアドレスで登録されたアカウントが見つかりません。アプリにログインしているメールアドレスを入力してください。",
        },
        { status: 404 },
      );
    }

    // 既存の未使用キーがあれば再利用
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from("activation_keys")
      .select("activation_key")
      .eq("email", email)
      .eq("used", false)
      .maybeSingle();

    if (existingErr) {
      console.error("[activation/generate] existing lookup error:", existingErr.message);
      return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
    }

    if (existing?.activation_key) {
      return NextResponse.json({ ok: true, key: existing.activation_key, existing: true });
    }

    // 新規発行（UNIQUE衝突に備えてリトライ）
    for (let attempt = 0; attempt < 5; attempt++) {
      const key = generateActivationKey();
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from("activation_keys")
        .insert({ email, activation_key: key })
        .select("activation_key")
        .single();

      if (!insertErr && inserted) {
        return NextResponse.json({ ok: true, key: inserted.activation_key });
      }

      // UNIQUE違反（23505 = unique_violation）のみリトライ。他はエラー返却。
      const code = (insertErr as { code?: string } | null)?.code;
      if (code !== "23505") {
        console.error("[activation/generate] insert error:", insertErr?.message);
        return NextResponse.json(
          { ok: false, error: insertErr?.message ?? "Internal Server Error" },
          { status: 500 },
        );
      }
    }

    return NextResponse.json(
      { ok: false, error: "キー発行に失敗しました。再度お試しください。" },
      { status: 500 },
    );
  } catch (e) {
    console.error("[activation/generate] unexpected:", e);
    return NextResponse.json({ ok: false, error: "Internal Server Error" }, { status: 500 });
  }
}
