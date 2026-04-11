-- 管理者によるセッションランク付けカラム追加
ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS admin_rank TEXT DEFAULT NULL;
