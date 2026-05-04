# TGR Resonance — Next.js + Supabase フルスタックスキル

**目的**: このスキルファイルだけ読めば、予備知識のない Claude Code が同等のプロジェクトを立ち上げ・実装できる。
**対象バージョン**: v5.35（2026-05 時点）

---

## 読み方ガイド

| セクション | 内容 | いつ読むか |
|-----------|------|-----------|
| 1. プロジェクト概要 | 目的・スタック・課金モデル | 最初に必ず |
| 2. 技術スタック詳細 | 依存パッケージ・バージョン・役割 | 環境構築時 |
| 3. ディレクトリ構造 | ファイル一覧と責務 | コード追加・修正時 |
| 4. 型定義 | TypeScript 型の全体像 | データ構造を理解する時 |
| 5. データフロー | Zustand → localStorage → Supabase の同期設計 | 状態管理・保存処理を実装する時 |
| 6. 認証・RLS・セキュリティ | Supabase Auth + RLS + Webhook の設計 | API・DB・課金を触る時 |
| 7. ゲームドメインエンジン | 差枚数計算・モード推定の仕様 | 計算ロジックを修正する時 |
| 8. UIデザインシステム | → `references/design.md` に全仕様 | UI実装・改修時 |
| 9. 横画面回転 + LandscapeSelectOverlay | CSS回転内のネイティブUI問題と対策 | 横画面入力UIを触る時 |
| 10. 後追い保留パターン（PendingKakugan） | 「発生だけ先に記録、G数は後で確定」フロー | 保留→確定UIを実装する時 |
| 11. 写真アップロード | Supabase Storage 容量監視 + アトミック契約 | 写真機能を触る時 |
| 12. 法的ページ | 利用規約・プライバシー・特商法 | 法務まわりを触る時 |
| 13. Pro 化フロー | → `stripe-discord-pro-upgrade` スキル参照 | Pro/Discord 連携時 |
| 14. 統計分析レイヤー（任意） | → `pachislot-analytics-layer` スキル参照 | ログ収集を実装する時 |
| 15. 運用ルール | バージョン管理・デプロイフロー | コミット・リリース時 |

---

## 1. プロジェクト概要

### 1.1 何を作っているか

**TGR Resonance** — パチスロ機種「L東京喰種 RESONANCE」の稼働データを記録・分析するモバイルファーストWebアプリ。

- 1回の稼働 = 1セッション
- 通常時の周期データ（ゲーム数・ゾーン・モード・示唆演出）を記録
- AT中のSET対決・BITES・有馬ジャッジメント等を記録
- 差枚数を自動計算し、設定推測の根拠を可視化
- ベイズ推定でモード（内部状態）を確率表示
- 前任者履歴写真・稼働結果写真をクラウド保存（Pro限定）

### 1.2 ユーザー

パチスロを打つ人（ホール現場でスマホ片手に入力する）。操作は全てタップ。キーボード入力は最小限。

### 1.3 課金モデル（現状）

- 無料版: セッション3件まで
- Pro版: 無制限 + トータル数値分析 + Discord ロール付与（買い切り ¥993）
- **現在は PayPay 手動運用 + 管理者承認で `is_pro` 更新**（Stripe 業種審査 NG）
- Stripe Webhook 経路は実装済み・配線残置（将来再開時の足場）。Pro 化の仕組み詳細は `stripe-discord-pro-upgrade` スキルを参照

---

## 2. 技術スタック詳細

### 2.1 コアスタック

| 技術 | バージョン | 役割 |
|------|-----------|------|
| Next.js | 15.x | App Router (RSC + Client Components) |
| React | 19.x | UI |
| TypeScript | 5.6+ | 型安全 |
| Tailwind CSS | 3.4+ | スタイリング |
| Zustand | 5.x | クライアント状態管理 |
| Supabase | 2.45+ | PostgreSQL + Auth + RLS + Storage |
| @supabase/ssr | 0.9+ | Next.js SSR/Cookie 統合 |
| Stripe | 22.x | 決済（Checkout + Webhook、現在は実装残置） |

