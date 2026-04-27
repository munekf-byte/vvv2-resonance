"use client";
import { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient, type ProfileRow } from "@/lib/supabase/client";

interface AuthState {
  user: User | null;
  profile: ProfileRow | null;
  loading: boolean;
}

const AuthCtx = createContext<AuthState>({ user: null, profile: null, loading: true });

export function useAuth() {
  return useContext(AuthCtx);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, profile: null, loading: true });

  useEffect(() => {
    const supabase = createClient();

    function ensureCacheOwnership(currentUserId: string | null) {
      try {
        const STORED_KEY = "tgr_owner_uid";
        const stored = localStorage.getItem(STORED_KEY);
        if (currentUserId && stored !== currentUserId) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith("tgr_") && key !== STORED_KEY) keysToRemove.push(key);
          }
          keysToRemove.forEach((k) => localStorage.removeItem(k));
          localStorage.setItem(STORED_KEY, currentUserId);
        } else if (!currentUserId && stored) {
          localStorage.removeItem(STORED_KEY);
        }
      } catch {}
    }

    // 初回チェック
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        ensureCacheOwnership(user.id);
        fetchProfile(user);
      } else {
        ensureCacheOwnership(null);
        setState({ user: null, profile: null, loading: false });
      }
    });

    // リアルタイム変更リスナー
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        ensureCacheOwnership(session.user.id);
        fetchProfile(session.user);
      } else {
        ensureCacheOwnership(null);
        setState({ user: null, profile: null, loading: false });
      }
    });

    async function fetchProfile(user: User) {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        // プロフィールが存在しない → クライアント側で最小限のカラムで作成
        console.warn("[AuthContext] profile not found, creating with minimal columns...");
        const email = user.email ?? "";
        const avatarUrl = (user.user_metadata?.avatar_url as string) ?? null;

        const { data: created, error: createErr } = await supabase
          .from("profiles")
          .upsert({
            id: user.id,
            email,
            avatar_url: avatarUrl,
          }, { onConflict: "id" })
          .select()
          .single();

        if (createErr) {
          console.error("[AuthContext] profile create error:", createErr.message);
          // それでもダメなら id と email だけで試す
          const { data: minimal, error: minErr } = await supabase
            .from("profiles")
            .upsert({ id: user.id, email }, { onConflict: "id" })
            .select()
            .single();
          if (minErr) {
            console.error("[AuthContext] minimal create also failed:", minErr.message);
          }
          setState({ user, profile: (minimal as ProfileRow | null) ?? null, loading: false });
        } else {
          setState({ user, profile: created as ProfileRow | null, loading: false });
        }
        return;
      }

      setState({ user, profile: data as ProfileRow | null, loading: false });
    }

    return () => subscription.unsubscribe();
  }, []);

  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}
