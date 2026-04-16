# Commander Ecosystem 標準設計仕様書
## 最高峰セキュリティ ＆ データ同期アーキテクチャ

**Origin**: TGR Resonance (v4.0〜v4.46)
**Purpose**: 本仕様書を読めば、別プロジェクトで同等の「要塞」を即座に再建できる
**Stack**: Next.js App Router + Supabase (PostgreSQL + Auth + RLS) + Stripe + Vercel

---

## 1. RLS 無限ループの完全回避

### 1.1 なぜ再帰エラー (42P17) が起きるのか

```
[ユーザーがSELECT] 
  → RLSポリシー評価 
    → ポリシー内で is_admin() 関数を呼ぶ 
      → is_admin() が同じテーブルをSELECT 
        → RLSポリシー評価 
          → is_admin() を呼ぶ 
            → ∞ 無限ループ → 42P17 エラー
```

**核心**: RLSポリシーの `USING` 句内で、**同じテーブルへのSELECT**を含む関数を呼ぶと、そのSELECTにも RLS が適用され、再びポリシーが評価される。

### 1.2 解決策A: SECURITY DEFINER 関数（DB レベル）

```sql
-- ========================================
-- 安全な is_admin() 関数
-- SECURITY DEFINER = RLS をバイパスして実行
-- search_path = '' で権限昇格攻撃を防止
-- ========================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE                    -- 同一トランザクション内でキャッシュ可能
SECURITY DEFINER          -- 関数定義者の権限で実行（RLSスキップ）
SET search_path = ''      -- スキーマハイジャック防止
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;
```

**注意点**:
- `SECURITY DEFINER` は「定義者の権限」で実行される → 必ず `search_path = ''` で保護
- `STABLE` マークで同一リクエスト内の複数呼び出しを最適化
- `COALESCE(..., false)` でプロフィール未作成時も安全にfalse返却

### 1.3 解決策B: アプリケーション層チェック（TGR採用方式）

```typescript
// API route 内で admin チェック（RLS内にカスタム関数を置かない）
async function checkAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  // RLS: auth.uid() = id で自分のプロフィールだけ読める → 安全
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  
  return profile?.is_admin ? user : null;
}
```

**利点**: DB に SECURITY DEFINER 関数を置かないため、再帰リスクがゼロ。
**欠点**: 管理者が全ユーザーデータを取得するには、別途 Service Role Key が必要。

---

## 2. 鉄壁の RLS ポリシー構造

### 2.1 なぜ ALL ではなく個別定義か

`FOR ALL` は便利だが、以下の問題がある:
- INSERT 時に不要な `USING` 句が評価される
- DELETE を許可したくないテーブルでも許可してしまう
- デバッグ時にどの操作が失敗したか特定しにくい

### 2.2 コピペ用 SQL: profiles テーブル

```sql
-- ========================================
-- profiles テーブル: ユーザープロフィール
-- ========================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  display_name TEXT,
  avatar_url   TEXT,
  is_pro       BOOLEAN NOT NULL DEFAULT false,
  is_admin     BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のプロフィールだけ読める
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- ユーザーは自分のプロフィールだけ作れる
CREATE POLICY profiles_insert ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- ユーザーは自分のプロフィールだけ更新できる
-- ※ is_pro, is_admin はアプリ側で制御（Webhook / Admin API）
CREATE POLICY profiles_update ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 削除は禁止（CASCADE で auth.users 削除時のみ連動）
-- DELETE ポリシーなし = 誰も削除できない
```

### 2.3 コピペ用 SQL: play_sessions テーブル

```sql
-- ========================================
-- play_sessions テーブル: ユーザーデータ
-- ========================================
CREATE TABLE IF NOT EXISTS public.play_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  machine_name     TEXT NOT NULL DEFAULT 'Session',
  normal_blocks    JSONB NOT NULL DEFAULT '[]',
  at_entries       JSONB NOT NULL DEFAULT '[]',
  is_deleted       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.play_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY sessions_select ON public.play_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY sessions_insert ON public.play_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY sessions_update ON public.play_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- ソフトデリート方式のため物理削除は管理者APIのみ
-- (管理者APIは Service Role Key でRLSバイパス)

CREATE INDEX idx_sessions_user ON public.play_sessions (user_id, is_deleted);
```

### 2.4 管理者の「全閲覧・全操作」を共存させる方法

**方式A: SECURITY DEFINER 関数 + RLS ポリシー追加**
```sql
-- 管理者は全データを読める
CREATE POLICY sessions_admin_select ON public.play_sessions
  FOR SELECT USING (public.is_admin());
```