### 2.2 補助ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| html-to-image / html2canvas | 集計画面のスクリーンショット出力 / Web Share 画像保存 |
| lucide-react | アイコン |
| clsx + tailwind-merge | 条件付きクラス結合 |

### 2.3 インフラ

| サービス | 用途 |
|---------|------|
| Vercel | ホスティング・CI/CD（GitHub連携自動デプロイ） |
| Supabase Cloud | DB・Auth・Storage（`session-photos` バケット） |
| Stripe | 決済処理（休止中） |
| Discord | OAuth + Bot ロール付与（Pro 特典） |

---

## 3. ディレクトリ構造

```
src/
├── app/                              # Next.js App Router
│   ├── page.tsx                      # ログインページ（"/"）
│   ├── layout.tsx                    # ルートレイアウト（AuthGuard含む）
│   ├── globals.css                   # Tailwind + カスタムCSS
│   │
│   ├── dashboard/                    # ダッシュボード
│   │   ├── page.tsx                  #   ヘッダー（背景画像）+ バージョン表記
│   │   ├── DashboardShell.tsx        #   タブ切替・ユーザーバー・Pro/無料版分岐
│   │   ├── DashboardClient.tsx       #   セッション一覧・並べ替え・CRUD
│   │   ├── NewSessionButton.tsx      #   ＋新規セッション開始FAB
│   │   ├── SignOutButton.tsx         #   ログアウト
│   │   └── TotalAnalysis.tsx         #   トータル数値分析（Pro専用）
│   │
│   ├── play/[id]/                    # セッション記録画面
│   │   ├── page.tsx                  #   SSR: DB読み込み → Client に渡す
│   │   └── PlayClientPage.tsx        #   タブ3種（通常時/AT記録/集計）+ FAB群
│   │
│   ├── pro/page.tsx                  # Pro プラン案内 / VIPルーム / Discord 連携
│   ├── tutorial/page.tsx             # 使い方ガイド（画像付き複数セクション）
│   ├── terms/page.tsx                # 利用規約
│   ├── privacy/page.tsx              # プライバシーポリシー
│   ├── tokushoho/page.tsx            # 特定商取引法に基づく表記
│   ├── admin/                        # 管理者画面（is_admin=true のみ）
│   │   ├── page.tsx
│   │   ├── analytics/                #   統計閲覧（pachislot-analytics-layer）
│   │   └── payments/                 #   PayPay 申請承認・is_pro 更新
│   │
│   ├── api/                          # API Routes
│   │   ├── sessions/route.ts         #   GET: セッション一覧
│   │   ├── sessions/count/route.ts   #   GET: セッション件数（無料制限判定）
│   │   ├── session/create/route.ts   #   POST: セッション新規作成
│   │   ├── session/[id]/save/route.ts#   PUT: セッションデータ保存
│   │   ├── session/[id]/load/route.ts#   GET: セッション読み込み
│   │   ├── session/[id]/route.ts     #   DELETE: セッション論理削除
│   │   ├── checkout/route.ts         #   POST: Stripe Checkout（休止中）
│   │   ├── webhook/stripe/route.ts   #   POST: Stripe Webhook（休止中・足場残置）
│   │   ├── payment/request/          #   POST: PayPay 支払申請
│   │   ├── payment/status/           #   GET: 支払申請ステータス
│   │   ├── profile/dismiss-pro-popup/#   POST: Pro案内ポップアップ閉じる
│   │   ├── discord-oauth/start/      #   GET: Discord OAuth 開始
│   │   ├── discord-oauth/callback/   #   GET: OAuth コールバック → ロール付与
│   │   ├── discord-link/route.ts     #   Discord 紐付け管理
│   │   ├── analytics/at-set/         #   POST: AT-SET イベントログ
│   │   ├── analytics/cz-event/       #   POST: CZ発生ログ
│   │   ├── analytics/cz-outcome/     #   POST: CZ結果ログ
│   │   └── admin/                    #   管理者API (Service Role Key)
│   │       ├── users/                #     ユーザー管理
│   │       ├── sessions/             #     セッション管理（物理削除可）
│   │       ├── payments/             #     PayPay 承認 → is_pro=true
│   │       └── analytics/            #     統計集計
│   │
│   └── auth/callback/route.ts        # Supabase Auth コールバック
│
├── components/
│   ├── auth/
│   │   ├── AuthContext.tsx           # ユーザー・プロフィール Context Provider
│   │   └── AuthGuard.tsx             # 認証ガード（未ログイン→リダイレクト）
│   ├── tg/                           # 東京喰種ドメインコンポーネント
│   │   ├── NormalBlockList.tsx       #   通常時一覧（浮遊カード・差枚数スタンプ）
│   │   ├── NormalBlockEditDashboard.tsx#  通常時入力ダッシュボード
│   │   ├── ATBlockList.tsx           #   AT記録一覧
│   │   ├── ATBlockEditDashboard.tsx  #   AT記録入力ダッシュボード
│   │   ├── SummaryTab.tsx            #   集計タブ（全自動集計・設定示唆色分け）
│   │   ├── UchidashiEditDashboard.tsx#   打ち出し設定入力
│   │   ├── ShushiEditDashboard.tsx   #   収支入力
│   │   ├── PendingKakuganBanner.tsx  #   赫眼後追い確定 浮遊バナー
│   │   └── LandscapeSelect.tsx       #   横画面追従セレクト（後述 §9）
│   ├── photo/
│   │   ├── PhotoSlotBlock.tsx        # 写真スロット（前任履歴・稼働結果）
│   │   └── PrevPhotoThumb.tsx        # サムネ表示
│   ├── pro/
│   │   ├── ProUpgradePopup.tsx       # Pro 案内ポップアップ
│   │   └── DiscordLinkSuccessModal.tsx# Discord 連携成功モーダル
│   ├── ui/
│   │   └── LongPressHint.tsx         # 1.5秒長押しヘルプモーダル
│   ├── layout/
│   │   └── Footer.tsx                # 利用規約・プライバシー・特商法リンク
│   └── TermsUpdateBanner.tsx         # 規約改定バナー（改定後7日間 / × で即時クローズ）
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # ブラウザ用クライアント（シングルトン）
│   │   ├── server.ts                  # サーバー用 + getCurrentUser/Profile
│   │   ├── session-db.ts              # セッション CRUD ヘルパー
│   │   └── profile-sync.ts            # プロフィール自動同期
│   ├── stripe/
│   │   └── server.ts                  # Stripe SDK 遅延初期化（getStripe()）
│   ├── pro/
│   │   └── upgradeUser.ts             # is_pro=true への共通処理（Webhook/Admin API共有）
│   ├── photo/
│   │   ├── compress.ts                # 画像圧縮（フル~250KB / サムネ~30KB）
│   │   └── upload.ts                  # Supabase Storage アップロード
│   ├── email/
│   │   └── sendMail.ts                # 通知メール送信
│   ├── analytics/
│   │   ├── event-logger.ts            # fire-and-forget ログ送信
│   │   ├── offline-queue.ts           # オフライン時 localStorage キュー
│   │   ├── hash.ts                    # ユーザーID ハッシュ化
│   │   └── api-helpers.ts             # /api/analytics/* 共通処理
│   ├── engine/
│   │   ├── modeEstimation.ts          # ベイズモード推定エンジン v2.1
│   │   ├── modeTables.ts              # 尤度テーブル・制約テーブル
│   │   └── constants.ts               # ゲーム定数（ゾーン・モード・イベント等）
│   ├── tg/
│   │   ├── medalCalc.ts               # 差枚数計算エンジン
│   │   ├── analytics.ts               # セッション内集計ロジック
│   │   ├── analytics-admin.ts         # 管理者向け全体集計
│   │   ├── cellColors.ts              # セル背景色・モード略称
│   │   ├── suggestionColors.ts        # 設定示唆の行色
│   │   ├── settingDiff.ts             # 設定差分析
│   │   ├── captureImage.ts            # 画面キャプチャ（html-to-image）
│   │   └── localStore.ts              # localStorage 操作
│   ├── auth/
│   │   └── access.ts                  # 権限チェックユーティリティ
│   └── config/
│       └── links.ts                   # 外部リンク定数（X/Discord）
│
├── store/
│   └── useSessionStore.ts             # Zustand Store: PlaySession 全操作
│
├── types/
│   └── index.ts                       # 全型定義（後述 §4）
│
└── utils/
    ├── cn.ts                          # clsx + tailwind-merge
    └── format.ts                      # 数値フォーマット
```

