-- profiles テーブルに課金・管理者カラムを追加
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_pro BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- RLS: 自分の is_pro / is_admin は読めるが書き換えられない（admin API経由のみ）
-- 既存の UPDATE policy を書き換え: is_pro, is_admin は除外
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
