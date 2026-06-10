# vvv2-resonance — 決済インフラ状況報告 & アクティベーションキー実装指示書

**作成日:** 2026年6月3日
**対象プロジェクト:** vvv2-resonance（Claude Code）

---

## 1. 現在の状況を把握してください

### Proプラン決済の経緯

TGR Resonance の Proプラン（¥1,500 買い切り）を販売するために、以下の決済手段を試みた。すべてNG。

| 決済サービス | 結果 | 理由 |
|---|---|---|
| **Stripe** | ❌ アカウント閉鎖 | カードネットワークパートナー（Visa/Mastercard等）の制限。パチスロ関連がギャンブルに該当すると判断された。異議申し立ても却下、再開不可。 |
| **KOMOJU** | ❌ 審査NG | 「KOMOJUの決済システムをご提供できない」。具体的な理由は非開示。おそらくStripeと同じ業種制限。 |

**結論：** 自前で決済サービスと加盟店契約を結ぶルートは、アプリの実態（パチスロデータ分析）が見える限り現時点で困難。

### 現在の代替決済手段

| 手段 | 状態 | 特徴 |
|---|---|---|
| **PayPay手動決済** | ✅ 稼働中 | PayPay ID `akp_studio` への送金 → アプリ内送金報告フォーム → /admin/payments で管理者が手動承認 → Pro化 |
| **note有料記事** | 🔧 準備中（今回実装） | noteプラットフォーム経由で販売。クレカ・PayPay・キャリア決済対応。noteが決済を処理するため、こちらへの業種審査なし |
| **BOOTH** | 🔧 準備予定 | pixiv運営のプラットフォーム。コンビニ決済・銀行振込・クレカ対応。noteと同じく業種審査なし |

### 直近で実装済みの機能（確認してください）

前回の作業セッション（4月末〜5月初旬）で以下を実装済み：

1. **PayPay決済フロー全体** — PayPay IDコピー機能、送金報告フォーム、プライバシー案内
2. **payment_requests テーブル** — 送金報告の管理（pending/approved/rejected）
3. **管理者画面 /admin/payments** — 承認・却下ボタン、Discord連携ステータスバッジ
4. **Pro昇格ポップアップ（ProUpgradePopup）** — is_pro=true時にポップアップ表示、「Discordを連携する」ボタン付き
5. **profiles.show_pro_popup カラム** — ポップアップ表示フラグ
6. **共通昇格ヘルパー src/lib/pro/upgradeUser.ts** — Stripe/PayPay両経路共通（is_pro=true + show_pro_popup=true + メール送信 + Discordロール付与）
7. **Discord OAuth2連携** — サーバー自動参加（join-guild）+ ロール付与（grant-role）、連携完了モーダル
8. **Stripe一時無効化** — NEXT_PUBLIC_STRIPE_ENABLED=false で非表示制御
9. **LP** — /lp にデプロイ済み（Pro販売の説得ページ）
10. **特商法ページ** — /tokushoho にデプロイ済み

### 重要な設計原則

**upgradeUserToPro() を唯一のPro化エントリポイントとする。**
どの決済チャネルからPro化しても、この関数を通すことで昇格時の挙動（is_pro更新、ポップアップフラグ、メール通知、Discordロール付与）が統一される。今回のアクティベーションキー方式でも同じ関数を呼ぶ。

---

## 2. 今回の実装依頼

### 概要

note・BOOTHで「Proプラン」を購入したユーザーが、アプリ側で自動的にPro化される仕組みを作る。
核心は「アクティベーションキー生成ページ」。これ1つで note・BOOTH・将来の他チャネルすべてに対応できる共通認証基盤。

### ユーザーのフロー

```
販売チャネル               キー生成ページ              アプリ
                                   
note有料記事 ──┐                                                 
               ├→ 有料部分のURL → /pro/activate にアクセス       
BOOTH購入   ──┘                                                 
                                   ① Gmailアドレスを入力         
                                   ② ユニークキーが生成 → DB保存   
                                   ③ コピーボタンでキーをコピー   
                                                                  
                                          ↓ ユーザーがコピー      
                                                                  
                                   ④ /pro のキー入力欄に          
                                      キーを貼り付けて送信        
                                   ⑤ APIがキーをDBから検索        
                                   ⑥ キーのGmail = ログイン中の   
                                      Gmail → 一致確認            
                                   ⑦ upgradeUserToPro() 実行      
                                   ⑧ 即時Pro化 + ポップアップ      
```

