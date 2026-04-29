// =============================================================================
// VALVRAVE-RESONANCE: Supabase クライアント (ブラウザ用)
// Database 型は Supabase CLI 生成形式に完全準拠 (inline型 + { [_ in never]: never })
// =============================================================================

import { createBrowserClient } from "@supabase/ssr";
import type { Json } from "@/types";

// -----------------------------------------------------------------------------
// Database 型 (Supabase CLI が生成するものと同等の構造)
// GenericSchema 準拠: Row/Insert/Update はインライン object 型、
// 空セクションは { [_ in never]: never }
// -----------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          is_pro: boolean;
          is_admin: boolean;
          discord_id: string | null;
          show_pro_popup: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_pro?: boolean;
          is_admin?: boolean;
          discord_id?: string | null;
          show_pro_popup?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          is_pro?: boolean;
          is_admin?: boolean;
          discord_id?: string | null;
          show_pro_popup?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      payment_requests: {
        Row: {
          id: string;
          user_id: string;
          email: string;
          payment_method: string;
          payment_date: string;
          amount: number;
          status: "pending" | "approved" | "rejected";
          admin_note: string | null;
          created_at: string;
          approved_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          email: string;
          payment_method?: string;
          payment_date: string;
          amount?: number;
          status?: "pending" | "approved" | "rejected";
          admin_note?: string | null;
          created_at?: string;
          approved_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          email?: string;
          payment_method?: string;
          payment_date?: string;
          amount?: number;
          status?: "pending" | "approved" | "rejected";
          admin_note?: string | null;
          created_at?: string;
          approved_at?: string | null;
        };
        Relationships: [];
      };
      play_sessions: {
        Row: {
          id: string;
          user_id: string;
          machine_name: string;
          started_at: string;
          ended_at: string | null;
          status: "ACTIVE" | "PAUSED" | "COMPLETED";
          start_diff: number;
          initial_through_count: number;
          normal_blocks: Json;
          at_entries: Json;
          summary: Json | null;
          mode_inferences: Json | null;
          memo: string | null;
          is_deleted: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          machine_name: string;
          started_at?: string;
          ended_at?: string | null;
          status: "ACTIVE" | "PAUSED" | "COMPLETED";
          start_diff?: number;
          initial_through_count?: number;
          normal_blocks?: Json;
          at_entries?: Json;
          summary?: Json | null;
          mode_inferences?: Json | null;
          memo?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          machine_name?: string;
          started_at?: string;
          ended_at?: string | null;
          status?: "ACTIVE" | "PAUSED" | "COMPLETED";
          start_diff?: number;
          initial_through_count?: number;
          normal_blocks?: Json;
          at_entries?: Json;
          summary?: Json | null;
          mode_inferences?: Json | null;
          memo?: string | null;
          is_deleted?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// -----------------------------------------------------------------------------
// 後方互換エクスポート
// -----------------------------------------------------------------------------

/** profiles テーブルの行型 (Row と同一) */
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

/** play_sessions テーブルの行型 */
export type PlaySessionRow =
  Database["public"]["Tables"]["play_sessions"]["Row"];

/** payment_requests テーブルの行型 */
export type PaymentRequestRow =
  Database["public"]["Tables"]["payment_requests"]["Row"];

// -----------------------------------------------------------------------------
// ブラウザ用 Supabase クライアント (シングルトンファクトリ)
// -----------------------------------------------------------------------------

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (_client) return _client;
  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _client;
}
