// =============================================================================
// TGR Resonance: 統計分析レイヤー — API ルート共通ヘルパー (server-only)
// 認証 + ハッシュ化 + バリデーション + Service Role クライアント生成 + エラー応答。
// =============================================================================

import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hashUserId } from "./hash";

const MAX_BATCH_SIZE = 50;

export type AuthenticatedContext = {
  userId: string;       // raw user id (DB INSERT 時にはハッシュ化値を使う)
  userIdHash: string;   // SHA-256(userId + ":" + pepper)
  admin: SupabaseClient; // Service Role 権限のクライアント (RLS バイパス)
};

/**
 * リクエストの Cookie からユーザーを認証し、ハッシュ化値を返す。
 * 認証失敗時は null。Service Role クライアントも同時に生成。
 */
export async function authenticateAndHash(): Promise<AuthenticatedContext | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("Supabase service role credentials not configured");
  }

  const admin = createClient(url, serviceRoleKey);

  return {
    userId: user.id,
    userIdHash: hashUserId(user.id),
    admin,
  };
}

/**
 * リクエストボディを { events: [...] } 形式で取り出す。
 * - 配列が存在しない / 空 / 上限超過 / 単一イベントが object でない → エラー
 */
export function validateBatchPayload(body: unknown):
  | { ok: true; events: Record<string, unknown>[] }
  | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }
  const events = (body as { events?: unknown }).events;
  if (!Array.isArray(events)) {
    return { ok: false, error: "events must be an array" };
  }
  if (events.length === 0) {
    return { ok: false, error: "events is empty" };
  }
  if (events.length > MAX_BATCH_SIZE) {
    return { ok: false, error: `events exceeds max batch size (${MAX_BATCH_SIZE})` };
  }
  for (const e of events) {
    if (!e || typeof e !== "object" || Array.isArray(e)) {
      return { ok: false, error: "each event must be an object" };
    }
  }
  return { ok: true, events: events as Record<string, unknown>[] };
}

export function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export function okResponse(insertedCount: number) {
  return NextResponse.json({ ok: true, inserted: insertedCount });
}
