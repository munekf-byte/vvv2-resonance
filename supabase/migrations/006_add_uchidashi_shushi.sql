-- 打ち出し状態設定 & 収支入力 カラム追加
ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS uchidashi JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shushi JSONB DEFAULT NULL;
