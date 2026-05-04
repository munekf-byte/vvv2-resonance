# パチスロアプリ 統計分析レイヤー (抽選格差検証用イベントログ収集) スキル

**目的**: パチスロ機種の入力アプリにおいて、「内部抽選の状態差・テーブル偏り検証」のための **1G 毎・1イベント毎のログ収集レイヤー** を、UX を毀損せず・プライバシーを担保し・横展開可能な形で実装する固定パターンを定義する。

**適用範囲**: Next.js 15 (App Router) + Supabase + Vercel + パチスロ機種入力 UI を持つアプリ全般。

**起点**: TGR Resonance プロジェクトで OPUS2 (分析設計) と Claude Code (実装) の協議により確定 (2026-05-02)。

---

## 0. このスキルを読む順序

| セクション | いつ読むか |
|-----------|-----------|
| 1. 設計原則 (絶対遵守) | 最初に必ず |
| 2. アーキテクチャ全体像 | 全体把握 |
| 3. 確定スキーマパターン | テーブル設計時 |
| 4. 共通基盤ファイル構成 | 実装開始時 |
| 5. ハンドラ差し込み手順 | UI コンポーネント改修時 |
| 6. プライバシー・規約対応 | リリース前 |
| 7. 横展開チェックリスト | 監視対象追加時 |
| 8. アンチパターン | 全フェーズで参照 |

---

## 1. 設計原則 (絶対遵守)

### 1.1 UX 不変原則

- **入力 UI のレイアウト・ボタン位置・反応速度は一切変更しない**
- 既存ハンドラに `logEvent()` を追加するだけ。視覚的にユーザーが気づく変化は規約改定バナー (1 週間) のみ
- 入力フィールドの追加 = UX 変化 = 司令官 (PO) のジャッジ必須

### 1.2 fire-and-forget 原則

- ロガー呼び出しは **必ず非同期 + keepalive、戻り値を待たない**
- ロガーの失敗は **黙殺**。ユーザー入力フローに一切影響させない
- `await` 厳禁。例外は catch して捨てる

### 1.3 プライバシー構造設計

- `user_id` は **常にハッシュ化** (`SHA-256(userId + ":" + pepper)`)
- pepper は Vercel 環境変数 (`ANALYTICS_HASH_PEPPER`)、ローテーション運用なし
- 個人特定情報 (店舗名, 台番号, メモ) は **絶対に保存しない**。`hall_id_hash` / `machine_id_hash` 等のハッシュ化値のみ
- RLS は **管理者 SELECT のみ**、INSERT/UPDATE/DELETE は **Service Role 経由限定** (ポリシー未定義 = anon/authenticated 不可)

### 1.4 オフライン耐性

- パチスロ実戦環境 = 店舗 = 電波弱
- localStorage キュー必須、オンライン復帰時にバルク送信 (1 リクエスト 50 件まで)
- API エラー時はキューから消さない、最大 30 日 TTL で自動破棄

### 1.5 データ収集と公開判断の分離

- データ収集インフラと、結果の公開 (Discord 発信等) の意思決定は **完全分離**
- インフラ整備 → サンプル蓄積 → 任意タイミングで分析実行 → 公開判断は別途
- 時系列計画は立てない (n のターゲットを設定しない)
- リーガルチェックは公開判断時に必要なら実施

### 1.6 横展開原則

- ロガー基盤・オフラインキュー・API helper・ハッシュロジック・規約条項・バナーは **1 セットで使い回す**
- 監視対象が増えても変わるのは **テーブル + ハンドラ差し込みのみ**
- 命名規則は固定: `analytics_<event_type>_events`

---

## 2. アーキテクチャ全体像

```
[ユーザー入力 UI]
  ├─ ボタン押下 (PUSH/-1/当 等)
  ├─ 既存の状態更新 (setState)
  └─ logAnalyticsEvent("cz", payload) ← 新規追加 (fire-and-forget)
        ↓
[src/lib/analytics/event-logger.ts]
  ├─ オンライン: fetch keepalive → API ルート
  └─ オフライン or 失敗: localStorage キューに退避
        ↓
[src/lib/analytics/offline-queue.ts]
  ├─ オンライン復帰検知 (window.online イベント)
  ├─ 50 件単位でバッチ送信
  └─ 30 日経過分は自動削除
        ↓
[src/app/api/analytics/<event_type>/route.ts]
  ├─ runtime = "nodejs", dynamic = "force-dynamic"
  ├─ user_id ハッシュ化 (Service Role 経由で取得した auth.getUser() を使用)
  ├─ payload バリデーション
  └─ Supabase Service Role で INSERT
        ↓
[Supabase: analytics_<event_type>_events]
  ├─ RLS: 管理者 SELECT のみ
  └─ INSERT/UPDATE/DELETE は Service Role のみ
        ↓
[管理者運用]
  └─ Supabase SQL Editor で任意タイミング分析
```

