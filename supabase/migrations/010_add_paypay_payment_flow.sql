-- =============================================================================
-- 010: PayPay 手動決済フロー
--   - profiles.show_pro_popup: Pro昇格直後の祝福ポップアップ表示フラグ
--   - payment_requests: PayPay 送金報告と承認状態を管理
-- =============================================================================

-- 1) Pro昇格ポップアップ表示フラグ（Stripe / PayPay 共通で利用）
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_pro_popup BOOLEAN NOT NULL DEFAULT false;

-- 2) 送金報告テーブル
CREATE TABLE IF NOT EXISTS payment_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  email TEXT NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'paypay',
  payment_date TIMESTAMPTZ NOT NULL,
  amount INTEGER NOT NULL DEFAULT 1500,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payment_requests_user_status_idx
  ON payment_requests (user_id, status);
CREATE INDEX IF NOT EXISTS payment_requests_status_created_idx
  ON payment_requests (status, created_at DESC);

ALTER TABLE payment_requests ENABLE ROW LEVEL SECURITY;

-- ユーザー: 自分の請求のみ閲覧可
DROP POLICY IF EXISTS "Users can view own requests" ON payment_requests;
CREATE POLICY "Users can view own requests"
  ON payment_requests FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザー: 自分の請求を作成可（user_id は auth.uid() に一致する必要あり）
DROP POLICY IF EXISTS "Users can insert own requests" ON payment_requests;
CREATE POLICY "Users can insert own requests"
  ON payment_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 管理者: 全ての請求を閲覧可（profiles.is_admin で判定）
DROP POLICY IF EXISTS "Admins can view all requests" ON payment_requests;
CREATE POLICY "Admins can view all requests"
  ON payment_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- 管理者: 全ての請求を更新可（承認/却下）
DROP POLICY IF EXISTS "Admins can update all requests" ON payment_requests;
CREATE POLICY "Admins can update all requests"
  ON payment_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );

-- service_role はすべての RLS をバイパスするため追加ポリシー不要
