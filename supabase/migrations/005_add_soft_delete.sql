-- 論理削除カラム追加
ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;

-- インデックス追加（is_deleted=false のクエリ高速化）
CREATE INDEX IF NOT EXISTS idx_play_sessions_active
  ON public.play_sessions (user_id, is_deleted)
  WHERE is_deleted = false;