---

## 3. 確定スキーマパターン

### 3.1 共通カラム (全イベントテーブル必須)

```sql
-- ユーザー識別 (ハッシュ化)
user_id_hash          TEXT NOT NULL,

-- セッション識別 (Phase 0 段階では NULL 許容、FK なしで運用開始)
user_session_id       UUID,

-- イベント単位の親エンティティ (CZ 1 回 / AT 1 回 等)
<entity>_instance_id  UUID NOT NULL,    -- 例: cz_instance_id, at_instance_id
event_seq_in_<entity> INTEGER NOT NULL, -- 親エンティティ内のイベント連番

-- 状態コンテキスト (環境差・状態差検証用)
hall_id_hash          TEXT,
machine_id_hash       TEXT,
is_morning_first      BOOLEAN,
estimated_setting     INTEGER,

-- 訂正・論理削除メタ
is_correction         BOOLEAN NOT NULL DEFAULT FALSE,
is_orphaned           BOOLEAN NOT NULL DEFAULT FALSE,

-- タイムスタンプ
recorded_at           TIMESTAMPTZ NOT NULL,            -- クライアント発生時刻
server_recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() -- サーバー受信時刻
```

`recorded_at` は **必ず NOT NULL**。クライアント時刻欠落は時系列分析の根幹を崩す。

`is_orphaned` は親エンティティ削除時に立てる。**物理削除はしない** (削除パターンも統計シグナル)。

### 3.2 イベント本体カラム

監視対象固有のカラムは末尾に追加。enum 系は CHECK 制約で固定。

例 (CZ 抽選):
```sql
cz_type   TEXT NOT NULL CHECK (cz_type IN ('reminiscence', 'oogui_rize')),
role      TEXT NOT NULL CHECK (role IN ('bell', 'replay', 'weak_rare', 'strong_rare', 'hazure')),
triggered BOOLEAN NOT NULL,
cz_outcome TEXT CHECK (cz_outcome IN ('success', 'fail', 'in_progress')),
is_final_game BOOLEAN
```

### 3.3 インデックス必須 5 本

```sql
CREATE INDEX idx_<table>_instance      ON public.<table>(<entity>_instance_id);
CREATE INDEX idx_<table>_<event_type>  ON public.<table>(<event_type_column>);
CREATE INDEX idx_<table>_user_hash     ON public.<table>(user_id_hash);
CREATE INDEX idx_<table>_recorded_at   ON public.<table>(recorded_at);
CREATE INDEX idx_<table>_server_recorded ON public.<table>(server_recorded_at);
```

### 3.4 RLS 固定パターン

```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner read only"
  ON public.<table>
  FOR SELECT
  USING (auth.jwt() ->> 'email' = '<管理者メールアドレス>');

-- INSERT/UPDATE/DELETE はポリシー未定義 = Service Role 経由のみ
```

---

## 4. 共通基盤ファイル構成

### 4.1 ファイル一覧

| ファイル | 役割 | 監視対象が増えても変わるか |
|---------|------|---------------------------|
| `src/lib/analytics/event-logger.ts` | 汎用 `logAnalyticsEvent(eventType, payload)` | 不変 |
| `src/lib/analytics/offline-queue.ts` | localStorage キュー (50 件バッチ / 30 日 TTL) | 不変 |
| `src/lib/analytics/hash.ts` | `hashUserId(userId)` SHA-256 + pepper (server-only) | 不変 |
| `src/app/api/analytics/<event_type>/route.ts` | Service Role INSERT (event_type ごとに 1 ファイル) | 監視対象追加時に新規 |
| `src/components/TermsUpdateBanner.tsx` | 1 週間表示バナー | 不変 |
| `src/app/privacy/page.tsx` | 統計収集条項 (収集内容を列挙形式で記載) | 監視対象追加時に列挙更新 |

### 4.2 ハッシュ関数 (確定実装)

```ts
// src/lib/analytics/hash.ts
import { createHash } from "node:crypto";

export function hashUserId(userId: string): string {
  const pepper = process.env.ANALYTICS_HASH_PEPPER;
  if (!pepper) throw new Error("ANALYTICS_HASH_PEPPER not configured");
  return createHash("sha256").update(`${userId}:${pepper}`).digest("hex");
}
```

セパレータ `:` は必須。`userId + pepper` の境界曖昧化 (`"abc"+"def"` と `"ab"+"cdef"` の衝突) を防ぐ。

