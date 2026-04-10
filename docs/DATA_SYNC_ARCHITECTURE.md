# データ同期アーキテクチャ — 技術レポート

**作成日**: 2026-04-10
**対象バージョン**: v3.8.5
**目的**: マルチデバイス同期の設計・実装の全体像ドキュメント

---

## 1. 設計原則

```
DBが絶対正義（Single Source of Truth）
├── 読み込み: DB優先 → localStorageは「キャッシュ」
├── 書き込み: localStorage即時 + DB非同期（リトライ付き）
└── 同期: 起動時にDBでlocalStorageを無条件上書き
```

**ローカル優先ロジックは完全廃止**（v3.8.4で確定）。以前は「localStorageの方がデータが多ければlocal優先」としていたが、デバイス間同期を阻害する最大の原因だったため排除。

---

## 2. 技術スタック

| レイヤー | 技術 | 役割 |
|---------|------|------|
| DB | Supabase (PostgreSQL) | 永続化の正（JSONB for normalBlocks/atEntries） |
| 認証 | Supabase Auth (Google OAuth) | ユーザー識別・RLSポリシー |
| API | Next.js Route Handlers | DB↔クライアント間のブリッジ |
| 状態管理 | Zustand | メモリ上のセッション状態 |
| キャッシュ | localStorage | オフライン対応・即時応答用 |
| SSR | Next.js Server Components | 初回読み込みでDBからデータ取得 |

---

## 3. ファイル構成

```
src/
├── lib/tg/
│   └── localStore.ts              ★ 同期エンジン本体（240行）
│       ├── lsSaveSession()        # localStorage保存 + DB非同期保存
│       ├── dbSaveWithRetry()      # リトライ付きDB保存（最大3回）
│       ├── debouncedDbSave()      # 500ms debounce
│       ├── flushPendingSaves()    # 未保存データの起動時リカバリ
│       ├── dbGetSessionList()     # DB一覧取得（エラーログ付き）
│       ├── onSyncStatusChange()   # 同期状態リスナー
│       └── SyncStatus型           # synced|saving|pending|error|auth_error
│
├── store/
│   └── useSessionStore.ts         # Zustand（メモリ状態管理）
│
├── app/
│   ├── play/[id]/
│   │   ├── page.tsx               # SSR: DBからinitialSession取得
│   │   └── PlayClientPage.tsx     # Client: DB優先読み込み + 自動保存
│   │
│   ├── dashboard/
│   │   └── DashboardClient.tsx    # セッション一覧: DB→localStorage上書き
│   │
│   └── api/
│       ├── sessions/route.ts      # GET: ユーザーの全セッション一覧
│       ├── session/[id]/
│       │   ├── save/route.ts      # POST: セッション保存（PGRST204自動回避）
│       │   ├── load/route.ts      # GET: 個別セッション読み込み
│       │   └── route.ts           # DELETE: 論理削除（is_deleted=true）
│       └── session/create/route.ts # POST: 新規セッション作成
│
└── components/auth/
    └── AuthContext.tsx             # 認証状態管理（Google OAuth）
```

---

## 4. データフロー詳細

### 4.1 書き込みフロー（ユーザーが編集した時）

```
ユーザー操作（周期追加・AT記録・収支入力等）
    │
    ▼
Zustand Store 更新
    │
    ▼
useEffect 発火（PlayClientPage L104-106）
    │
    ▼
persistSession() — JSON比較で変更検出
    │
    ├──→ localStorage 即時書き込み（同期的・確実）
    │     key: tgr_session_{id}
    │     key: tgr_sessions（メタデータ一覧）
    │
    └──→ debouncedDbSave() — 500ms debounce
          │
          ▼
        dbSaveWithRetry() — 非同期
          │
          ├── 成功 → removePendingSave() → SyncStatus="synced"
          │
          ├── 401/403 → SyncStatus="auth_error"（リトライ停止）
          │
          ├── PGRST204 → 問題カラム自動除外 → 再試行
          │
          └── その他エラー → リトライ（1秒→3秒→8秒）
               └── 3回失敗 → SyncStatus="error"
```

### 4.2 読み込みフロー（ページを開いた時）

#### ダッシュボード（セッション一覧）

```
DashboardClient マウント
    │
    ▼
loadSessions()
    │
    ▼
fetch("/api/sessions") — DBから一覧取得
    │
    ├── 成功 → setSessions(cloud)
    │          localStorage("tgr_sessions") = cloud  ← 無条件上書き
    │
    └── 失敗 → console.error（レスポンス詳細出力）
               setSessions([])  ← 空表示（localStorageフォールバックなし）
```

