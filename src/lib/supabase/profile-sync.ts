// =============================================================================
// VALVRAVE-RESONANCE: Profile Sync
// Google OAuth ログイン後に profiles テーブルを upsert する
// =============================================================================

import type { User } from "@supabase/supabase-js";
import type { ProfileRow } from "./client";
import type { ServerSupabaseClient } from "./server";

/**
 * ログインユーザーのプロフィールを profiles テーブルに同期する
 *
 * 処理:
 *   1. user_id で profiles テーブルを検索
 *   2. 存在しなければ INSERT、存在すれば email/display_name/avatar_url を UPDATE
 *
 * @param supabase - サーバー用 Supabase クライアント
 * @param user - Supabase Auth ユーザーオブジェクト
 * @returns 同期後のプロフィール行
 */
export async function syncProfile(
  supabase: ServerSupabaseClient,
  user: User
): Promise<ProfileRow | null> {
  const email = user.email ?? "";
  const displayName =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    email.split("@")[0];
  const avatarUrl =
    (user.user_metadata?.avatar_url as string | undefined) ?? null;

  // display_name がDBに存在しない場合にも対応（最小限のカラムで試行）
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      { id: user.id, email, avatar_url: avatarUrl },
      { onConflict: "id", ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) {
    console.error("[Profile Sync] upsert error:", error.message);
    return null;
  }

  return data as ProfileRow | null;
}