**方式B（TGR採用）: Admin API で Service Role Key 使用**
```typescript
// Admin API ルートのみ Service Role Key でクライアント生成
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // RLS 完全バイパス
);
```

---

## 3. 商業用 Webhook の安全な「裏口」設計

### 3.1 なぜ Webhook に RLS バイパスが必要か

```
Stripe → POST /api/webhook/stripe → サーバー
```

Webhook はユーザーのブラウザを経由しない。Supabase Auth のセッション Cookie が存在しない。
→ `auth.uid()` が NULL → RLS が全操作をブロック → 更新不可能

### 3.2 安全なバイパス設計

```typescript
// ==========================================
// Stripe Webhook ハンドラ（完全版）
// ==========================================
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";     // Edge Runtime 回避
export const dynamic = "force-dynamic"; // 静的最適化を防止

export async function POST(request: Request) {
  // 1. Stripe 署名検証（偽リクエスト防止）
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");
  
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const event = stripe.webhooks.constructEvent(
    body, sig!, process.env.STRIPE_WEBHOOK_SECRET!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.client_reference_id; // Checkout 作成時に埋め込んだ UID

    // 2. Service Role Key で RLS バイパス（ここだけ！）
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 3. 直接 UPDATE（存在確認の SELECT は不要）
    const { data } = await supabaseAdmin
      .from("profiles")
      .update({ is_pro: true })
      .eq("id", userId)
      .select("id")
      .maybeSingle();

    // 4. プロフィール未作成時のフォールバック INSERT
    if (!data) {
      await supabaseAdmin.from("profiles").insert({
        id: userId,
        email: session.customer_email ?? "",
        is_pro: true,
      });
    }
  }

  return NextResponse.json({ received: true });
}
```

### 3.3 Checkout セッション生成（client_reference_id の埋め込み）

```typescript
// POST /api/checkout
const session = await stripe.checkout.sessions.create({
  mode: "payment",
  client_reference_id: user.id,  // ← Supabase Auth UID を埋め込む
  customer_email: user.email,
  line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
  success_url: `${origin}/pro?success=true`,
  cancel_url: `${origin}/pro?canceled=true`,
});
```

### 3.4 セキュリティチェックリスト

| チェック | 内容 |
|---------|------|
| Stripe 署名検証 | `constructEvent()` で偽リクエストを排除 |
| Service Role Key | Webhook ルートのみで使用。他の全APIは anon key |
| client_reference_id | サーバー側で `auth.getUser()` から取得した UID を使用 |
| DB 側に緩いポリシー不要 | Service Role Key が RLS をバイパスするため `WITH CHECK (true)` は不要 |

---

## 4. マルチデバイス・クラウド同期の黄金比

### 4.1 データ優先順位

```
┌─────────────────┐     ┌─────────────────┐
│   localStorage   │ ←── │    Supabase DB    │
│   （キャッシュ）   │ ──→ │ （唯一の真実）    │
└─────────────────┘     └─────────────────┘
   即時書き込み              Debounce + Retry
   オフライン対応            500ms 遅延
```

**読み込み優先順位**:
1. SSR で Supabase から取得（初回ロード）
2. DB にデータあり → 正として採用、localStorage を上書き
3. DB が空 → localStorage フォールバック
4. 両方空 → フォールバックセッション生成

**書き込みフロー**:
1. ユーザー操作 → Zustand Store 更新 → 即時 localStorage 保存
2. 500ms デバウンス → Supabase DB へ非同期保存
3. 失敗時: 1秒 → 3秒 → 8秒 のリトライ（最大3回）
4. 全リトライ失敗 → localStorage の pending セットに記録 → 次回起動時に再試行

### 4.2 同期ステータスインジケーター

```typescript
export type SyncStatus = "synced" | "saving" | "pending" | "error" | "auth_error";

// Pub/Sub パターンでUIコンポーネントに通知
const listeners = new Set<(status: SyncStatus) => void>();

export function onSyncStatusChange(listener: SyncListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener); // クリーンアップ関数
}
```

| ステータス | 色 | アイコン | 意味 |
|-----------|-----|---------|------|
| synced | 緑 | ● 保存済 | DB と同期完了 |
| saving | 青 | ◌ 保存中 | アップロード中 |
| pending | 黄 | ◎ 未同期 | リトライ待ち |
| error | 赤 | ! 同期エラー | 全リトライ失敗 |
| auth_error | 赤 | ! 認証切れ | 401/403 受信 |

### 4.3 SSR → Client ハンドオフパターン

