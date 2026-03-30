-- =============================================================================
-- VALVRAVE-RESONANCE: play_sessions テーブル スキーマ更新
-- Migration: 003
-- Phase 2 の型定義 (PlaySessionRow) に合わせて旧カラムを置き換える
-- =============================================================================

-- 旧カラムを削除
ALTER TABLE public.play_sessions
  DROP COLUMN IF EXISTS events,
  DROP COLUMN IF EXISTS total_diff,
  DROP COLUMN IF EXISTS total_games,
  DROP COLUMN IF EXISTS at_count,
  DROP COLUMN IF EXISTS mode_inference;

-- 新カラムを追加
ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS start_diff          INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS initial_through_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS normal_blocks       JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS at_entries          JSONB NOT NULL DEFAULT '[]'::JSONB,
  ADD COLUMN IF NOT EXISTS summary             JSONB,
  ADD COLUMN IF NOT EXISTS mode_inferences     JSONB;
