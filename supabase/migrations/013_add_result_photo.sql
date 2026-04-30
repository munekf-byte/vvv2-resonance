-- =============================================================================
-- 013: 稼働結果写真アップロード機能（2枚目）
--
-- 経緯:
--   012 で前任者履歴（1枚目）を導入。Pro 化により負荷余裕があるため、
--   セッション結果のグラフなどを 2 枚目として記録できるようにする。
--   1 セッションにつき最大 2 枚までアップ可能。
--
-- 構成:
--   - play_sessions.result_photo_uploaded_at: 2 枚目のアップロード完了タイムスタンプ
--   - Storage パス: {user_id}/{session_id}/result_full.jpg / result_thumb.jpg
--
-- バケットと RLS は 012 のものを流用（パス先頭は user_id のままなので追加不要）。
-- =============================================================================

ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS result_photo_uploaded_at TIMESTAMPTZ;

COMMENT ON COLUMN public.play_sessions.result_photo_uploaded_at IS
  '稼働結果写真（2枚目）のアップロード完了時刻。NULL=未アップロード。フル+サムネ両方成功時のみ更新。値はキャッシュバストキーとしても使用。';
