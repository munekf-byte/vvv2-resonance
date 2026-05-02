-- =============================================================================
-- TGR Resonance: analytics_at_set_events テーブル
-- Migration: 018
-- 目的: AT セット単位 (TGATSet) の総合分析イベントログ
-- 設計合意: docs/opus2-collab/09_opus2_to_claude_reply.md (OPUS2 改訂版)
-- ※ user_session_id / *_instance_id は Phase 1 段階では NULL 許容かつ FK なし。
--   既存テーブルとの紐付け方針はロガー実装側で運用。
-- ※ ending_card_data は JSONB 採用 (TGEndingCard が 14 フィールドのカウントマップで
--    OPUS2 当初提案の type/color 2 列分割では情報量を失うため)。
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_at_set_events (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ユーザー識別 (ハッシュ化)
  user_id_hash           TEXT NOT NULL,

  -- セッション識別 (Phase 1 では制約なし)
  user_session_id        UUID,

  -- AT 識別 (3 層構造)
  at_instance_id         UUID NOT NULL,       -- TGATEntry に紐付く UUID
  at_seq_in_session      INTEGER NOT NULL,    -- セッション内の AT 連番 (1, 2, 3, ...)
  set_instance_id        UUID NOT NULL,       -- TGATSet.id 流用
  set_seq_in_at          INTEGER NOT NULL,    -- AT 内の SET 連番 (1, 2, 3, ...)

  -- AT メタ
  at_type                TEXT,                -- '通常AT' | '裏AT' | '隠れ裏AT（推測）'
  at_entry_type          TEXT,                -- AT 突入契機 (NormalBlock.winTrigger 由来)

  -- セット本体
  character              TEXT,                -- 敵キャラ名 (TG_AT_CHARACTERS)
  bites_type             TEXT,                -- BITES 種別 (TG_BITES_TYPES)
  bites_coins            TEXT,                -- BITES 獲得 ("50"〜"3000" | "ED" | "")
  bites_coins_numeric    INTEGER,             -- 数値化 (NULL = ED or 未入力)
  disadvantage           TEXT CHECK (disadvantage IS NULL OR disadvantage IN ('-', '不利益⭕️', '不利益❌')),

  -- 対決サマリ (battles[] を集計、生データは配列で保存)
  battle_count           INTEGER,
  battle_wins            INTEGER,
  battle_triggers        TEXT[],
  battle_results         TEXT[],

  -- 直乗せサマリ (directAdds[] を集計)
  direct_add_count       INTEGER,
  direct_add_total_coins INTEGER,

  -- 示唆系
  ending_suggestion      TEXT,
  trophy                 TEXT,
  ending_card_data       JSONB,               -- TGEndingCard 全 14 フィールド (NULL = 未入力)
  ed_kakugan_count       INTEGER,
  kakugan_states         TEXT[],              -- 赫眼状態リスト
  kakugan_count          INTEGER,             -- 派生: 赫眼発生回数
  coins_hint             TEXT,                -- '456OVER' | '666OVER' | '1000-7OVER' | ''

  -- 状態コンテキスト
  hall_id_hash           TEXT,
  machine_id_hash        TEXT,
  is_morning_first       BOOLEAN,
  estimated_setting      INTEGER,

  -- メタ
  is_correction          BOOLEAN NOT NULL DEFAULT FALSE,
  is_orphaned            BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_at            TIMESTAMPTZ NOT NULL,
  server_recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 整合性制約: battle_triggers と battle_results の長さが一致 (両方 NULL も許容)
  CONSTRAINT chk_battle_arrays_aligned CHECK (
    (battle_triggers IS NULL AND battle_results IS NULL)
    OR (array_length(battle_triggers, 1) IS NOT DISTINCT FROM array_length(battle_results, 1))
  )
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_aase_at_instance       ON public.analytics_at_set_events(at_instance_id);
CREATE INDEX IF NOT EXISTS idx_aase_user_hash         ON public.analytics_at_set_events(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_aase_recorded_at       ON public.analytics_at_set_events(recorded_at);
CREATE INDEX IF NOT EXISTS idx_aase_session_seq       ON public.analytics_at_set_events(user_session_id, at_seq_in_session);
CREATE INDEX IF NOT EXISTS idx_aase_character         ON public.analytics_at_set_events(character);
CREATE INDEX IF NOT EXISTS idx_aase_bites_type        ON public.analytics_at_set_events(bites_type);
CREATE INDEX IF NOT EXISTS idx_aase_at_entry_type     ON public.analytics_at_set_events(at_entry_type);
CREATE INDEX IF NOT EXISTS idx_aase_server_recorded   ON public.analytics_at_set_events(server_recorded_at);

-- =============================================================================
-- RLS: 管理者 SELECT のみ。INSERT/UPDATE/DELETE は Service Role 経由限定。
-- =============================================================================
ALTER TABLE public.analytics_at_set_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read only"
  ON public.analytics_at_set_events
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'mune.kf@gmail.com');