#### セッション詳細（/play/[id]）

```
page.tsx (Server Component / SSR)
    │
    ▼
loadSessionById(id, userId) — Supabaseから直接SELECT
    │
    ├── 成功 → initialSession として Client Component に渡す
    │
    └── 失敗 → makeFallbackSession()（空セッション）
               │
               ▼
PlayClientPage マウント
    │
    ▼
loadSession(initialSession)  ← DBデータを無条件採用
localStorage(tgr_session_{id}) = initialSession  ← 無条件上書き
flushPendingSaves()  ← 未保存データがあればリカバリ送信
```

### 4.3 未保存リカバリフロー（起動時）

```
アプリ起動 / ページ遷移
    │
    ▼
flushPendingSaves()
    │
    ▼
localStorage("tgr_pending_saves") から未保存IDリスト取得
    │
    ▼
各IDについて:
    ├── localStorageからセッションデータ読み込み
    └── dbSaveWithRetry(session, 0) で再送信
```

---

## 5. DB保存の堅牢性設計

### 5.1 リトライ機構

```typescript
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 8000]; // 1秒, 3秒, 8秒

async function dbSaveWithRetry(session, attempt):
  1. SyncStatus = "saving"
  2. fetch POST /api/session/{id}/save
  3. 成功 → "synced"
  4. 401/403 → "auth_error"（リトライ停止）
  5. PGRST204 → 問題カラム除外して即再試行
  6. その他 → RETRY_DELAYS[attempt]後にリトライ
  7. 3回失敗 → "error"
```

### 5.2 Debounce

```
ユーザーが連続編集 → 500ms間隔で束ねて1回のDB保存に
debounceTimers: Map<sessionId, timer>
```

### 5.3 未保存追跡

```
localStorage key: tgr_pending_saves
内容: ["session-id-1", "session-id-2", ...]

addPendingSave(id): 保存開始時にIDを追加
removePendingSave(id): 保存成功時にIDを除去
flushPendingSaves(): 起動時に未保存分を全送信
```

### 5.4 PGRST204自動回避

```
PostgRESTのスキーマキャッシュにカラムがない場合:
1. エラーメッセージからカラム名を正規表現で抽出
2. payloadから該当カラムを削除
3. 即座に再試行
→ 主要データ（normal_blocks, at_entries）は必ず保存される
```

---

## 6. 同期状態の可視化

### 6.1 SyncStatus 型

```typescript
type SyncStatus = "synced" | "saving" | "pending" | "error" | "auth_error";
```

### 6.2 UIインジケーター（ヘッダー常駐）

| 状態 | 表示 | 色 | 意味 |
|------|------|-----|------|
| synced | `● 保存済` | 緑 `#16a34a` | DBに保存完了 |
| saving | `◌ 保存中` | 青 `#2563eb` | DB保存処理中 |
| pending | `◎ 未同期` | 黄 `#f59e0b` | リトライ待ち |
| error | `! 同期エラー` | 赤 `#dc2626` | 3回リトライ失敗 |
| auth_error | `! 要再ログイン` | 赤 `#dc2626` | 認証切れ（401/403） |

### 6.3 リスナー機構

```typescript
// グローバルリスナー登録
const unsub = onSyncStatusChange((status) => {
  // UIを更新
});

// コンポーネント内
useEffect(() => {
  return onSyncStatusChange(setSyncStatus);
}, []);
```

---

## 7. API設計

### 7.1 セッション一覧取得

```
GET /api/sessions
Authorization: Cookie (Supabase Auth)

Response 200:
[
  {
    id: "uuid",
    machineName: "string",
    createdAt: "ISO8601",
    updatedAt: "ISO8601",
    blockCount: number,
    atCount: number,
    totalGames: number,
    balance: number | null,
    settingHint: string,
    userSettingGuess: string
  },
  ...
]

Response 401: { error: "Unauthorized" }
```

### 7.2 セッション保存

```
POST /api/session/{id}/save
Content-Type: application/json
Body: PlaySession オブジェクト

Response 200: { ok: true }
Response 200: { ok: true, dropped: "status" }  ← PGRST204回避時
Response 400: { error: "Invalid JSON" }
Response 500: { error: "...", details: "...", hint: "...", code: "PGRST204" }
```

### 7.3 セッション作成