---

## 4. 型定義（src/types/index.ts）

### 4.1 通常時データ

```
PlaySession
  ├── normalBlocks: TGNormalBlock[]    ← 通常時の周期配列
  │     ├── jisshuG: number | null     実G数
  │     ├── zone: string               ゾーン（不明/50/100/.../600）
  │     ├── estimatedMode: string      推定モード（A/B/C/CH/PRE/HEAVEN）
  │     ├── winTrigger: string         当選契機
  │     ├── event: string              イベント（レミニセンス/大喰いの利世/エピボ等）
  │     ├── atWin: boolean             AT初当たりフラグ
  │     ├── endingSuggestion: string   終了画面示唆
  │     ├── trophy: string             トロフィー
  │     ├── kakugan: string[]          赫眼（複数記録）
  │     ├── shinsekai: string[]        精神世界（複数記録）
  │     ├── invitation: string[]       招待状（複数記録）
  │     ├── zencho: string[]           前兆（複数記録）
  │     ├── eyecatch: string[]         アイキャッチ（複数記録）
  │     ├── czCounter?: TGCZCounter    CZ役カウンター
  │     ├── yame?: boolean             ヤメフラグ
  │     ├── memo?: string              フリーメモ
  │     └── createdAt?: string         生成タイムスタンプ
  │
  ├── atEntries: TGATEntry[]           ← AT初当たり配列
  │     └── rows: TGATRow[]            SET行 or 有馬行
  │           ├── TGATSet (rowType:"set")
  │           │     ├── atType         通常AT/裏AT/隠れ裏AT(推測)
  │           │     ├── character      敵キャラ
  │           │     ├── bitesType/Coins BITES種別・獲得枚数
  │           │     ├── directAdds[]   直乗せ
  │           │     ├── battles[]      対決（契機+成績）
  │           │     ├── endingCard?    エンディングカード（白/青/赤×弱強+銅/銀/金/虹）
  │           │     ├── edKakuganCount? EDボナ赫眼カウント
  │           │     └── coinsHint?     枚数表示示唆
  │           └── TGArimaJudgment (rowType:"arima")
  │                 ├── result         成功/失敗
  │                 ├── role           小役ナシ/リプレイ/レア役
  │                 ├── ccgCoins       500/1000/2000
  │                 └── favorableCut?  有利切断 (-/切断[ED]/切断[推定])  ★v5.x
  │
  ├── uchidashi?: UchidashiState       ← 打ち出し設定
  ├── shushi?: ShushiData              ← 収支入力
  ├── userSettingGuess?: string        ← ユーザー推測設定
  ├── shinsekaiWeakRare?: TGShinsekaiCounter ← 精神世界中の弱レア役カウンタ ★
  │     ├── miss: number               ハズレ回数
  │     └── win: number                当選回数
  ├── pendingKakugan?: PendingKakugan  ← 赫眼後追い保留状態 ★（後述 §10）
  │     ├── blockId: string            発生周期ブロック id
  │     └── startedAt: string          発生時刻 ISO
  ├── prevPhotoUploadedAt?: string     ← 前任者写真アップ完了時刻 ★
  └── resultPhotoUploadedAt?: string   ← 稼働結果写真アップ完了時刻 ★
```

