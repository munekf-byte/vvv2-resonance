# Stripe 本番環境セットアップ — 進捗レポート & Claude Code 指示書

**作成日:** 2026年4月23日  
**プロジェクト:** HiveMind_AkiraP / TOKYO GHOUL RESONANCE (vvv2-resonance)

---

## 1. 完了済みタスク（claude.ai + 手動作業）

### Stripe 本番環境の有効化申請
- [x] ビジネスのウェブサイト登録 → `https://hivemind-akirap.onrender.com`
- [x] ビジネスの詳細（事業形態・個人情報）入力
- [x] 割賦販売法セキュリティ対策措置状況申告書の提出
- [x] 商品/サービスのカテゴリー・説明文入力
- [x] 明細書表記の設定（漢字: ハイブマインド / カナ: ハイブマインド / 英字: HIVEMIND AKIRAP）
- [x] 銀行口座の登録
- [x] 二段階認証（パスキー）の設定
- [x] 身分証明書の提出 → **現在審査中（1〜2営業日）**

### HiveMind_AkiraP ビジネスページの作成・デプロイ
- [x] Stripe審査用ビジネスページ（HTML）を作成
  - ブランド紹介（Vision / Products / Track Record）
  - 特定商取引法に基づく表記
  - 返金ポリシー
  - お問い合わせ（メール + X）
- [x] GitHubリポジトリ作成: `https://github.com/munekf-byte/hivemind-akirap`
- [x] Renderにデプロイ: `https://hivemind-akirap.onrender.com`

---

## 2. 現在のステータス

| 項目 | 状態 |
|------|------|
| Stripe本番環境 | 身分証明書の審査待ち（1〜2営業日） |
| 入金機能 | 一時停止中（審査完了後に自動解除） |
| 決済機能 | 審査完了後に利用可能 |
| 本番APIキー | 発行済み（`pk_live_` 確認済み） |
| Vercel環境変数 | **未切替（サンドボックスのまま）** |
| アプリ側 特商法ページ | **未作成** |

---

## 3. Claude Code 指示書

以下のタスクを実行してください。Stripe本番環境の審査待ちの間に準備を進めます。

---

### タスク A: 特定商取引法に基づく表記ページの作成

`/tokushoho` ページを新規作成してください。

**ファイル:** `src/app/tokushoho/page.tsx`

**記載内容:**

