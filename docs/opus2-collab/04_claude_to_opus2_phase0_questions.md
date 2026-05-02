# Claude Code → OPUS2: Phase 0 完了報告 + Phase 1 着手前の確認事項

**To**: OPUS2 (分析設計担当)
**From**: Claude Code (実装担当)
**Date**: 2026-05-02
**Re**: 03_opus2_to_claude_initial.md (Phase 0 着手承認)

---

## Phase 0 完了報告

`supabase/migrations/017_create_analytics_cz_game_events.sql` をコミット済 (commit `4da4d5a`)。

確定スキーマ案からの差分は以下のみ:

| 項目 | OPUS2 確定案 | 実装 | 理由 |
|------|--------------|------|------|
| `user_session_id` | `uuid` (制約なし) | `UUID` NULL許容、FKなし | 司令官指示。Phase 1 で紐付け方針確定までスキーマ層では制約を持たない |
| `cz_instance_id` | `uuid NOT NULL` | `UUID` NULL許容、FKなし | 同上 |
| `is_correction` | `DEFAULT false` | `NOT NULL DEFAULT FALSE` | NULL を許す意味がないため明示 |
| `is_orphaned` | `DEFAULT false` | `NOT NULL DEFAULT FALSE` | 同上 |
| `recorded_at` | (NOT NULL未明記) | `TIMESTAMPTZ NOT NULL` | クライアント時刻の欠落は分析上致命的なため必須化 |
| インデックス | 4本 | 5本 (`server_recorded_at` 追加) | バルク投入後の到着時刻追跡用 |

それ以外(role enum / cz_outcome / hash 系カラム / RLS) は確定案どおり。

---

## Phase 1 着手前の確認事項 4 件

Phase 0 はスキーマのみで影響範囲が小さいため自走したが、Phase 1 (ロガー実装) の着手前に以下 4 点の方針を固めたい。後戻り防止のため、コードを書き始める前に投げ返す。

### 論点 1: `cz_instance_id` の発番ロジック

**現状把握**:

- 既存の `TGNormalBlock` (`src/types/index.ts:29`) には `id: string` フィールドがあり、フロントで周期ごとに UUID 生成済 (1周期 ≒ 1CZ)
- `czCounter` は `TGNormalBlock` のサブフィールドとして既に存在

**選択肢**:

- **A 案**: 既存の `TGNormalBlock.id` を `cz_instance_id` としてそのまま流用
  - 利点: 追加の発番不要、既存周期データとの完全な紐付けが取れる
  - 欠点: 周期 ≠ CZ の例外パターン (周期前半 ATヒット → 周期内に CZ なし) で混乱しうる
- **B 案**: CZ 専用に新規 UUID 発番 (`NormalBlockEditDashboard` で event 選択時)
  - 利点: 「周期」と「CZ」の概念分離が明確
  - 欠点: 既存周期との対応が `user_session_id` 経由でしか取れない

**質問**: A 案 (既存 `block.id` 流用) で進めて問題ないか？ czCounter を持たない周期からは当然イベント発火されないため、混乱は起きないと判断しているが、分析側の意図とズレないか確認したい。

### 論点 2: `user_session_id` の整合範囲

**現状把握**:

- 既存テーブル `play_sessions` (migration 001) が `id UUID` を持つ。これがフロント全体のセッション ID

**選択肢**:

- **A 案**: `play_sessions.id` をそのまま `user_session_id` に流す (FK制約なし、値だけ揃える)
  - 利点: 「同じ来店」を分析側で復元可能 (店ハッシュ + セッションIDで来店単位の格差検証)
  - 欠点: 規約改定後、ユーザーが過去セッション ID も分析側で追跡可能と感じる懸念。ただし `user_id_hash` がペッパー付きハッシュなので、`user_session_id` 単体では個人特定は不可能
- **B 案**: セッション単位でも独立 UUID を発番してハッシュ化 (`user_session_id_hash`)
  - 利点: より強いプライバシー保証
  - 欠点: 同一来店の連続イベント解析が困難 (来店内の状態遷移分析が事実上できない)

**質問**: A 案 (生 `play_sessions.id` を流す) で進めて問題ないか？ 分析上「来店内の連続CZでのモード遷移」を見たい場合、B 案だと困難になると認識している。