**管理者の手動承認: 不要。完全自動。**

### なぜこの方式か

- noteもBOOTHも、決済完了後にアプリへWebhookを飛ばす仕組みがない（Stripeとは違う）
- そのため「ユーザーが購入済みであること」をアプリ側で確認する手段が必要
- キー生成ページのURLは有料コンテンツの裏にしか存在しない → 購入者のみがアクセスできる
- Gmail照合により、キーを他人に共有しても使えない（生成時のGmail ≠ ログインGmail で弾かれる）
- 1メールアドレスにつき未使用キーは1つだけ → 重複発行防止

---

## 3. 実装タスク

### タスク1: DBテーブル作成 — activation_keys

```sql
CREATE TABLE activation_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  activation_key TEXT NOT NULL UNIQUE,
  used BOOLEAN DEFAULT false,
  used_by UUID REFERENCES auth.users(id),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 同一メールで未使用キーは1つだけ
CREATE UNIQUE INDEX idx_activation_keys_email_unused 
  ON activation_keys (email) WHERE used = false;

-- RLS
ALTER TABLE activation_keys ENABLE ROW LEVEL SECURITY;

-- service_role のみ操作可能
CREATE POLICY "Service role full access"
  ON activation_keys FOR ALL
  USING (true);
```

migration ファイルとして作成し、`source ~/.supabase-cli-token && supabase db push` で本番DBに適用してください。

---

### タスク2: キー生成ページ — /pro/activate

**URL:** `https://vvv2-resonance.vercel.app/pro/activate`

**ページの性質:**
- ログイン不要でアクセスできる公開ページ
- サイトのナビゲーション・フッター・サイトマップには含めない（URLを知ってる人だけがアクセスする秘密のページ）
- デザインは既存の /pro ページと同じダークテーマ・スタイルで統一

**UI — 初期状態:**

```
┌─────────────────────────────────────────────┐
│                                             │
│         🔑 Proプラン アクティベーション       │
│                                             │
│  アプリに登録しているメールアドレスを         │
│  入力してください。                          │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  メールアドレス                      │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  アクティベーションキーを生成 →       │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

**UI — キー生成後:**

```
┌─────────────────────────────────────────────┐
│                                             │
│         ✅ キーが生成されました              │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  PRO-7Xk9-mN2p-4Rj3       📋 コピー │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  次のステップ:                               │
│  ① アプリにログイン                          │
│  ② 「Pro詳細」ページを開く                   │
│  ③ 上記キーを貼り付けて送信                  │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  アプリを開く →                      │    │
│  └─────────────────────────────────────┘    │
│  （https://vvv2-resonance.vercel.app/pro）  │
│                                             │
└─────────────────────────────────────────────┘
```

**キー形式:** `PRO-XXXX-XXXX-XXXX`（X = 英数字ランダム）

**ロジック:**
- 同一メールで未使用キーが既にある → 新規発行せず既存キーを再表示
- メールのバリデーション: 空欄チェック、@含む形式チェックのみ

---

### タスク3: キー生成API — /api/activation/generate

**POST /api/activation/generate**（認証不要、公開API）

```json
// リクエスト
{ "email": "user@gmail.com" }

// 成功（新規生成）
{ "ok": true, "key": "PRO-7Xk9-mN2p-4Rj3" }

// 成功（既存キーあり）
{ "ok": true, "key": "PRO-既存のキー", "existing": true }

// エラー
{ "ok": false, "error": "Invalid email" }
```

レートリミット: 同一IPから1分間に5回まで（簡易的でOK）。

---

### タスク4: キー認証API — /api/activation/redeem

**POST /api/activation/redeem**（要認証 — ログイン中のユーザーのみ）

```json
// リクエスト
{ "key": "PRO-7Xk9-mN2p-4Rj3" }