| 項目 | 内容 |
|------|------|
| 事業者名 | HiveMind_AkiraP（個人事業） |
| 運営責任者 | 請求があった場合に遅滞なく開示いたします |
| 所在地 | 請求があった場合に遅滞なく開示いたします |
| 連絡先 | メール: akirap.vvv.666@gmail.com / X: @puchun_dobadoba (https://x.com/puchun_dobadoba) |
| 販売価格 | 各サービスページに記載（税込表示） |
| 支払方法 | クレジットカード（Stripe決済）/ PayPay（手動対応） |
| 支払時期 | 購入時に即時決済 |
| 商品の引渡時期 | 決済完了後、即時にサービスを利用可能 |
| 返品・返金 | デジタルコンテンツの性質上、原則として返金はお受けしておりません。ただし、サービスに重大な不具合がある場合は個別に対応いたします。 |
| 動作環境 | モダンブラウザ（Chrome, Safari, Edge等の最新版） |

**デザイン:** 既存の `/terms` や `/privacy` ページと同じスタイルで統一してください。

**フッター更新:** 既存のフッターに「特定商取引法に基づく表記」へのリンクを追加してください。LPページ（tgr-pro-lp.html）のフッターにも同様にリンクを追加。

---

### タスク B: Stripe 本番用環境変数の準備

現在 Vercel に設定されている Stripe 環境変数はサンドボックス用です。  
本番環境の審査が通り次第、以下を本番用の値に差し替える必要があります。

**確認・準備してほしいこと:**

1. 現在の Vercel 環境変数の一覧を確認し、Stripe 関連のキーをリストアップ
2. 本番切替時に変更が必要な変数を明示（おそらく以下の4つ）:
   - `STRIPE_SECRET_KEY` → `sk_live_` で始まる値に変更
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_` で始まる値に変更
   - `NEXT_PUBLIC_STRIPE_PRICE_ID` → 本番環境の Price ID に変更
   - `STRIPE_WEBHOOK_SECRET` → 本番環境の Webhook Secret に変更
3. Webhook エンドポイント（`/api/webhook/stripe`）が本番環境の Stripe ダッシュボードに登録されているか確認。未登録なら登録手順を教えてください

**注意:** 値の差し替え自体はまだ行わないでください。審査完了後に実施します。  
今は「何を変える必要があるか」の確認と、手順の整理だけ行ってください。

---

### タスク C: サンドボックスから本番へのデータコピー確認

Stripe ダッシュボードで「テスト環境からデータをコピーしますか？」というプロンプトが表示されました。  
商品（Product）と価格（Price）をコピーした場合、Price ID が変わる可能性があります。

**確認してほしいこと:**

1. 現在のサンドボックスの Price ID（`NEXT_PUBLIC_STRIPE_PRICE_ID` の値）
2. コードベース内で Price ID をハードコードしている箇所があるか
3. Price ID が環境変数経由のみで参照されているか（環境変数だけなら差し替えが楽）

---

## 4. 審査完了後のアクションリスト

審査が通ったら以下を順番に実行する：

1. Stripe ダッシュボードでテスト環境から商品・価格データをコピー（または本番で新規作成）
2. 本番用の Price ID を確認
3. 本番用の Webhook エンドポイントを登録し、Webhook Secret を取得
4. Vercel の環境変数を本番用に差し替え（タスク B の4つ）
5. Vercel で再デプロイ
6. テスト決済（Stripe の本番環境でも少額テストが可能）
7. 動作確認後、LPの公開・告知

---

## 4.5 Claude Code 実行結果（2026-04-23）

### タスクA: 特商法ページ作成 — ✅ 完了

- 新規作成: `src/app/tokushoho/page.tsx`（`/terms`・`/privacy` と同スタイル／`bg-[#f5f0e8]` 背景、sticky ヘッダー、白カード、TGR バッジ）
- 表記内容: 事業者名 / 運営責任者 / 所在地 / 連絡先 / 販売価格 / 販売価格以外に必要な費用 / 支払方法 / 支払時期 / 引渡時期 / 返品・返金 / 動作環境（指示書の全項目＋「インターネット通信料金」を追加）
- フッター反映:
  - `src/components/layout/Footer.tsx` → `HIDDEN_PATHS` に `/tokushoho` 追加、リンク1件追加
  - `src/app/terms/page.tsx` 内部フッター → 「特定商取引法」リンク追加
  - `src/app/privacy/page.tsx` 内部フッター → 「特定商取引法」リンク追加
- LP (`tgr-pro-lp.html`) はレポリに含まれていないため、リポ外で別途反映が必要

### タスクB: Stripe 本番切替に必要な環境変数 — ✅ 確認のみ（値差し替えは未実施）

コード内の Stripe 環境変数参照箇所（3箇所のみ）:

| 環境変数 | 参照箇所 | 本番切替時の値 |
|---------|---------|--------------|
| `STRIPE_SECRET_KEY` | `src/lib/stripe/server.ts:7` | `sk_live_...` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | **コード内での直接参照なし**（現状は Checkout URL 全リダイレクト方式のため Stripe.js 未使用）。Vercel には登録されているのでそのまま本番値に差し替える | `pk_live_...` |
| `NEXT_PUBLIC_STRIPE_PRICE_ID` | `src/app/api/checkout/route.ts:21` | 本番環境の Price ID |
| `STRIPE_WEBHOOK_SECRET` | `src/app/api/webhook/stripe/route.ts:11` | 本番環境の Webhook Secret |

**Webhook エンドポイント登録（本番モード側で未登録の場合の手順）:**
1. Stripe ダッシュボード（右上トグルで **本番モード**）→ 開発者 → Webhook
2. 「エンドポイントを追加」→ URL: `https://vvv2-resonance.vercel.app/api/webhook/stripe`
3. リッスンするイベント: `checkout.session.completed`
4. 作成後、署名シークレット（`whsec_...`）をコピー → `STRIPE_WEBHOOK_SECRET` に設定
   （※詳細は `docs/discord/STRIPE_PRODUCTION_AND_E2E_TEST.md` の B-3 / B-5 と同じ）

### タスクC: Price ID ハードコード状況 — ✅ ハードコード無し

- リポジトリ全体を検索した結果、`price_xxx` 形式のハードコードは **ゼロ**
- Price ID 参照は `src/app/api/checkout/route.ts:21` の `process.env.NEXT_PUBLIC_STRIPE_PRICE_ID` のみ
- 結論: **本番移行時は Vercel 環境変数 1 箇所を差し替えれば完結**（コード変更不要）
- ※補足: `src/app/pro/page.tsx` に価格文言 `¥1,500` 等が表示テキストとして存在する可能性あり（`STRIPE_PRODUCTION_AND_E2E_TEST.md` B-8 参照）。Price を変更する場合はそのテキストを手動同期。

---

## 5. 参考情報

| リソース | URL |
|----------|-----|
| アプリ本体 | https://vvv2-resonance.vercel.app |
| ビジネスページ | https://hivemind-akirap.onrender.com |
| GitHub (アプリ) | https://github.com/munekf-byte/vvv2-resonance |
| GitHub (ビジネスページ) | https://github.com/munekf-byte/hivemind-akirap |
| 公開メール | akirap.vvv.666@gmail.com |
| X アカウント | https://x.com/puchun_dobadoba |
| Stripe 登録ビジネス名 | HiveMind_AkiraP |
