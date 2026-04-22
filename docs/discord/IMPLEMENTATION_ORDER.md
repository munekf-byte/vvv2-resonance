# 実装の進め方（Claude Code への申し送り）

## 現在の状況

- **Discord Bot（hivemind-bot）**: Render 上で稼働中
  - URL: `https://hivemind-bot-li18.onrender.com`
  - ロール付与API: `POST /api/discord/grant-role` 動作確認済み
  - サーバー構造（カテゴリ・チャンネル・ロール・権限）構築済み
- **TGR アプリ（vvv2-resonance）**: Vercel 上で稼働中
- **Stripe**: 現在サンドボックス環境

## 進め方

### Step 1: Discord 連携の実装（今やる）

`TGR_DISCORD_INTEGRATION_SPEC.md` に従って以下を実装する。

1. Supabase に `discord_id` カラム追加
2. 型定義更新
3. Discord ID 保存API（`/api/discord-link`）作成
4. Stripe webhook に Discord ロール付与処理を追加
5. VIP ROOM に Discord ID 入力UIを追加
6. ローカル環境変数に `DISCORD_BOT_API_URL` と `DISCORD_BOT_API_SECRET` を追加

**この時点では Stripe はサンドボックスのまま。** サンドボックスのテスト決済で Discord 連携の E2E フローが正常に動くことを確認する。

### Step 2: サンドボックスで E2E テスト

以下のフローを通しで確認する：

1. テストユーザーでログイン
2. VIP ROOM で Discord ID を入力・保存
3. Stripe テスト決済（サンドボックス）で Pro 購入
4. Webhook が発火 → `is_pro = true` 更新
5. Webhook 内で Bot API が呼ばれ、Discord に TGR-Pro ロールが付与される
6. Discord でそのユーザーに TGR カテゴリが見えるようになる

### Step 3: Stripe 本番切り替え（Discord 連携とは独立）

Discord 連携の動作確認が取れた後に、Stripe を本番に切り替える。

切り替え時に必要な作業：
- Stripe ダッシュボードで本番モードに切り替え
- 本番用の API キー（`STRIPE_SECRET_KEY`）を Vercel 環境変数に設定
- 本番用の Price ID（`NEXT_PUBLIC_STRIPE_PRICE_ID`）を作成・設定（**価格を ¥1,500 に変更**）
- 本番用の Webhook シークレット（`STRIPE_WEBHOOK_SECRET`）を設定
- Webhook エンドポイント URL（`https://vvv2-resonance.vercel.app/api/webhook/stripe`）を本番側に登録

**重要**: Discord 連携のコード自体はサンドボックスでも本番でも同じ。Stripe の環境変数を差し替えるだけで切り替わる。コード変更は不要。
