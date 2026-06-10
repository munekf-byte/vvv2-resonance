-- =============================================================================
-- 019: アクティベーションキー
--   note / BOOTH 等の外部販売チャネルで購入したユーザーがアプリで Pro 化する
--   ための公開キーシステム。/pro/activate でメールから発行し、/pro でログイン
--   ユーザーが入力すると upgradeUserToPro() を経由して Pro 化される。
-- =============================================================================

CREATE TABLE IF NOT EXISTS activation_keys (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email           TEXT NOT NULL,
  activation_key  TEXT NOT NULL UNIQUE,
  used            BOOLEAN NOT NULL DEFAULT false,
  used_by         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 同一メールで未使用キーは1つだけ（重複発行防止）
CREATE UNIQUE INDEX IF NOT EXISTS idx_activation_keys_email_unused
  ON activation_keys (email) WHERE used = false;

-- 検索高速化
CREATE INDEX IF NOT EXISTS idx_activation_keys_used_by
  ON activation_keys (used_by) WHERE used = true;

ALTER TABLE activation_keys ENABLE ROW LEVEL SECURITY;

-- このテーブルは API ルートが service_role で操作する。
-- 一般クライアント（anon / authenticated）からの直接アクセスは禁止。
-- service_role は RLS をバイパスするため追加ポリシー不要。
