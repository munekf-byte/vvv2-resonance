-- =============================================================================
-- VALVRAVE-RESONANCE: play_sessions テーブル
-- Migration: 001
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.play_sessions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_name   TEXT NOT NULL DEFAULT 'ヴァルヴレイヴ2',
  started_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at       TIMESTAMPTZ,
  status         TEXT NOT NULL DEFAULT 'ACTIVE'
                   CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED')),
  -- イベント列をJSONBで格納 (ドミノ再計算はクライアント側で実行)
  events         JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_diff     INTEGER NOT NULL DEFAULT 0,
  total_games    INTEGER NOT NULL DEFAULT 0,
  at_count       INTEGER NOT NULL DEFAULT 0,
  memo           TEXT,
  -- ベイズ推定結果キャッシュ
  mode_inference JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (Row Level Security): 自分のセッションのみアクセス可能
ALTER TABLE public.play_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own sessions"
  ON public.play_sessions
  FOR ALL
  USING (auth.uid() = user_id);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER play_sessions_updated_at
  BEFORE UPDATE ON public.play_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
