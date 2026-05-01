-- 赫眼状態の後追い確定用 pending state カラム追加
-- v5.12: 通常ダッシュボードで「赫眼発生」を押した後、AT等に画面遷移しても
--        フローティングバナーで継続G数を確定できるように、保留中の発生記録を保持する。
ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS pending_kakugan JSONB DEFAULT NULL;
