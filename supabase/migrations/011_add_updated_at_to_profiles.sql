-- =============================================================================
-- 011: profiles.updated_at カラム追加
--
-- 経緯:
--   migration 002 で profiles テーブル作成時に updated_at と
--   profiles_updated_at トリガーを定義していたが、本番DBは別経路で作成されており
--   updated_at カラムだけが欠落していた。トリガーは存在するため、
--   profiles に対する全 UPDATE が "record \"new\" has no field \"updated_at\"" で
--   失敗していた（Pro昇格・管理者からのis_pro切替など）。
--
-- 修正:
--   updated_at カラムを欠落している場合のみ追加する。デフォルト NOW() で
--   既存行も埋める。
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
