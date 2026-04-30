-- =============================================================================
-- 012: 前任者履歴写真アップロード機能
--
-- 目的:
--   セッション開始前に前任者のデータランプを撮影し、参照可能にする。
--   Pro 限定機能。Free Plan の Supabase Storage を使用。
--
-- 構成:
--   - play_sessions.prev_photo_uploaded_at: アップロード完了タイムスタンプ
--     (NULL = 写真なし、値あり = フル+サムネ両方アップロード済み、キャッシュバスト用)
--   - Storage バケット session-photos: パス {user_id}/{session_id}/{full|thumb}.jpg
--   - RLS: INSERT は is_pro=true 必須 / SELECT,DELETE は owner のみ
--
-- バケット作成と file_size_limit / allowed_mime_types は
-- Supabase Dashboard 経由で実施（docs/photo-upload-setup.md 参照）。
-- =============================================================================

-- 1) play_sessions にカラム追加
ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS prev_photo_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.play_sessions.prev_photo_uploaded_at IS
  '前任者履歴写真のアップロード完了時刻。NULL=未アップロード。フル+サムネ両方成功時のみ更新。値はキャッシュバストキーとしても使用。';

-- 2) Storage RLS ポリシー（バケット作成は Dashboard で先に実施すること）
--    既存ポリシーは冪等に削除してから再作成。

-- 2-1) INSERT: 自分の user_id 配下にのみ、is_pro=true なら書き込み可
DROP POLICY IF EXISTS "session_photos_insert_pro_only"
  ON storage.objects;

CREATE POLICY "session_photos_insert_pro_only"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'session-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_pro = true
    )
  );

-- 2-2) SELECT: 自分の user_id 配下のみ読み取り可（Pro解約後も閲覧可）
DROP POLICY IF EXISTS "session_photos_select_owner"
  ON storage.objects;

CREATE POLICY "session_photos_select_owner"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'session-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 2-3) DELETE: 自分の user_id 配下のみ削除可（差し替え時のロールバック / 古い写真削除）
DROP POLICY IF EXISTS "session_photos_delete_owner"
  ON storage.objects;

CREATE POLICY "session_photos_delete_owner"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'session-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 注意: UPDATE ポリシーは作成しない（同名上書きではなく DELETE + INSERT で差し替える）