```
POST /api/session/create
Body: { machineName: string }

Response 200: { id: "uuid", userId: "uuid" }
```

### 7.4 セッション削除（論理削除）

```
DELETE /api/session/{id}

→ UPDATE play_sessions SET is_deleted = true WHERE id = $1 AND user_id = $2
```

---

## 8. DBスキーマ（play_sessions）

```sql
CREATE TABLE play_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id),
  machine_name          TEXT NOT NULL DEFAULT '東京喰種 RESONANCE',
  started_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at              TIMESTAMPTZ,
  status                TEXT DEFAULT 'ACTIVE',
  start_diff            INTEGER DEFAULT 0,
  initial_through_count INTEGER DEFAULT 0,
  normal_blocks         JSONB NOT NULL DEFAULT '[]',  -- NormalBlock[]
  at_entries            JSONB NOT NULL DEFAULT '[]',  -- TGATEntry[]
  summary               JSONB,
  mode_inferences       JSONB,
  memo                  TEXT,
  is_deleted            BOOLEAN NOT NULL DEFAULT false,
  uchidashi             JSONB DEFAULT NULL,            -- UchidashiState
  shushi                JSONB DEFAULT NULL,            -- ShushiData
  user_setting_guess    TEXT DEFAULT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### RLSポリシー

```sql
-- ユーザーは自分のセッションのみアクセス可能
CREATE POLICY "Users can only access their own sessions"
  ON play_sessions FOR ALL
  USING (auth.uid() = user_id);
```

---

## 9. localStorage キー一覧

| キー | 内容 | 型 |
|------|------|-----|
| `tgr_sessions` | セッションメタデータ一覧 | `SessionMeta[]` |
| `tgr_session_{id}` | 個別セッション全データ | `PlaySession` |
| `tgr_pending_saves` | DB未保存セッションIDリスト | `string[]` |
| `tgr_totalG_{id}` | 総消化G数（ユーザー手入力） | `string` |

---

## 10. マルチデバイス同期のシナリオ

### シナリオA: スマホで入力 → PCで確認

```
[スマホ]
1. セッション編集 → localStorage + DB保存
2. SyncStatus = "synced" を確認

[PC]
3. ダッシュボード表示 → /api/sessions → DB一覧取得
4. localStorage を DB内容で上書き
5. セッションをタップ → SSRでDB取得 → initialSession
6. PlayClientPage で DB無条件採用 → localStorage上書き
7. ✅ スマホのデータがPCに完全同期
```

### シナリオB: オフライン編集 → 復帰後同期

```
[オフライン]
1. セッション編集 → localStorage保存成功
2. DB保存失敗 → tgr_pending_saves に記録
3. SyncStatus = "error"

[オンライン復帰]
4. ページ再読み込み → flushPendingSaves()
5. 未保存データをDB送信 → 成功
6. SyncStatus = "synced"
```

### シナリオC: ブラウザ履歴クリア → 再ログイン

```
[クリア前]
1. データはDBに保存済み（synced状態）

[クリア後]
2. localStorage 全消失
3. 再ログイン → ダッシュボード表示
4. /api/sessions → DBから一覧取得
5. localStorage に書き戻し
6. ✅ データ復元完了
```

---

## 11. 他プロジェクトへの再利用ガイド

### 11.1 最小構成

```
localStore.ts        # 同期エンジン（これがコア）
useSessionStore.ts   # Zustand状態管理
/api/session/save    # DB保存API
/api/sessions        # 一覧取得API
```

### 11.2 カスタマイズポイント

| 要素 | 変更方法 |
|------|---------|
| データ構造 | `PlaySession` 型を差し替え |
| DB テーブル | マイグレーションSQLを書き換え |
| 認証 | Supabase Auth以外なら `getUser()` ロジック差し替え |
| debounce間隔 | `debouncedDbSave` の `500` を変更 |
| リトライ | `MAX_RETRIES`, `RETRY_DELAYS` を調整 |
| 同期UI | `SyncIndicator` コンポーネントを流用 |

### 11.3 移植時の注意点

1. **PGRST204対策**: Supabaseのスキーマキャッシュはカラム追加後に `NOTIFY pgrst, 'reload schema'` が必要
2. **RLS**: APIで明示的に `user_id` フィルタすること（RLS任せにしない）
3. **JSONB**: DB由来のJSONBデータは型が不確実。`Array.isArray()` チェック必須
4. **論理削除**: `is_deleted = true` で物理削除しない。管理者は全データにアクセス可能
