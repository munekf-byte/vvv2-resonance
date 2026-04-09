-- ユーザー推測設定カラム追加
ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS user_setting_guess TEXT DEFAULT NULL;
