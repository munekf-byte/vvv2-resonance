// =============================================================================
// VALVRAVE-RESONANCE: Supabase クライアント (サーバー用)
// Server Components / Route Handlers / Middleware から使用する
// =============================================================================

import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database, ProfileRow } from "./client";

/**
 * Server Component / Route Handler 用 Supabase クライアント
 * Next.js の cookies() を使って認証状態を読み取る
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component 内では set が呼べないケースがある (読み取り専用)
            // Middleware でセッション更新されるため問題なし
          }
        },
      },
    }
  );
}

/** 型エイリアス: createServerSupabaseClient の戻り値 */
export type ServerSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;

/**
 * 現在のログインユーザーを取得する
 * 未ログインの場合は null を返す
 */
export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * 現在のログインユーザーのプロフィールを取得する
 * 未ログインまたはプロフィールなしの場合は null を返す
 */
export async function getCurrentProfile(): Promise<ProfileRow | null> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile as ProfileRow | null;
}
