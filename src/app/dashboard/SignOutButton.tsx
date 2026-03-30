"use client";
// =============================================================================
// VALVRAVE-RESONANCE: サインアウトボタン (Client Component)
// =============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// [BYPASS] useRouter は refresh() のためだけに残す
import { LogOut } from "lucide-react";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSignOut() {
    setIsLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // router.push("/login"); // [BYPASS] リダイレクト無効化
    router.refresh();
    setIsLoading(false);
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={isLoading}
      className="
        flex items-center gap-1.5
        text-v2-text-muted hover:text-v2-red
        text-xs font-mono
        transition-colors duration-150
        disabled:opacity-50
        px-2 py-1 rounded
        hover:bg-v2-red-bg
      "
      title="ログアウト"
    >
      <LogOut size={14} />
      <span className="hidden sm:inline">ログアウト</span>
    </button>
  );
}