### 4.3 API ルート骨格

```ts
// src/app/api/analytics/<event_type>/route.ts
export const runtime = "nodejs";          // node:crypto を使うため Edge 不可
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { hashUserId } from "@/lib/analytics/hash";

export async function POST(req: Request) {
  // 認証 (auth.getUser() で user_id 取得 → ハッシュ化)
  // payload バリデーション (event_type 固有のスキーマ)
  // バッチ送信対応 (1 リクエスト最大 50 件)
  // Service Role で INSERT
  // 失敗時はクライアント側でキュー保持される前提で 500 を返す
}
```

### 4.4 ロガー (fire-and-forget + keepalive)

```ts
// src/lib/analytics/event-logger.ts
export function logAnalyticsEvent(eventType: string, payload: unknown): void {
  try {
    const body = JSON.stringify({ events: [payload] });
    fetch(`/api/analytics/${eventType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true, // タブ閉じても送信継続
    }).catch(() => enqueueOffline(eventType, payload));
  } catch {
    enqueueOffline(eventType, payload);
  }
}
```

`await` 厳禁。例外は黙殺。

---

## 5. ハンドラ差し込み手順

### 5.1 親エンティティ ID の発番タイミング

既存コードで「保存時に `crypto.randomUUID()` を発番」している場合、**編集開始時に先行発番** に変更する必要がある。理由: イベント発生はボタン押下時 = 保存前のため、その時点で `<entity>_instance_id` が確定していなければならない。

変更前:
```ts
function buildBlock() {
  return { id: block?.id ?? crypto.randomUUID(), ...form };
}
```

変更後:
```ts
const [instanceId] = useState(() => block?.id ?? crypto.randomUUID());
function buildBlock() {
  return { id: instanceId, ...form };
}
```

### 5.2 ボタンハンドラへの差し込み (例)

```ts
function handlePushButton() {
  // 既存ロジック (変えない)
  setForm((prev) => ({ ...prev, czCounter: { ...prev.czCounter, bell: prev.czCounter.bell + 1 } }));

  // ↓ 1 行追加するだけ
  logAnalyticsEvent("cz", {
    cz_instance_id: instanceId,
    event_seq_in_cz: nextSeq(),
    role: "bell",
    triggered: false,
    recorded_at: new Date().toISOString(),
    // ...固有フィールド
  });
}
```

### 5.3 訂正イベント

「-1」「取り消し」系ボタンも `is_correction: true` で記録する。**訂正パターン自体が統計シグナル**。削除しないこと。

### 5.4 親エンティティ完了時の `_outcome` 更新

CZ 失敗 / AT 終了 等、親エンティティ確定時に該当 `<entity>_instance_id` の全行を `UPDATE SET <entity>_outcome = 'success'|'fail'`。実行タイミングは「ユーザーが結果を確定保存した時点」(進行中の途中状態は `'in_progress'` のまま)。

---

## 6. プライバシー・規約対応

### 6.1 規約改定通知 (デフォルトパターン)

- **A 案 + バナーのハイブリッド** で固定 (司令官確定パターン)
- 規約ページ更新 (最終更新日明記) + 1 週間サイト内バナー (× で閉じれる) + ログイン時トースト
- 明示同意フラグ DB 保存は **不要**。継続利用 = 同意

### 6.2 規約条項テンプレート (privacy ページ追記用)

```markdown
## 統計分析データの収集

サービス改善および機種特性の検証を目的として、以下の入力データを匿名化した形で収集します。

- 収集する内容:
  - 入力されたゲーム内イベント (例: <監視対象を列挙>)
  - 環境コンテキスト (店舗・機種を識別不可能なハッシュ値、設定推定値、朝一フラグ)
  - イベント発生時刻
