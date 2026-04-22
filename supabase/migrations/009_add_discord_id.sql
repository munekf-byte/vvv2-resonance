-- =============================================================================
-- 009_add_discord_id.sql
-- profiles に discord_id カラムを追加（Discord Bot 連携用）
-- =============================================================================

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS discord_id TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_discord_id
ON public.profiles(discord_id)
WHERE discord_id IS NOT NULL;
