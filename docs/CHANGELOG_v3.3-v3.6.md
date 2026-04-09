# VALVRAVE-RESONANCE v3.3 → v3.6 変更レポート

**対象期間**: 2026-04-06 〜 2026-04-09
**コミット数**: 19
**変更ファイル**: 41（ソース12 + 画像アセット29）
**差分**: +1,333行 / -496行

---

## 1. アーキテクチャ概要

```
src/
├── app/
│   ├── api/sessions/route.ts          ★ SessionMeta拡張（totalGames/balance/settingHint）
│   ├── dashboard/
│   │   ├── DashboardClient.tsx        ★ セッション作成フォーム刷新・一覧バッジUI
│   │   ├── TotalAnalysis.tsx          ★ 全面テーブルグリッド化
│   │   └── page.tsx                      バージョン表記（v3.6）
│   └── play/[id]/
│       └── PlayClientPage.tsx         ★ ヘッダーバッジ化・FAB拡大・X共有ボタン
├── components/tg/
│   ├── ATBlockEditDashboard.tsx       ★ 終了画面/トロフィー画像ピッカー・エンディングカードアコーディオン
│   ├── ATBlockList.tsx                ★ ヘッダー統一グリッド・対決表示軽量化・概算獲得枚数
│   ├── NormalBlockEditDashboard.tsx   ★ ヤメ機能・CZオーバーレイ2段階演出
│   ├── NormalBlockList.tsx            ★ ATサマリーインライン・ヤメバナー・コンパクト化
│   └── SummaryTab.tsx                 ★ 全面テーブルグリッド化・inferSetting共有化
├── lib/tg/
│   ├── captureImage.ts               ★ Web Share API（captureAndShare）追加
│   └── localStore.ts                 ★ SessionMeta拡張・inferSetting連携
└── public/images/
    ├── after_at/          (8枚) AT終了画面示唆用
    ├── after_hit_2.png    CZオーバーレイ2段階目
    ├── ending_card/       (14枚) エンディングカード用
    └── trophy/            (6枚) トロフィー用
```

---

## 2. 機能変更一覧

### v3.3 → v3.3.8: コア機能追加フェーズ

| Ver | 変更内容 | 主要ファイル |
|-----|---------|------------|
| v3.3 | 打ち出し状態設定・収支入力・ヤメ機能の初回実装 | PlayClientPage, types, store, 新規2コンポーネント |
| v3.3.1 | ヤメバナー表示位置をブロック直上→直下に修正 | NormalBlockList |
| v3.3.2 | 通常時履歴にATサマリーバーをインライン表示 | NormalBlockList, PlayClientPage |
| v3.3.3 | CZ当選オーバーレイに3秒後サプライズ画像切替 | NormalBlockEditDashboard |
| v3.3.4 | AT終了画面示唆を画像付きモーダルピッカーに変更 | ATBlockEditDashboard |
| v3.3.5 | エンディングカードの各カウンター行に画像表示 | ATBlockEditDashboard |
| v3.3.6 | エンディングカードをアコーディオン化・トロフィー画像付きピッカー | ATBlockEditDashboard |
| v3.3.7 | エンディングカードボタンに扇状カードデザイン | ATBlockEditDashboard |
| v3.3.8 | ATサマリーバー: ライトモード化・セットバック・概算合計獲得枚数 | NormalBlockList |

### v3.4 → v3.4.2: UX改善フェーズ

| Ver | 変更内容 | 主要ファイル |
|-----|---------|------------|
| v3.4 | FABボタン15%拡大（周期追加さらに+15%）・CZオーバーレイ4.5秒・セッション作成フォーム刷新（日付/ホール/台番号/自動生成）・二重タップ防止 | PlayClientPage, DashboardClient, NormalBlockEditDashboard |
| v3.4.1 | 自動生成ボタン→直接作成・[n]番台表記・セッション一覧に総G数/収支表示 | DashboardClient, API, localStore |
| v3.4.2 | 集計タブ注意書き追加・CZ内容テーブル整形（罫線/当選率/成功率） | SummaryTab |

### v3.5 → v3.5.6: UI統一フェーズ

| Ver | 変更内容 | 主要ファイル |
|-----|---------|------------|
| v3.5 | 集計タブ全セクション統一テーブルグリッド化・ダッシュボードバッジUI・推定設定表示 | SummaryTab, DashboardClient, API |
| v3.5.1 | トータル集計テーブルグリッド化・セッション一覧バッジ固定位置(2×2グリッド) | TotalAnalysis, DashboardClient |
| v3.5.2 | 通常時/AT記録の縦幅コンパクト化（min-h 44→34/32px）・行罫線強化・対決1行基本表示 | NormalBlockList, ATBlockList |
| v3.5.3 | 対決○×を白背景テキスト色化（1行時13px大文字）・ATヘッダー均等配置・枚単位追加 | ATBlockList |
| v3.5.4 | ATサマリーバーのテキスト濃色化・セット数/獲得枚数強調表示・終了画面hint表示 | NormalBlockList |
| v3.5.5 | BITES/直乗せを合計獲得と同じ枚数セルに統一・AT記録ヘッダー同期 | NormalBlockList, ATBlockList |
| v3.5.6 | ラベル枚数密着・白抜き文字・AT記録に概算合計獲得枚数（+150/250枚）反映 | ATBlockList, NormalBlockList |

### v3.6: 仕上げフェーズ

| Ver | 変更内容 | 主要ファイル |
|-----|---------|------------|
| v3.6 | セッションヘッダーにサマリーバッジ表示・バージョン表記トップページのみ・X共有ボタン（Web Share API）追加 | PlayClientPage, captureImage, SummaryTab |

---

## 3. 新規追加コンポーネント・関数