★ は v4.69 以降に追加された主要フィールド。

### 4.2 DB スキーマ

| テーブル | 主要カラム | RLS |
|---------|-----------|-----|
| `profiles` | id(UUID), email, display_name, avatar_url, is_pro, is_admin, discord_user_id, payment_pending | auth.uid() = id |
| `play_sessions` | id(UUID), user_id, machine_name, normal_blocks(JSONB), at_entries(JSONB), is_deleted, prev_photo_uploaded_at, result_photo_uploaded_at | auth.uid() = user_id |
| `payment_requests` | id, user_id, status (pending/approved/rejected), method (paypay), created_at | auth.uid() = user_id |
| `analytics_*_events` | event-specific（fire-and-forget INSERT のみ） | INSERT 許可・SELECT 不可（管理者のみ） |

`normal_blocks` と `at_entries` は JSONB で TypeScript 型をそのまま JSON シリアライズして格納。

---

## 5. データフロー

### 5.1 読み込み（初回ロード）

```
SSR (page.tsx)
  → Supabase からセッション取得
  → PlayClientPage に initialSession として渡す
    → Client: DB データあり → Zustand Store にロード + localStorage 上書き
    → Client: DB 空 → localStorage フォールバック
    → Client: 両方空 → フォールバックセッション生成
```

