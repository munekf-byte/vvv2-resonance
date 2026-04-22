# TGR Stripe本番化 & Discord連携 E2Eテスト完了指示書

**ゴール**: ユーザーが ¥1,500 を決済 → Pro昇格 → Discord参加 → 機種カテゴリにアクセスできる。このフロー全体がエラーなく動くこと。

**現在の状況**:
- Discord Bot: Render 上で稼働中（`https://hivemind-bot-li18.onrender.com`）
- TGR アプリ: Discord連携コード実装済み・Vercel デプロイ済み
- Stripe: **サンドボックス環境**（本番切り替えがまだ）
- Supabase: `discord_id` カラム追加済み

---

## Phase A: サンドボックスで E2E テスト（先にやる）

Stripe本番に切り替える前に、サンドボックスで全フローを確認する。

### テスト手順

1. **テストユーザーでTGRアプリにログイン**（`https://vvv2-resonance.vercel.app`）

2. **VIP ROOM で Discord ID を入力**
   - `/pro` ページにアクセス
   - 無料ユーザーならまず Pro 購入フローへ（サンドボックスのテストカード `4242 4242 4242 4242` を使用）
   - Pro になった後、VIP ROOM に Discord ID 入力欄が表示されるか確認
   - テスト用 Discord アカウントの ID を入力して「連携する」を押す

3. **Discord でロール確認**
   - Discord サーバー「共闘リプ」で、テストユーザーに `TGR-Pro` ロールが付与されているか確認
   - TGR カテゴリ（東京喰種 RESONANCE）のチャンネルが見えるようになっているか確認

4. **Stripe テスト決済カード情報**:
   - カード番号: `4242 4242 4242 4242`
   - 有効期限: 任意の未来日（例: `12/30`）
   - CVC: 任意の3桁（例: `123`）
   - 名前・住所: 任意

### 確認ポイント

- [ ] `/pro` ページが正常に表示される
- [ ] Discord ID 入力欄が VIP ROOM に表示される
- [ ] Discord ID を保存できる（「連携済み」表示になる）
- [ ] Stripe テスト決済が完了する
- [ ] `profiles.is_pro` が `true` に更新される
- [ ] Discord で TGR-Pro ロールが自動付与される
- [ ] TGR カテゴリのチャンネルが見える

### トラブルシューティング

**Discord ID 入力欄が表示されない場合:**
- `/pro` ページのコードに Discord 連携セクションが含まれているか確認
- `profile.discord_id` が型定義に含まれているか確認

**ロールが付与されない場合:**
- Vercel のログ（Functions タブ）で `/api/discord-link` や `/api/webhook/stripe` のログを確認
- `DISCORD_BOT_API_URL` と `DISCORD_BOT_API_SECRET` が Vercel に正しく設定されているか確認
- Bot が Render 上でオンラインか確認（`https://hivemind-bot-li18.onrender.com/healthz` にアクセス → `{"ok":true}` が返るか）
- Bot のログ（Render ダッシュボード → Logs）にエラーが出ていないか確認

---

## Phase B: Stripe 本番切り替え

サンドボックスでの E2E テストが全て通ったら、以下を実行する。

### B-1. Stripe ダッシュボードで本番モードに切り替え

1. https://dashboard.stripe.com にログイン
2. 左上のトグルで **「テスト」→「本番」** に切り替え（またはテストモードをOFFにする）

### B-2. 本番用の商品 & 価格を作成

1. Stripe ダッシュボード（本番モード）→ **商品カタログ** → **商品を追加**
2. 商品名: `TGR Pro プラン`
3. 価格: **¥1,500**（JPY、一回限り）
4. 作成後、Price ID（`price_xxx...`）をコピー

### B-3. 本番用 Webhook エンドポイントを登録

1. Stripe ダッシュボード（本番モード）→ **開発者** → **Webhook**
2. **エンドポイントを追加**
3. URL: `https://vvv2-resonance.vercel.app/api/webhook/stripe`
4. リッスンするイベント: `checkout.session.completed`
5. 作成後、**Webhook署名シークレット**（`whsec_xxx...`）をコピー

