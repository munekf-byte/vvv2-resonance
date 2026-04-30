# 前任者履歴写真アップロード — Supabase 初期設定手順

migration `012_add_prev_photo_upload.sql` 実行と併せて、Supabase Dashboard 上で以下を実施する。
バケット作成と `file_size_limit` / `allowed_mime_types` は Dashboard 経由が確実なので手順化する。

## 1. Storage バケット作成

Dashboard → **Storage** → **New bucket**

| 項目 | 値 |
|------|-----|
| Name | `session-photos` |
| Public bucket | **OFF**（Private） |
| File size limit | **500 KB** |
| Allowed MIME types | `image/jpeg` |

> 500KB 制限は「フル 1280px q=0.75 ≒ 250KB / サムネ 320px q=0.6 ≒ 30KB」の上振れに対する保険。
> MIME を `image/jpeg` に限定することで、HEIC/PNG 等を `accept="image/*"` で読んだ場合も
> サーバー側で確実に弾ける（クライアントは Canvas で JPEG にエンコードしてからアップロード）。

## 2. マイグレーション実行

```bash
# Supabase CLI で push
supabase db push
# もしくは Dashboard → SQL Editor に 012_add_prev_photo_upload.sql を貼り付け実行
```

これで以下が反映される。

- `play_sessions.prev_photo_uploaded_at` カラム追加
- `storage.objects` への 3 つの RLS ポリシー（INSERT: Pro 限定 / SELECT, DELETE: owner）

## 3. 動作確認

Dashboard → **Storage → session-photos**

- バケット一覧に表示されること
- 設定値が `500 KB` / `image/jpeg` であること
- Policies タブで以下 3 つが有効
  - `session_photos_insert_pro_only`
  - `session_photos_select_owner`
  - `session_photos_delete_owner`

Dashboard → **Database → Tables → play_sessions**

- `prev_photo_uploaded_at` カラム（timestamptz, nullable）が存在すること

## 4. 容量監視（Phase 1 運用ルール）

Free Plan の Storage 上限は **1 GB**。週 1 回手動で確認。

- Dashboard → **Storage → session-photos → Usage**
- 使用量が **800 MB** を超えたら Slack で通知 → 古い写真の整理または有料プラン検討
- Phase 1.5 で Edge Function による自動アラート化を検討

## 5. ロールバック手順（緊急時のみ）

```sql
-- カラム削除
ALTER TABLE public.play_sessions DROP COLUMN IF EXISTS prev_photo_uploaded_at;

-- ポリシー削除
DROP POLICY IF EXISTS "session_photos_insert_pro_only" ON storage.objects;
DROP POLICY IF EXISTS "session_photos_select_owner" ON storage.objects;
DROP POLICY IF EXISTS "session_photos_delete_owner" ON storage.objects;
```

バケット削除は Dashboard → Storage → `session-photos` → Settings → Delete bucket。