### 5.2 書き込み（保存フロー）

```
ユーザー操作
  → Zustand Store 更新（即時）
  → localStorage 保存（即時）
  → 500ms デバウンス → Supabase DB 非同期保存
    → 失敗時: 1秒 → 3秒 → 8秒 リトライ（最大3回）
    → 全失敗: localStorage の pending セットに記録 → 次回起動時に再試行
```

### 5.3 同期ステータス

| ステータス | 色 | 意味 |
|-----------|-----|------|
| synced | 緑 | DB同期完了 |
| saving | 青 | アップロード中 |
| pending | 黄 | リトライ待ち |
| error | 赤 | 全リトライ失敗 |
| auth_error | 赤 | 認証切れ |

### 5.4 鉄則

- **localStorage はキャッシュ、Supabase が唯一の真実**
- **user_id はサーバー側の `auth.getUser()` から注入**（フロント値は無視）
- **論理削除**（`is_deleted`）、物理削除は管理者APIのみ
- **Edit ダッシュボードで block を表示する時は、Store から live で derive する**（ローカル snapshot は古くなる、§10 参照）

---

## 6. 認証・RLS・セキュリティ

### 6.1 認証フロー

Supabase Auth（Google OAuth）→ `/auth/callback` → profiles テーブルに自動同期

### 6.2 RLS ポリシー

- `profiles`: SELECT/INSERT/UPDATE で `auth.uid() = id`。DELETE ポリシーなし
- `play_sessions`: SELECT/INSERT/UPDATE で `auth.uid() = user_id`。ソフトデリート方式
- `analytics_*_events`: INSERT のみ許可（誰でも投入可だが SELECT は管理者のみ）
- `FOR ALL` は使わず、操作ごとに個別定義

### 6.3 管理者アクセス

アプリケーション層チェック方式（`is_admin` をDB直読み）。管理者APIのみ Service Role Key で RLS バイパス。

### 6.4 Stripe Webhook（休止中・足場残置）

```
Stripe → POST /api/webhook/stripe
  → 署名検証（constructEvent）
  → lib/pro/upgradeUser.ts → profiles.is_pro = true
```

`runtime = "nodejs"`, `dynamic = "force-dynamic"`, 署名検証必須。

