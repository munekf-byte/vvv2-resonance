-- =============================================================================
-- TGR Resonance: analytics_cz_game_events テーブル
-- Migration: 017
-- 目的: CZ抽選格差検証用の1G毎イベントログ収集レイヤー
-- 設計合意: docs/opus2-collab/03_opus2_to_claude_initial.md (OPUS2 確定スキーマ)
-- ※ user_session_id / cz_instance_id は Phase 0 では NULL許容かつ外部キー制約なし。
--   既存テーブル(play_sessions等)との紐付け方針は Phase 1 ロガー実装時に確定。
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.analytics_cz_game_events (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ユーザー識別(ハッシュ化)
  user_id_hash          TEXT NOT NULL,

  -- セッション・CZ 識別 (Phase 0 では制約なし)
  user_session_id       UUID,
  cz_instance_id        UUID,
  cz_type               TEXT NOT NULL CHECK (cz_type IN ('reminiscence', 'oogui_rize')),

  -- イベント本体
  event_seq_in_cz       INTEGER NOT NULL,
  game_in_cz            INTEGER,
  role                  TEXT NOT NULL CHECK (role IN ('bell', 'replay', 'weak_rare', 'strong_rare', 'hazure')),
  triggered             BOOLEAN NOT NULL,
  is_correction         BOOLEAN NOT NULL DEFAULT FALSE,
  is_final_game         BOOLEAN,

  -- CZ 全体結果 (後追い更新あり)
  cz_outcome            TEXT CHECK (cz_outcome IN ('success', 'fail', 'in_progress')),

  -- 状態コンテキスト
  hall_id_hash          TEXT,
  machine_id_hash       TEXT,
  is_morning_first      BOOLEAN,
  estimated_setting     INTEGER,
  pre_cz_stage          TEXT,
  pre_cz_invitation     TEXT,
  total_g_at_cz_entry   INTEGER,

  -- 論理削除フラグ (周期削除時に立てる。物理削除はしない)
  is_orphaned           BOOLEAN NOT NULL DEFAULT FALSE,

  -- タイムスタンプ
  recorded_at           TIMESTAMPTZ NOT NULL,
  server_recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_acge_cz_instance     ON public.analytics_cz_game_events(cz_instance_id);
CREATE INDEX IF NOT EXISTS idx_acge_cz_type         ON public.analytics_cz_game_events(cz_type);
CREATE INDEX IF NOT EXISTS idx_acge_user_hash       ON public.analytics_cz_game_events(user_id_hash);
CREATE INDEX IF NOT EXISTS idx_acge_recorded_at     ON public.analytics_cz_game_events(recorded_at);
CREATE INDEX IF NOT EXISTS idx_acge_server_recorded ON public.analytics_cz_game_events(server_recorded_at);

-- =============================================================================
-- RLS: 管理者(司令官)のみ SELECT 可能。INSERT/UPDATE/DELETE は Service Role 経由のみ。
-- =============================================================================
ALTER TABLE public.analytics_cz_game_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read only"
  ON public.analytics_cz_game_events
  FOR SELECT
  USING (auth.jwt() ->> 'email' = 'mune.kf@gmail.com');

-- INSERT/UPDATE/DELETE はポリシー未定義 = anon/authenticated ロールから一切不可。
-- Service Role Key 経由(Phase 1 の /api/analytics/cz-event ルート)のみ書き込み可能。
