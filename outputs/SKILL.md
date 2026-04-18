# TGR Resonance — Next.js + Supabase フルスタックスキル

**目的**: このスキルファイルだけ読めば、予備知識のない Claude Code が同等のプロジェクトを立ち上げ・実装できる。

---

## 読み方ガイド

| セクション | 内容 | いつ読むか |
|-----------|------|-----------|
| 1. プロジェクト概要 | 目的・スタック・ディレクトリ構造 | 最初に必ず |
| 2. 技術スタック詳細 | 依存パッケージ・バージョン・役割 | 環境構築時 |
| 3. ディレクトリ構造 | ファイル一覧と責務 | コード追加・修正時 |
| 4. 型定義 | TypeScript 型の全体像 | データ構造を理解する時 |
| 5. データフロー | Zustand → localStorage → Supabase の同期設計 | 状態管理・保存処理を実装する時 |
| 6. 認証・RLS・セキュリティ | Supabase Auth + RLS + Webhook の設計 | API・DB・課金を触る時 |
| 7. ゲームドメインエンジン | 差枚数計算・モード推定の仕様 | 計算ロジックを修正する時 |
| 8. UIデザインシステム | → `references/design.md` に全仕様 | UI実装・改修時 |
| 9. 運用ルール | バージョン管理・デプロイフロー | コミット・リリース時 |

---

## 1. プロジェクト概要

### 1.1 何を作っているか

**TGR Resonance** — パチスロ機種「L東京喰種 RESONANCE」の稼働データを記録・分析するモバイルファーストWebアプリ。

- 1回の稼働 = 1セッション
- 通常時の周期データ（ゲーム数・ゾーン・モード・示唆演出）を記録
- AT（アドバンスタイム）中のSET対決・BITES・有馬ジャッジメント等を記録
- 差枚数を自動計算し、設定推測の根拠を可視化
- ベイズ推定でモード（内部状態）を確率表示

### 1.2 ユーザー

パチスロを打つ人（ホール現場でスマホ片手に入力する）。操作は全てタップ。キーボード入力は最小限。

### 1.3 課金モデル

- 無料版: セッション3件まで
- Pro版: 無制限 + トータル数値分析 + Discord（買い切り ¥993、Stripe決済）
- 現在パイロット版（Stripe/Discord は alert で代替）

---

## 2. 技術スタック詳細

### 2.1 コアスタック

| 技術 | バージョン | 役割 |
|------|-----------|------|
| Next.js | 15.x | App Router (RSC + Client Components) |
| React | 19.x | UI |
| TypeScript | 5.6+ | 型安全 |
| Tailwind CSS | 3.4+ | スタイリング（ユーティリティファースト） |
| Zustand | 5.x | クライアント状態管理 |
| Supabase | 2.45+ | PostgreSQL + Auth + RLS + Realtime |
| @supabase/ssr | 0.9+ | Next.js SSR/Cookie 統合 |
| Stripe | 22.x | 決済（Checkout + Webhook） |

### 2.2 補助ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| html-to-image / html2canvas | 集計画面のスクリーンショット出力 |
| lucide-react | アイコン |
| clsx + tailwind-merge | 条件付きクラス結合 |

### 2.3 インフラ