### 6.5 環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Webhook/Admin のみ
STRIPE_SECRET_KEY=sk_live_xxx             # サーバーのみ
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_STRIPE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
DISCORD_BOT_TOKEN=...                     # ロール付与用
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_GUILD_ID=...
DISCORD_PRO_ROLE_ID=...
```

**秘密鍵には `NEXT_PUBLIC_` を付けない。**

詳細: `docs/ARCHITECTURAL_BLUEPRINT.md`

---

## 7. ゲームドメインエンジン

### 7.1 差枚数計算（src/lib/tg/medalCalc.ts）

```
Loss = totalNormalG × (50/31)
Gain = Σ(ATエントリごと: Base + SET数×40 + uenose) + czCount×32
```

- Base: 通常AT=150 / エピボ=250 / ロンフリ=2000
- uenose: BITES合計 + 直乗せ合計 + CCG死神合計
- CZ: 8G × 4.0枚/G = 32枚/回

`computeMedalStamps()` / `computeFinalResult()` を提供。詳細: `docs/tg-medal-calculation.md`

### 7.2 モード推定（src/lib/engine/modeEstimation.ts）

6モード: A(600G) / B(600G) / C(500G) / CH(600G) / PRE(300G) / HEAVEN(100G)

ベイズ尤度更新方式:
1. 事前確率（デフォルト or 前ブロック継承）
2. 前兆挙動で Hard Constraint（50G前兆ステージ→HEAVEN濃厚 等）
3. アイキャッチ・招待状で尤度更新（0.40〜0.60、100%ではない）
4. CZエンドカードは**次ブロック**の事前確率に適用
5. 正規化して確率分布を出力

- 継承時 Decay: 0.85 + Floor 0.025
- `topModes(n)`: 上位Nモードを%付きで返却

詳細: `docs/tg-mode-estimation.md`

---

## 8. UIデザインシステム

全仕様は **`references/design.md`** に集約。主要ポイントのみ:

- **浮遊カードデザイン**: ウォームベージュ `#e8e2d8` 背面 + 白カード黒枠
- **セグメントコントロール**: iOS風角丸タブ（ダッシュボード=黒 `#1f2937` / Play=赤 `#dc2626`）
- **select禁止**: 全選択肢は `grid` + `py-3以上` のスクエアボタン
- **タップフィードバック**: `active:scale-95` 必須
- **選択状態**: `boxShadow: "0 0 0 2px #1f2937"`
- **長押しヘルプ**: 1.5秒長押し → モーダル（`user-select: none`）
- **差枚数スタンプ**: プラス=緑 / マイナス=赤 バッジ
- **一時保存**: 緑フラッシュ `#16a34a` + `✓ 保存しました` → 1.2秒復帰

---

## 9. 横画面回転 + LandscapeSelectOverlay

### 9.1 課題

集計画面などで CSS `transform: rotate(90deg)` で横画面表示するステージを作っている。
ネイティブの `<select>` はステージの回転 transform に追従しない（OS が回転前の座標で picker を描画するため、視覚と入力UIがねじれて切れる）。

### 9.2 解決パターン（`src/components/tg/LandscapeSelect.tsx`）

```
LandscapeSelectOverlay
  ├── 縦画面: 普通の <select className="absolute inset-0 opacity-0" />
  └── 横画面: 透明ボタン → onClick で fixed inset-0 の自前モーダルを開く
```

ポイント:
- モーダルは `position: fixed inset-0`。CSS仕様により transform 祖先（回転ステージ）に containing block が拘束されるため、回転と一緒に表示される
- `z-[80]` で他要素より前面
- 選択肢は §8 のスクエアボタン規定に準拠

### 9.3 適用範囲

横画面ステージ内で使われるすべてのプルダウン的選択UI。
呼び出し側で `landscape={useLandscape}` を boolean で渡すだけで切替可能。

---

## 10. 後追い保留パターン（PendingKakugan）

### 10.1 ユースケース

「赫眼が発生した瞬間に画面遷移はしたくない。発生だけ先に記録し、継続G数は後で確定したい。」
スマホ片手で打っている現場で、入力画面と打ち出しの注意配分を最適化するための UX。

### 10.2 構造

```
PlaySession.pendingKakugan: PendingKakugan | null
  ├── blockId: string    どの周期で発生したか
  └── startedAt: string  発生時刻 ISO
```

null = 保留なし。non-null = 確定待ち。

### 10.3 操作フロー

```
[赫眼発生] ボタン押下
  → 周期 block を localStorage/Store に保存
  → setPendingKakugan({ blockId, startedAt })
  → ダッシュボードを閉じない（onClose 呼ばない）
  → PendingKakuganBanner が画面下部に浮遊表示

[バナー] G数選択 → 確定
  → confirmPendingKakugan(value)
    → normalBlocks.find(b => b.id === blockId).kakugan.push(value)
    → setPendingKakugan(null)
  → 直接プルダウン選択した記録と完全に同じ形式で保存
```

### 10.4 表示同期の落とし穴と対策