### B-4. 本番用 API キーを取得

1. Stripe ダッシュボード（本番モード）→ **開発者** → **APIキー**
2. **シークレットキー**（`sk_live_xxx...`）をコピー
3. **公開可能キー**（`pk_live_xxx...`）をコピー

### B-5. Vercel 環境変数を本番値に差し替え

Vercel ダッシュボード → vvv2-resonance → Settings → Environment Variables で以下を**更新**:

| Key | 旧値（サンドボックス） | 新値（本番） |
|-----|---------------------|------------|
| `STRIPE_SECRET_KEY` | `sk_test_xxx...` | `sk_live_xxx...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_xxx...` | `pk_live_xxx...` |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | `price_xxx...`（テスト） | `price_xxx...`（本番・¥1,500） |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx...`（テスト） | `whsec_xxx...`（本番） |

**注意**: 既存の値を編集（「…」→ Edit）して上書きする。削除して新規追加でもOK。

### B-6. Vercel を Redeploy

環境変数を更新したら **Redeploy** する。
Deployments → 最新デプロイの「…」→ Redeploy

### B-7. 本番環境での最終確認

1. `https://vvv2-resonance.vercel.app/pro` にアクセス
2. 価格が **¥1,500** と表示されているか確認
3. **実際のクレジットカードでテスト購入**（自分のカードで ¥1,500 を決済）
4. Pro 昇格 → Discord ロール付与 → 機種カテゴリアクセスが全て動くか確認

### B-8. アプリ内の価格表示を更新

現在のコードでは `/pro` ページに `¥993` とハードコードされている箇所がある。
以下のファイルで価格表示を `¥1,500` に変更する:

- `src/app/pro/page.tsx` — 価格カードの金額表示
  - `¥993` → `¥1,500`
  - `クレジットカードで購入（993円）` → `クレジットカードで購入（1,500円）`
  - その他 993 への言及をすべて 1,500 に変更

---

## 完了チェックリスト

### サンドボックスE2E（Phase A）
- [ ] テストカードで決済が完了する
- [ ] `profiles.is_pro = true` に更新される
- [ ] VIP ROOM に Discord ID 入力欄が表示される
- [ ] Discord ID を保存できる
- [ ] Discord で TGR-Pro ロールが自動付与される
- [ ] TGR カテゴリのチャンネルが見える

### 本番切り替え（Phase B）
- [ ] 本番用商品（¥1,500）を作成
- [ ] 本番用 Webhook を登録
- [ ] Vercel 環境変数を本番値に更新
- [ ] Redeploy 完了
- [ ] アプリの価格表示が ¥1,500 になっている
- [ ] 実カードで ¥1,500 の決済が完了する
- [ ] 決済後に Pro 昇格する
- [ ] Discord ロールが自動付与される
- [ ] TGR カテゴリにアクセスできる

---

## 環境変数の全体像（最終状態）

### Vercel（TGR アプリ）

| Key | 値の出所 |
|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase ダッシュボード |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase ダッシュボード |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase ダッシュボード |
| `STRIPE_SECRET_KEY` | Stripe 本番 API キー |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe 本番 公開キー |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | Stripe 本番 Price ID（¥1,500） |
| `STRIPE_WEBHOOK_SECRET` | Stripe 本番 Webhook シークレット |
| `DISCORD_BOT_API_URL` | `https://hivemind-bot-li18.onrender.com` |
| `DISCORD_BOT_API_SECRET` | Bot 側の BOT_API_SECRET と同じ値 |

### Render（Discord Bot）

| Key | 値の出所 |
|-----|---------|
| `DISCORD_BOT_TOKEN` | Discord Developer Portal |
| `DISCORD_GUILD_ID` | Discord サーバーID |
| `DISCORD_CLIENT_ID` | Discord アプリケーションID |
| `BOT_API_SECRET` | 自動生成されたシークレット |