// 成功
{ "ok": true, "message": "Pro activated" }

// エラー
{ "ok": false, "error": "Invalid or expired key" }
{ "ok": false, "error": "Email mismatch" }
{ "ok": false, "error": "Already pro" }
```

**処理（service_roleクライアント使用）:**
1. ログイン中ユーザーのセッションからメールアドレスを取得
2. activation_keys テーブルでキーを検索（used=false）
3. キーが見つからない → "Invalid or expired key"
4. キーのemail ≠ ログイン中のemail → "Email mismatch"
5. ユーザーが既にis_pro=true → "Already pro"
6. すべてOK →
   - activation_keys: `used=true, used_by=user_id, used_at=now()`
   - `upgradeUserToPro()` を呼び出し（既存の共通ヘルパー）
   - 成功レスポンスを返す

---

### タスク5: /pro ページにキー入力欄を追加

現在の /pro ページに「アクティベーションキーで有効化」セクションを追加。

**表示条件:** is_pro = false のユーザーのみ

**配置:** PayPay決済セクションの上（最もスムーズなフローをトップに置く）

**UI:**

```
┌─────────────────────────────────────────────┐
│  🔑 アクティベーションキーで有効化            │
│                                             │
│  note または BOOTH で購入済みの方は           │
│  キーを入力してください。                     │
│                                             │
│  ┌──────────────────────────────────┐       │
│  │  PRO-XXXX-XXXX-XXXX             │       │
│  └──────────────────────────────────┘       │
│                                             │
│  ┌──────────────────────────────────┐       │
│  │  有効化する →                     │       │
│  └──────────────────────────────────┘       │
│                                             │
└─────────────────────────────────────────────┘
```

**送信時の処理:**
1. /api/activation/redeem にキーをPOST
2. 成功 → 画面リロード → Pro昇格ポップアップ表示
3. 失敗 → エラーメッセージ表示:
   - "Invalid or expired key" → 「キーが無効です。正しいキーを入力してください。」
   - "Email mismatch" → 「キー生成時のメールアドレスと、ログイン中のアカウントが異なります。」
   - "Already pro" → 「すでにProプランをご利用中です。」

---

## 4. 既存フローとの共存

/pro ページには以下の決済手段が並存する（上から順に表示）:

1. **アクティベーションキー入力**（今回追加）— note/BOOTH購入者向け、自動Pro化
2. **PayPay手動決済**（既存）— PayPay ID `akp_studio`、送金報告フォーム、管理者承認
3. **Stripe**（停止中）— NEXT_PUBLIC_STRIPE_ENABLED=true で復活可能

---

## 5. テスト手順

**事前準備:** テストユーザー（is_pro=false）を用意。前回使った o9oriugs3pd9@gmail.com のリセットが必要なら:
```sql
UPDATE profiles SET is_pro = false, show_pro_popup = false WHERE email = 'o9oriugs3pd9@gmail.com';
```

**Step 1:** /pro/activate にアクセス（ログイン不要）
**Step 2:** テストユーザーのGmailを入力 → キー生成 → コピー
**Step 3:** テストユーザーでアプリにログイン → /pro → キー入力欄にペースト → 送信
**Step 4:** 自動Pro化 → ポップアップ表示 → Discord連携ボタン表示を確認
**Step 5:** 同じキーを再入力 → 「キーが無効です」エラーを確認
**Step 6:** 別メールで生成したキーを入力 → 「メールアドレスが異なります」エラーを確認

---

## 6. 参考情報

| リソース | 場所 |
|----------|------|
| 共通昇格ヘルパー | src/lib/pro/upgradeUser.ts |
| PayPay送金報告API | /api/payment/request |
| PayPay管理者承認API | /api/admin/payments/approve |
| Pro昇格ポップアップ | ProUpgradePopup コンポーネント |
| Discord OAuth start | /api/discord-oauth/start |
| Supabase CLI トークン | ~/.supabase-cli-token |
| DB push コマンド | `source ~/.supabase-cli-token && supabase db push` |

---

## 7. コミットメッセージ

`feat: implement activation key system for note/BOOTH payment channels`
（大きすぎる場合はタスクごとに分割コミットしてOK）