Edit ダッシュボードを開いている状態で保留確定が走ると、確定値が反映されない問題が起きる。
原因2層:

1. **block prop が snapshot**: 親の `normalEdit.block` ローカル state を渡すと、Store 側の最新 block が伝わらない
2. **form ローカル state は mount 時 1回しか初期化されない**: prop が変わっても form 内の `kakugan` 配列は古いまま

**対策**:

```tsx
// 1. block prop を Store から live で derive
<NormalBlockEditDashboard
  block={
    normalEdit.block
      ? (blocks.find((b) => b.id === normalEdit.block!.id) ?? normalEdit.block)
      : null
  }
/>

// 2. block.kakugan の長さが伸びたら form.kakugan に反映する useEffect
useEffect(() => {
  if (!block) return;
  const ext = block.kakugan ?? [];
  setForm((prev) => {
    const cur = prev.kakugan ?? [];
    if (ext.length > cur.length) {
      return { ...prev, kakugan: ext };
    }
    return prev;
  });
}, [block?.kakugan]);
```

長さ増加時のみ反映する判定にすることで、ユーザーがフォーム編集中の上書きを防ぐ（編集と保留確定がバッティングする極稀ケースは確定優先のトレードオフ）。

### 10.5 不変条件

- 直接プルダウン記録と保留経由記録は **同じ `kakugan: string[]` に同じ形式で append** される（記録形式の二重化禁止）
- 確定の見た目反映は即時。タイムラグ・サイレントカウントは UX として NG

---

## 11. 写真アップロード（`session-photos` バケット）

### 11.1 ストレージ構成

- バケット: `session-photos`（Supabase Free Plan = 1GB 上限）
- 1セッション最大 ≒ 280KB（フル ~250KB + サムネ ~30KB）
- 種類: 前任者履歴写真（Pro限定）/ 稼働結果写真

### 11.2 容量監視

- 週1回: Supabase Dashboard → Storage → `session-photos` → Usage 確認
- **800MB で警報** → 古い写真整理 or Pro Plan 移行を検討

### 11.3 アトミック契約

```
upload(full) → upload(thumb) → 両方成功 → prev_photo_uploaded_at = now()
                          ↓ どちらか失敗
                          → uploaded_at は更新しない（部分成功で UI が嘘をつかないようにする）
```

`src/lib/photo/upload.ts` がこの契約を実装。`prev_photo_uploaded_at` / `result_photo_uploaded_at` はキャッシュバスト用にも兼用（URL に `?t=...` を付ける）。

### 11.4 圧縮

`src/lib/photo/compress.ts` でアップロード前にクライアント圧縮。フル画質保持しつつ容量を抑える。

詳細: `docs/photo-upload-setup.md`

---

## 12. 法的ページ

| ページ | パス | 内容 |
|-------|------|------|
| 利用規約 | `/terms` | 規約改定時は `TermsUpdateBanner` を表示（改定後7日間） |
| プライバシーポリシー | `/privacy` | 取得情報・第三者提供・削除権 |
| 特定商取引法に基づく表記 | `/tokushoho` | 課金がある場合は必須 |

リンクは `components/layout/Footer.tsx` に集約。
規約改定通知は `components/TermsUpdateBanner.tsx` が dashboard ヘッダー直下に挿入。`×` で即時クローズ可能、改定後7日経過で自動非表示。

---

## 13. Pro 化フロー

このセクションは別スキル `stripe-discord-pro-upgrade` に固定パターンとして集約されている。
新規実装・改修時は **必ず** そちらを参照すること。

要約:

```
[ユーザー] → 決済（Stripe Checkout / または PayPay 申請）
  → Webhook（Stripe）or 管理者承認（PayPay）
  → lib/pro/upgradeUser.ts → profiles.is_pro = true
  → クライアント: Pro 機能解放
  → /pro ページから Discord OAuth 開始
    → /api/discord-oauth/callback
    → Bot がギルドにロール付与
    → DiscordLinkSuccessModal 表示
```

参照:
- `.claude/skills/stripe-discord-pro-upgrade/SKILL.md`
- `.claude/skills/stripe-discord-pro-upgrade/templates/`