```typescript
// ======== Server Component (page.tsx) ========
export default async function PlayPage({ params }) {
  const user = await getCurrentUser();
  const session = await loadSessionById(id, user.id); // Supabase SSR
  return <PlayClientPage initialSession={session ?? fallback} />;
}

// ======== Client Component ========
export function PlayClientPage({ initialSession }) {
  useEffect(() => {
    // DB優先: SSRデータがあればそれを使用
    if (initialSession.normalBlocks.length > 0) {
      loadSession(initialSession);
      localStorage.setItem(key, JSON.stringify(initialSession));
    } else {
      // DB空 → localStorage フォールバック
      const local = lsLoadSession(id);
      loadSession(local ?? initialSession);
    }
    flushPendingSaves(); // 未送信分を再試行
  }, []);
}
```

### 4.4 user_id の鉄則: サーバー注入

```typescript
// POST /api/session/[id]/save
const user = await supabase.auth.getUser(); // ← サーバー側で取得

const payload = {
  user_id: user.id,  // ← フロントの値は完全無視
  normal_blocks: body.normalBlocks,
  // ...
};

await supabase.from("play_sessions")
  .update(payload)
  .eq("id", sessionId)
  .eq("user_id", user.id); // ← 二重チェック
```

**絶対に**: `request.body.userId` を DB に書き込まない。

---

## 5. 論理削除（Soft Delete）によるデータ資産の最大化

### 5.1 設計思想

```
ユーザー視点: 「削除した」→ 二度と見えない
司令官視点: 「全データが残っている」→ 分析・集計に活用
```

### 5.2 SQL 実装

```sql
ALTER TABLE public.play_sessions
  ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_sessions_deleted
  ON public.play_sessions (user_id, is_deleted);
```

### 5.3 APIでのフィルタリング

```typescript
// ユーザー向け API: 論理削除済みを除外
const { data } = await supabase
  .from("play_sessions")
  .select("*")
  .eq("user_id", user.id)
  .eq("is_deleted", false);  // ← ユーザーには見せない

// 管理者向け API（COMMANDER LAB）: 全データ取得
const { data } = await supabaseAdmin
  .from("play_sessions")
  .select("*");  // ← is_deleted フィルタなし = 全件
```

### 5.4 削除操作

```typescript
// フロント: 「削除」ボタン → 論理削除
await supabase
  .from("play_sessions")
  .update({ is_deleted: true })
  .eq("id", sessionId)
  .eq("user_id", user.id);

// 管理者: 物理削除（完全消去）は管理者APIのみ
await supabaseAdmin
  .from("play_sessions")
  .delete()
  .eq("id", sessionId);
```

---

## 6. 環境変数チェックリスト

```env
# ===== Supabase =====
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...         # RLS 適用、フロント/API共通
SUPABASE_SERVICE_ROLE_KEY=eyJ...             # RLS バイパス、Webhook/Admin のみ

# ===== Stripe =====
STRIPE_SECRET_KEY=sk_live_xxx                # サーバーのみ
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx # フロントで使用可
NEXT_PUBLIC_STRIPE_PRICE_ID=price_xxx        # 商品価格ID
STRIPE_WEBHOOK_SECRET=whsec_xxx              # Webhook 署名検証用

# ===== Vercel =====
# 上記すべてを Vercel > Settings > Environment Variables に設定
# SUPABASE_SERVICE_ROLE_KEY と STRIPE_SECRET_KEY は NEXT_PUBLIC_ を付けない（秘匿）
```

---

## 7. セキュリティ監査チェックリスト

新プロジェクト立ち上げ時に以下を全て確認:

```
□ RLS が全テーブルで ENABLE されている
□ FOR ALL ポリシーを使わず SELECT/INSERT/UPDATE/DELETE を個別定義
□ RLS ポリシー内で同テーブルへの SELECT を含む関数を呼んでいない
  （呼ぶ場合は SECURITY DEFINER + search_path = '' で保護）
□ Service Role Key は Webhook と Admin API のみで使用
□ user_id はサーバー側の auth.getUser() から注入（フロント値は無視）
□ Stripe Webhook は constructEvent() で署名検証済み
□ WITH CHECK (true) や USING (true) のポリシーが存在しない
□ is_pro / is_admin はユーザー自身が UPDATE できない設計
□ 論理削除フラグでユーザー向けAPIはフィルタ、管理者は全件アクセス
□ localStorage は「キャッシュ」、Supabase が「Master」
□ 環境変数の NEXT_PUBLIC_ 有無が適切（秘密鍵に NEXT_PUBLIC_ を付けない）
```

---

**本仕様書により、Commander Ecosystem の全プロジェクトで統一されたセキュリティ基盤を即座に構築できます。**