| サービス | 用途 |
|---------|------|
| Vercel | ホスティング・CI/CD（GitHub連携自動デプロイ） |
| Supabase Cloud | DB・Auth・Storage |
| Stripe | 決済処理 |

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
│   │   └── PlayClientPage.tsx        #   タブ3種（通常時/AT記録/集計）+ FAB4種
│   │
│   ├── pro/page.tsx                  # Pro プラン案内 / VIPルーム
│   ├── tutorial/page.tsx             # 使い方ガイド（画像付き7セクション）
│   ├── terms/page.tsx                # 利用規約
│   ├── privacy/page.tsx              # プライバシーポリシー
│   ├── admin/                        # 管理者画面（is_admin=true のみ）
│   │
│   ├── api/                          # API Routes
│   │   ├── sessions/route.ts         #   GET: セッション一覧
│   │   ├── sessions/count/route.ts   #   GET: セッション件数（無料版制限判定）
│   │   ├── session/create/route.ts   #   POST: セッション新規作成
│   │   ├── session/[id]/save/route.ts#   PUT: セッションデータ保存
│   │   ├── session/[id]/load/route.ts#   GET: セッション読み込み
│   │   ├── session/[id]/route.ts     #   DELETE: セッション論理削除
│   │   ├── checkout/route.ts         #   POST: Stripe Checkout セッション生成
│   │   ├── webhook/stripe/route.ts   #   POST: Stripe Webhook (is_pro 更新)
│   │   └── admin/                    #   管理者API (Service Role Key)
│   │
│   └── auth/callback/route.ts        # Supabase Auth コールバック
│
├── components/
│   ├── auth/
│   │   ├── AuthContext.tsx            # ユーザー・プロフィール Context Provider
│   │   └── AuthGuard.tsx             # 認証ガード（未ログイン→リダイレクト）
│   ├── tg/                           # 東京喰種ドメインコンポーネント
│   │   ├── NormalBlockList.tsx        #   通常時一覧（浮遊カード・差枚数スタンプ）
│   │   ├── NormalBlockEditDashboard.tsx#  通常時入力ダッシュボード
│   │   ├── ATBlockList.tsx            #   AT記録一覧
│   │   ├── ATBlockEditDashboard.tsx   #   AT記録入力ダッシュボード
│   │   ├── SummaryTab.tsx             #   集計タブ（全自動集計・設定示唆色分け）
│   │   ├── UchidashiEditDashboard.tsx #   打ち出し設定入力
│   │   └── ShushiEditDashboard.tsx    #   収支入力
│   ├── ui/
│   │   └── LongPressHint.tsx          # 1.5秒長押しヘルプモーダル
│   └── layout/
│       └── Footer.tsx                 # 利用規約・プライバシーリンク
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                  # ブラウザ用 Supabase クライアント（シングルトン）
│   │   ├── server.ts                  # サーバー用 Supabase クライアント + getCurrentUser/Profile
│   │   ├── session-db.ts             # セッション CRUD ヘルパー
│   │   └── profile-sync.ts           # プロフィール自動同期
│   ├── stripe/
│   │   └── server.ts                  # Stripe SDK 遅延初期化（getStripe()）
│   ├── engine/
│   │   ├── modeEstimation.ts          # ベイズモード推定エンジン v2.1
│   │   ├── modeTables.ts             # 尤度テーブル・制約テーブル
│   │   └── constants.ts              # ゲーム定数（ゾーン・モード・イベント等）
│   ├── tg/
│   │   ├── medalCalc.ts              # 差枚数計算エンジン
│   │   ├── analytics.ts              # セッション内集計ロジック
│   │   ├── analytics-admin.ts        # 管理者向け全体集計
│   │   ├── cellColors.ts             # セル背景色・モード略称
│   │   ├── suggestionColors.ts       # 設定示唆の行色
│   │   ├── settingDiff.ts            # 設定差分析
│   │   ├── captureImage.ts           # 画面キャプチャ（html-to-image）
│   │   └── localStore.ts             # localStorage 操作
│   ├── auth/
│   │   └── access.ts                  # 権限チェックユーティリティ
│   └── config/
│       └── links.ts                   # 外部リンク定数（X/Discord）
│
├── store/
│   └── useSessionStore.ts             # Zustand Store: PlaySession 全操作
│
├── types/
│   └── index.ts                       # 全型定義（TGNormalBlock, TGATEntry 等）
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
  │     ├── jisshuG: number            実G数
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
  │     └── memo?: string              フリーメモ
  │
  ├── atEntries: TGATEntry[]           ← AT初当たり配列
  │     └── rows: TGATRow[]            SET行 or 有馬行の配列
  │           ├── TGATSet (rowType:"set")
  │           │     ├── character       敵キャラ
  │           │     ├── bitesType/Coins BITES種別・獲得枚数
  │           │     ├── directAdds[]    直乗せ
  │           │     ├── battles[]       対決（契機+成績）
  │           │     ├── endingCard?     エンディングカード
  │           │     ├── edKakuganCount? EDボナ赫眼カウント
  │           │     └── coinsHint?      枚数表示示唆
  │           └── TGArimaJudgment (rowType:"arima")
  │                 ├── result          成功/失敗
  │                 ├── role            小役
  │                 └── ccgCoins        CCG死神枚数
  │
  ├── uchidashi?: UchidashiState       ← 打ち出し設定
  ├── shushi?: ShushiData              ← 収支入力
  └── userSettingGuess?: string        ← ユーザー推測設定