---

## 14. 統計分析レイヤー（任意）

データ収集の汎用骨格は別スキル `pachislot-analytics-layer` に固定パターンとして集約されている。
新規パチスロ系アプリで統計を取るときは **必ず** そちらを参照。

骨格部分（汎用・他アプリで再利用可）:

| ファイル | 役割 |
|---------|------|
| `lib/analytics/event-logger.ts` | fire-and-forget 送信。失敗してもユーザー操作を妨げない |
| `lib/analytics/offline-queue.ts` | オフライン時 localStorage キュー → 復帰時 flush |
| `lib/analytics/hash.ts` | ユーザーID をハッシュ化（プライバシー保護） |
| `lib/analytics/api-helpers.ts` | `/api/analytics/*` の共通処理 |
| `app/api/analytics/<event>/route.ts` | Service Role Key で `analytics_<event>_events` テーブルへ INSERT |
| RLS | INSERT のみ許可・SELECT は管理者のみ |
| 同意バナー | 初回 opt-in |

機種固有の分析対象（CZ種別 / AT-SET 等）は元スキルに残す。

参照: `.claude/skills/pachislot-analytics-layer/SKILL.md`

---

## 15. 運用ルール

### 15.1 バージョン管理

- **1コミット = 1バージョンアップ**（例外なし）
- 表示箇所: `src/app/dashboard/page.tsx` のヘッダー内 `<span>`
- 機能追加時は dashboard と play 画面 2箇所をバンプ
- 現在: v5.35

### 15.2 デプロイフロー

```
git add <files>
git commit --amend --reset-author
git push -f origin main
# 確認は curl で（vercel ls はブラウザ認可ポップアップが障壁になる）
curl -s https://vvv2-resonance.vercel.app/dashboard | grep -o 'v5\.[0-9]*'
```

### 15.3 コミットルール

- 機能追加: `feat: vX.XX - 日本語説明`
- バグ修正: `fix: vX.XX - 日本語説明`
- バージョン番号を必ずコミットメッセージに含める

### 15.4 UIレギュレーション1

パチスロ入力アプリ共通の半永久ルール。詳細は `.claude/commands/ui-regulation.md`。

要約:
- `<select>` 一切禁止（横画面用は §9 の LandscapeSelectOverlay を使う）
- 全選択肢はスクエアボタングリッド
- `py-3` 以上、`active:scale-95`、`boxShadow` 選択状態
- トグルキャンセル: 再タップで選択解除

### 15.5 ファイル作成

- npx 系インタラクティブ CLI は使わない。Write/Edit/Bash で直接作成する。

---

## 参照ドキュメント一覧

| ファイル | 内容 |
|---------|------|
| `references/design.md` | UIデザインシステム完全仕様（色・レイアウト・コンポーネント） |
| `docs/ARCHITECTURAL_BLUEPRINT.md` | RLS・Webhook・同期・セキュリティの実装設計書 |
| `docs/tg-medal-calculation.md` | 差枚数計算ロジック仕様書 |
| `docs/tg-mode-estimation.md` | モード推定アルゴリズム仕様書 |
| `docs/photo-upload-setup.md` | 写真アップロードのセットアップとアトミック契約 |
| `docs/discord/IMPLEMENTATION_ORDER.md` | Discord 連携の作業順序 |
| `docs/discord/TGR_DISCORD_INTEGRATION_SPEC.md` | Discord 連携の仕様書 |
| `docs/discord/STRIPE_PRODUCTION_AND_E2E_TEST.md` | Stripe 本番化 + E2E 手順 |
| `.claude/commands/ui-regulation.md` | UIレギュレーション1（select禁止・ボタングリッド必須） |
| `.claude/skills/stripe-discord-pro-upgrade/SKILL.md` | **Pro化 + Discord 連携の固定パターン**（必読） |
| `.claude/skills/pachislot-analytics-layer/SKILL.md` | **統計分析レイヤーの汎用骨格**（必読） |
| `.claude/skills/web-share-image-save/SKILL.md` | Web Share API による画像保存パターン |