| 名称 | ファイル | 役割 |
|------|---------|------|
| `UchidashiEditDashboard` | `src/components/tg/UchidashiEditDashboard.tsx` | 打ち出し状態設定の入力フォーム（新規ファイル） |
| `ShushiEditDashboard` | `src/components/tg/ShushiEditDashboard.tsx` | 収支入力フォーム（新規ファイル） |
| `UchidashiDisplayCard` | PlayClientPage内 | 通常時タブ上部の打ち出し状態表示カード |
| `ShushiDisplayCard` | PlayClientPage内 | 通常時タブ上部の収支表示カード |
| `EndingImagePicker` | ATBlockEditDashboard内 | AT終了画面示唆の画像付きモーダルピッカー |
| `TrophyImagePicker` | ATBlockEditDashboard内 | トロフィーの画像付きモーダルピッカー |
| `EndingCardAccordion` | ATBlockEditDashboard内 | エンディングカードのアコーディオン（扇状カードデザイン付き） |
| `ATSummaryCoinCell` | NormalBlockList内 | 通常時ATサマリーの枚数セル（ラベル+枚数密着） |
| `ATHeaderCoinCell` | ATBlockList内 | AT記録ヘッダーの枚数セル |
| `THead` / `TRow` | SummaryTab内 | 統一テーブルグリッドの列ヘッダー/データ行 |
| `captureAndShare()` | `src/lib/tg/captureImage.ts` | Web Share APIによる画像共有 |
| `inferSetting()` | SummaryTab（export） | 設定推定ロジック（API/localStorage/ダッシュボードから共有利用） |

---

## 4. 型定義の変更 (`src/types/index.ts`)

```typescript
// v3.3で追加
interface UchidashiState {
  currentGames: number | null;
  totalGames: number | null;
  samai: number | null;
  reminiscence: number | null;
  rize: number | null;
  episodeBonus: number | null;
}

interface ShushiData {
  coinRate: number;        // default 46
  handCoins: number | null;
  cashInvestK: number | null;
  exchangeCoins: number | null;
}

// PlaySession に追加
uchidashi: UchidashiState | null;
shushi: ShushiData | null;

// TGNormalBlock に追加
yame?: boolean;   // ヤメフラグ
```

---

## 5. Zustand Store の変更 (`src/store/useSessionStore.ts`)

```typescript
// v3.3で追加
updateUchidashi: (uchidashi: UchidashiState | null) => void;
updateShushi: (shushi: ShushiData | null) => void;
```

---

## 6. DB スキーマの変更

```sql
-- supabase/migrations/006_add_uchidashi_shushi.sql
ALTER TABLE public.play_sessions
  ADD COLUMN IF NOT EXISTS uchidashi JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS shushi JSONB DEFAULT NULL;
```

**影響範囲**: `session-db.ts` (rowToSession/saveSessionToDb), `api/session/[id]/save/route.ts`, `api/sessions/route.ts`

---

## 7. SessionMeta の拡張 (`src/lib/tg/localStore.ts`)

```typescript
interface SessionMeta {
  // 既存
  id, machineName, createdAt, updatedAt, blockCount, atCount
  // v3.4.1で追加
  totalGames: number;
  balance: number | null;
  // v3.5で追加
  settingHint: string;
}
```

API (`/api/sessions`) と localStorage の両方で計算・返却。

---

## 8. UIデザインルール（v3.5で確立）

### 集計テーブルグリッド基本法則

1. **列ヘッダー**: カテゴリ同系色の薄い背景 + 太罫線
2. **縦罫線**: 全列間に `1px solid #e5e7eb`
3. **横罫線**: 全行間に罫線
4. **セル中央揃え**: `alignItems: center`
5. **項目名左寄せ / 数値右寄せ**
6. **固定列幅**: 数値が確実に収まる幅
7. **`tabular-nums`**: 数値列で桁揃え
8. **`THead` + `TRow`** コンポーネントで統一実装

### ATサマリー表示ルール

- セット数: `Nset` 大きく1行表示（14-16px font-black）
- 枚数項目: ラベル+枚数密着表示（`mr-0.5`）、`N,NNN枚` 形式
- 合計獲得: 概算（+150枚 / エピソードボーナス経由時+250枚）
- 終了画面: hint（設定示唆内容）を表示、キャラ名ではない
- AT記録タブと通常時ATサマリーバーで同一ルール適用

### ダッシュボード バッジルール

- 2×2固定グリッド（`grid-cols-2`）
- 総G数（青）/ AT初当たり（緑）/ 収支（赤/緑）/ 設定（黄）
- データなしでも `—` 表示で位置維持

---

## 9. 画像アセット一覧

| ディレクトリ | 枚数 | 用途 | フォーマット |
|-------------|------|------|-------------|
| `public/images/after_at/` | 8 | AT終了画面示唆ピッカー | PNG (400-550KB) |
| `public/images/ending_card/` | 14 | エンディングカードカウンター | PNG (120-770KB) |
| `public/images/trophy/` | 6 | トロフィーピッカー | WebP (5-31KB) |
| `public/images/after_hit_2.png` | 1 | CZオーバーレイ2段階目 | PNG (839KB) |

---

## 10. 依存関係の変更

なし（既存の `html-to-image` の `toBlob` エクスポートを追加利用のみ）。

---

## 11. 未実装・今後の課題

- Supabase マイグレーション `006_add_uchidashi_shushi.sql` の本番実行（未実行の場合、uchidashi/shushiのDB保存が動作しない。localStorageには保存される）
- X共有: Web Share API非対応のデスクトップブラウザでは画像保存にフォールバック
- 打ち出し状態/収支データはセッション単位でJSONBカラムに格納（正規化されていない）
