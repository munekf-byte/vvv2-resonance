"use client";
// =============================================================================
// VALVRAVE-RESONANCE: 新規セッション開始ボタン (Client Component)
// =============================================================================

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, type Database } from "@/lib/supabase/client";
import { Plus } from "lucide-react";

type SessionInsert =
  Database["public"]["Tables"]["play_sessions"]["Insert"];

interface NewSessionButtonProps {
  userId: string;
}

export function NewSessionButton({ userId }: NewSessionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleNewSession() {
    setIsLoading(true);
    const supabase = createClient();

    const newSession: SessionInsert = {
      user_id: userId,
      machine_name: "ヴァルヴレイヴ2",
      status: "ACTIVE",
      start_diff: 0,
      initial_through_count: 0,
      normal_blocks: [],
      at_entries: [],
      summary: null,
      mode_inferences: null,
      memo: null,
    };

    const { data, error } = await supabase
      .from("play_sessions")
      .insert(newSession)
      .select("id")
      .single();

    if (error || !data) {
      console.error("[NewSession] error:", error?.message);
      setIsLoading(false);
      return;
    }

    router.push(`/play/${data.id}`);
  }

  return (
    <button
      onClick={handleNewSession}
      disabled={isLoading}
      className="
        w-full flex items-center justify-center gap-2
        bg-v2-red hover:bg-v2-red-200 active:bg-v2-red-400
        text-white font-mono font-bold text-sm
        rounded-xl
        px-4 py-4
        transition-all duration-150
        disabled:opacity-60 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-v2-red focus:ring-offset-2 focus:ring-offset-v2-black
      "
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span>セッション作成中...</span>
        </>
      ) : (
        <>
          <Plus size={18} />
          <span>新規セッション開始</span>
        </>
      )}
    </button>
  );
}