```

### 4.2 DB スキーマ

Supabase に2テーブル:

| テーブル | 主要カラム | RLS |
|---------|-----------|-----|
| `profiles` | id(UUID), email, display_name, avatar_url, is_pro, is_admin | auth.uid() = id |
| `play_sessions` | id(UUID), user_id, machine_name, normal_blocks(JSONB), at_entries(JSONB), is_deleted | auth.uid() = user_id |

`normal_blocks` と `at_entries` は JSONB 型で、TypeScript の型定義をそのまま JSON シリアライズして格納。

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
- **論理削除**（`is_deleted` フラグ）、物理削除は管理者APIのみ

---

## 6. 認証・RLS・セキュリティ

### 6.1 認証フロー

Supabase Auth（Google OAuth）→ Auth コールバック → profiles テーブルに自動同期

### 6.2 RLS ポリシー

- `profiles`: SELECT/INSERT/UPDATE で `auth.uid() = id`。DELETE ポリシーなし（削除不可）
- `play_sessions`: SELECT/INSERT/UPDATE で `auth.uid() = user_id`。ソフトデリート方式
- `FOR ALL` は使わず、操作ごとに個別定義

### 6.3 管理者アクセス

アプリケーション層チェック方式（`is_admin` をDB直読み）。管理者APIのみ Service Role Key で RLS バイパス。

### 6.4 Stripe Webhook

```
Stripe → POST /api/webhook/stripe
  → 署名検証（constructEvent）
  → Service Role Key で profiles.is_pro = true に UPDATE
  → プロフィール未作成時は INSERT フォールバック
```

`runtime = "nodejs"`, `dynamic = "force-dynamic"` 必須。

### 6.5 環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Webhook/Admin のみ
STRIPE_SECRET_KEY=sk_live_xxx             # サーバーのみ
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_STRIPE_PRICE_ID=price_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

**秘密鍵には `NEXT_PUBLIC_` を付けない。**

詳細: `docs/ARCHITECTURAL_BLUEPRINT.md`

---

## 7. ゲームドメインエンジン

### 7.1 差枚数計算（src/lib/tg/medalCalc.ts）

```
Loss = totalNormalG × (50/31)
Gain = Σ(ATエントリごと: Base + SET数×40 + uenose) + czCount×32

Base: 通常AT=150 / エピボ=250 / ロンフリ=2000
uenose: BITES合計 + 直乗せ合計 + CCG死神合計
CZ: 8G × 4.0枚/G = 32枚/回
```

- `computeMedalStamps()`: ブロックごとの積み上げ差枚数
- `computeFinalResult()`: セッション最終差枚数

詳細: `docs/tg-medal-calculation.md`

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

全仕様は **`references/design.md`** に集約。主要ポイントのみ記載:

- **浮遊カードデザイン**: ウォームベージュ `#e8e2d8` 背面 + 白カード黒枠
- **セグメントコントロール**: iOS風角丸タブ（ダッシュボード: 黒、Play: 赤）
- **select禁止**: 全選択肢は `grid` + `py-3以上` のスクエアボタン
- **タップフィードバック**: `active:scale-95` 必須
- **選択状態**: `boxShadow: "0 0 0 2px #1f2937"`
- **長押しヘルプ**: 1.5秒長押し → モーダル（`user-select: none`）
- **差枚数スタンプ**: プラス=緑 / マイナス=赤 バッジ
- **一時保存**: 緑フラッシュ `#16a34a` + `✓ 保存しました` → 1.2秒復帰

---

## 9. 運用ルール

### 9.1 バージョン管理

- **1コミット = 1バージョンアップ**（例外なし）
- 表示箇所: `src/app/dashboard/page.tsx` のヘッダー内 `<span>`
- 現在: v4.67

### 9.2 デプロイフロー

```
git add <files>
git commit --amend --reset-author
git push -f origin main
vercel ls で確認
```

### 9.3 コミットルール

- 機能追加: `feat: vX.XX - 日本語説明`
- バグ修正: `fix: vX.XX - 日本語説明`
- バージョン番号を必ずコミットメッセージに含める

### 9.4 UIレギュレーション1

パチスロ入力アプリ共通の半永久ルール。詳細は `.claude/commands/ui-regulation.md` を参照。

要約:
- `<select>` 一切禁止
- 全選択肢はスクエアボタングリッド
- `py-3` 以上、`active:scale-95`、`boxShadow` 選択状態

---

## 参照ドキュメント一覧

| ファイル | 内容 |
|---------|------|
| `references/design.md` | UIデザインシステム完全仕様（色・レイアウト・コンポーネント） |
| `docs/ARCHITECTURAL_BLUEPRINT.md` | RLS・Webhook・同期・セキュリティの実装設計書 |
| `docs/tg-medal-calculation.md` | 差枚数計算ロジック仕様書 |
| `docs/tg-mode-estimation.md` | モード推定アルゴリズム仕様書 v2.0 |
| `.claude/commands/ui-regulation.md` | UIレギュレーション1（select禁止・ボタングリッド必須） |