- ユーザーID は不可逆ハッシュ化 (SHA-256 + pepper) され、個人を特定できる情報は一切保存されません
- 個別の入力履歴・店舗名・台番号・メモ等の特定可能情報は分析データに含まれません
- 集計結果は統計的事実としてのみ扱い、個別ユーザーの行動分析には使用しません
```

監視対象が増えたら **「収集する内容」セクションのみ追記**。それ以外の文言は変えない。

### 6.3 バナー仕様

- 表示位置: メイン画面上部 (固定)
- 表示期間: 1 週間 (closed_at + 7 日 or initial_show + 7 日)
- 閉じる: × ボタンで `localStorage.setItem("terms_banner_closed_at", now)`
- 文言: 「YYYY年M月D日 利用規約改定。統計分析への協力に関する条項を追加しました [詳細を見る]」

---

## 7. 横展開チェックリスト

新しい監視対象を追加する際:

- [ ] イベントが UX に変化を与えないか確認 (新規入力 UI が必要なら司令官ジャッジ)
- [ ] マイグレーション作成: `analytics_<event_type>_events` テーブル + 共通カラム + イベント固有カラム + 5 本のインデックス + RLS
- [ ] API ルート作成: `src/app/api/analytics/<event_type>/route.ts` (helper 関数を使い回し)
- [ ] ハンドラ差し込み: 既存ボタンに `logAnalyticsEvent("<event_type>", ...)` を追加 (await 禁止)
- [ ] 親エンティティ ID の先行発番化 (編集開始時に UUID 確定)
- [ ] 規約ページの「収集する内容」リストに新規イベント種別を追記
- [ ] バナーの文言と表示期間は **触らない** (規約全体の改定回数として扱う)
- [ ] Vercel 環境変数 `ANALYTICS_HASH_PEPPER` が既存有効なら追加設定不要

---

## 8. アンチパターン

| やってはいけないこと | 理由 |
|---------------------|------|
| `await logAnalyticsEvent()` を使う | UX に影響、ログ失敗で入力ブロック |
| ロガーの例外を throw する | 同上 |
| `user_id` を生のまま保存 | プライバシー違反 |
| 店舗名・台番号・メモを保存 | 個人特定情報、リーガルリスク |
| RLS に `FOR ALL` を使う | 操作別に個別ポリシー定義する原則違反 |
| 新規 UI 入力フィールドを勝手に追加 | UX 不変原則違反、司令官ジャッジが必要 |
| 親エンティティ削除時に物理削除 | 削除パターンも統計シグナル、`is_orphaned` で論理削除 |
| 訂正イベントを記録から除外 | 訂正パターンもノイズ推定材料、統計上有用 |
| イベント発火点で同期処理を走らせる | キーストローク反応速度劣化、UX 毀損 |
| pepper を NEXT_PUBLIC_ で公開 | クライアント側に漏洩、ハッシュ無効化 |
| n のターゲットを決めて時系列計画を立てる | データ収集と分析判断の分離原則違反 |
| 一度設定した規約バナー文言を後から変更 | 表示中ユーザーが混乱、改定単位で扱う |

---

## 9. 想定 Phase 計画

このスキルを新規アプリに適用する場合のデフォルト Phase:

| Phase | 内容 | 目安 |
|-------|------|------|
| Phase 0 | マイグレーション + RLS (1 監視対象につき 1 ファイル) | 即着手可 |
| Phase 1 | ロガー + オフラインキュー + API ルート + ハンドラ差し込み + 規約 + バナー | Phase 0 直後 |
| Phase 2 | サンプル蓄積後、SQL Editor で任意タイミング分析 | 必要時 |
| Phase 3 | (必要時) Sheets 連携 / マテビュー / Cron 自動化 | 当面不要 |
| Phase 4 | (必要時) オプトアウト UI / 結果公開 | 個別判断 |

Phase 0 + 1 完了 = インフラ完成。それ以降はサンプル状況とニーズに応じて。

---

## 10. プロジェクト固有の判断ログ (TGR Resonance での確定事項)

参考としての記録。新規プロジェクトでは再判断する。

- **管理者**: `mune.kf@gmail.com` (RLS の SELECT 条件)
- **CZ 監視対象**: レミニセンス + 大喰いのリゼ
- **role enum**: `bell` / `replay` / `weak_rare` / `strong_rare` / `hazure` (押し順ベルと共通斜めベルは `bell` で統合)
- **大喰いのリゼ最終 G**: `is_final_game` フラグで分岐、押し順ベル抽選サンプル除外
- **AT 敵キャラ**: 入力 UI 未追加のため記録未対応 (案 B/C で運用)
- **BITES**: 既存 UI のみで完結、UX 変化なし

---

## 11. 関連ドキュメント

| ドキュメント | パス |
|-------------|------|
| OPUS2 初稿提案 | `docs/opus2-collab/01_opus2_to_claude_initial.md` |
| Claude Code 一次回答 | `docs/opus2-collab/02_claude_to_opus2_response.md` |
| OPUS2 設計確定 | `docs/opus2-collab/03_opus2_to_claude_initial.md` |
| Phase 0 完了報告 | `docs/opus2-collab/04_claude_to_opus2_phase0_questions.md` |
| OPUS2 Phase 1 承認 | `docs/opus2-collab/05_opus2_to_claude_reply.md` |
| AT/BITES 拡張提案 | `docs/opus2-collab/06_claude_to_opus2_at_extension.md` |
| マイグレーション 017 | `supabase/migrations/017_create_analytics_cz_game_events.sql` |