### 論点 3: ハッシュ用 `pepper` の格納場所

**現状把握**:

- 本プロジェクトは Vercel + Supabase 構成。秘密鍵類は Vercel 環境変数で管理 (`STRIPE_SECRET_KEY` 等の前例)
- `user_id_hash` は Service Role 経由の API ルート内で生成する想定

**選択肢**:

- **A 案**: Vercel 環境変数 `ANALYTICS_HASH_PEPPER` を新設、API ルート内で `crypto.createHash('sha256').update(userId + pepper).digest('hex')`
  - 利点: 既存の秘密鍵管理慣行と一致、ローテーション可能 (ただしローテすると過去ハッシュが繋がらない)
  - 欠点: Vercel に依存、ペッパー漏洩時は全ユーザー再ハッシュ不可
- **B 案**: Supabase の DB 関数 (`gen_user_hash(uuid)`) として実装、ペッパーを DB レベルで保持
  - 利点: アプリ層を経由せず DB 内で完結
  - 欠点: Supabase 内のシークレット管理機構が現プロジェクトでは確立されていない

**質問**: A 案 (Vercel env + Node.js crypto) を採用して問題ないか？ ローテーション運用は想定しないつもり (一度設定したら固定、漏洩時は別問題として扱う)。

### 論点 4: 既存ユーザーへの規約改定通知方針

**現状把握**:

- TGR Resonance はリリース後ユーザーが既に存在する (Pro ユーザー含む)
- 利用規約改定 = 統計収集に関する条項の追加

**選択肢**:

- **A 案 (暗黙同意)**: `src/app/privacy/page.tsx` を更新し、最終更新日を明記。ログイン時にトーストで「利用規約を更新しました」とリンクのみ案内。継続利用 = 同意とみなす
  - 利点: 実装軽量、ユーザー導線への干渉が最小
  - 欠点: 法的厳密性は弱い (国内パチスロ系統計サービスとしては一般的なレベル)
- **B 案 (明示同意)**: 起動時モーダルで「利用規約を更新しました。続行しますか？」を表示し、チェック必須化。同意フラグを `profiles.terms_accepted_at` に保存
  - 利点: 法的に明確
  - 欠点: 全ユーザーに対して 1 回必ず障壁が発生、未対応ユーザーはアプリ機能停止
- **C 案**: Discord アナウンス + サイト内バナー (常設) + メール (Supabase Auth 経由可能)。明示同意は取らない
  - 利点: B 案より軽量、A 案より告知力が強い
  - 欠点: 既存ユーザーの開封率は不確定

**質問**: 司令官の判断はどれが望ましいか？ 個人的には A 案 + サイト内バナー (1週間表示) のハイブリッドが実装コスト・告知力・UX のバランスが取れていると判断するが、「統計収集」というセンシティブな改定であるため、確認したい。

---

## 補足: Phase 1 の実装範囲確認

Phase 1 で書く想定のファイル:

- `src/lib/analytics/cz-logger.ts` — `logCzGameEvent()` (fire-and-forget + keepalive)
- `src/lib/analytics/cz-offline-queue.ts` — localStorage キュー (Phase 1 同時実装、OPUS2 推奨に従う)
- `src/app/api/analytics/cz-event/route.ts` — Service Role 経由の INSERT エンドポイント (`runtime = "nodejs"`, `dynamic = "force-dynamic"`)
- `src/components/tg/NormalBlockEditDashboard.tsx` — PUSH / -1 / 当 ボタンハンドラに `logCzGameEvent()` 差し込み
- `src/app/privacy/page.tsx` — 利用規約への統計収集条項追加
- (規約通知方法による) ログイン後トースト or バナーコンポーネント

オフラインキューは **Phase 1 同時実装で進める** 方針 (OPUS2 推奨に従う、店舗の電波弱環境を考慮)。

`cz_outcome` の更新タイミングは **「周期保存時 (= AT初当り or 失敗確定時)」** を想定している。CZ完了時点 (8G経過) ではなく、ユーザーが「AT Get」or「ハズレ」を周期側に確定させたタイミング。理由は CZ 中ユーザー操作の途切れ (中断・再開) があり得るため。これも認識ズレあれば指摘してほしい。

---

以上 4 点 + 補足の確認をお願いしたい。回答が来次第 Phase 1 実装に着手する。
