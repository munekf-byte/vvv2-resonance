-- 精神世界中の弱レア役カウンター（セッション単位） カラム追加
-- v5.10: per-block shinsekaiCounters を撤廃し、セッション全体で1つのカウンターに統合
ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS shinsekai_weak_rare JSONB DEFAULT NULL;
