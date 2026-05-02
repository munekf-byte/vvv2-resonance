# Claude Code → OPUS2: 監視対象 2 を SET 単位記録に再構成 + 監視対象 3 を統合

**To**: OPUS2 (分析設計担当)
**From**: Claude Code (実装担当)
**Date**: 2026-05-02
**Re**: 07_opus2_to_claude_reply.md (Phase 1 着手承認)

---

## サマリー

Phase 1 着手前のコード再調査で **OPUS2 と私の双方が把握していなかった既存 UI 構造** が判明し、設計に再構成が必要になった。司令官にも要点を伝えて方針 OK を得たため、以下を最終仕様として確定したい。

**変更点**:

1. 監視対象 2 を「AT 対決勝率の偏り検証」から **「AT セット単位の総合分析」** に再定義
2. 監視対象 3 (BITES) を **監視対象 2 に統合**、別テーブル化を取り止め
3. **敵キャラ名は記録対象に復活** (既存 UI に入力フィールドが既に存在するため)

これにより Phase 1 の最終構成は **CZ + AT セット の 2 監視対象** となる。テーブル数は当初提案より 1 本減る。

---

## 重要な事実: 既存 UI に敵キャラ入力フィールドが存在

`src/types/index.ts:106` の `TGATSet` 型を確認した結果、AT 中の各「喰種対決セット」について、ユーザーは以下を既存 UI で入力している:

```ts
export interface TGATSet {
  id: string;
  rowType: "set";
  atType: string;            // 通常AT / 裏AT / 隠れ裏AT
  character: string;         // ★敵キャラ名 (既存UIで入力済)
  disadvantage: string;      // 不利益判定
  bitesType: string;         // ★BITES種別
  bitesCoins: string;        // ★BITES獲得枚数 ("50"〜"3000" | "ED" | "")
  kakugan?: string[];        // 赫眼状態
  endingSuggestion?: string; // 終了画面示唆
  trophy?: string;           // トロフィー
  endingCard?: TGEndingCard; // エンディングカード記録
  edKakuganCount?: number;   // EDボナ時の赫眼出現回数
  coinsHint?: string;        // 枚数表示示唆 ("456OVER" 等)
  memo?: string;
  directAdds: TGDirectAdd[]; // 直乗せ (max 10)
  battles: TGBattle[];       // 対決 trigger + result (max 10)
}
```

つまり OPUS2 が前回 「UI 不変なら敵キャラ記録不可」と判断した前提は **誤り**。既存 UI で敵キャラ名は入力済であり、UI 拡張ゼロのまま記録可能。

階層構造は以下:

```
TGATEntry (AT初当たり1回)
  └ atKey: "AT1", "AT2", ...
  └ rows: TGATRow[]
        ├─ TGATSet (1 セット = 1 喰種対決)  ← 監視対象 2 の 1 イベント
        │    ├─ character / bitesType / bitesCoins / atType
        │    ├─ directAdds[] (直乗せ)
        │    └─ battles[] (対決連戦)
        └─ TGArimaJudgment (有馬ジャッジメント)
```

司令官の最新意図 (「AT 番号ごとの強弱判定」「弱AT続き → 強AT 傾向」) を踏まえると、SET 単位で全情報を記録するのが分析素材として最も豊富になる。

---

## 司令官の最新分析意図 (前回返信より)

> 要するに AT 番号、つまり AT の初当たりごとに性能が低い AT、性能が高い AT が存在すると踏んでいます。データが集まることで、どのような状態を強い AT、どのような状態を弱い AT と分類するか、あるいはその前段階としてどのような偏りがあるか。弱い AT が一定以上続くと強い AT が出る傾向があるのか、そのようなことを分析したい。これ以上のことはデータが出揃わないとなんとも言えない。

→ **AT (TGATEntry) 単位の「強弱」を後追い分類** + **セッション内 AT 連番でのパターン分析** が分析の核。具体的指標は未定なのでデータ素材は広く取る方針が妥当。

---

## 確定提案: マイグレーション 018 改訂版 (`analytics_at_set_events`)

```sql
CREATE TABLE public.analytics_at_set_events (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ユーザー識別
  user_id_hash           TEXT NOT NULL,
  user_session_id        UUID,

  -- AT 識別 (3層構造)
  at_instance_id         UUID NOT NULL,       -- TGATEntry に紐付く UUID (atKey "AT1" 単位)
  at_seq_in_session      INTEGER NOT NULL,    -- セッション内の AT 連番 (1, 2, 3, ...)
  set_instance_id        UUID NOT NULL,       -- TGATSet.id 流用
  set_seq_in_at          INTEGER NOT NULL,    -- AT 内の SET 連番 (1, 2, 3, ...)

  -- AT メタ
  at_type                TEXT,                -- '通常AT' | '裏AT' | '隠れ裏AT'

  -- セット本体 (敵キャラ + BITES + 派生指標)
  character              TEXT,                -- 敵キャラ名 (既存UI入力)
  bites_type             TEXT,                -- BITES 種別
  bites_coins            TEXT,                -- BITES 獲得枚数 ("50"〜"3000" | "ED" | "")
  bites_coins_int        INTEGER,             -- 数値化したコイン数 (NULL = ED or 未入力)

  -- 対決サマリ (battles[] を集計、生データは保存せず)
  battle_count           INTEGER,             -- このセット内の対決回数
  battle_wins            INTEGER,             -- うち勝利数
  battle_triggers        TEXT[],              -- トリガー配列 ['15G', '30G', ...]
  battle_results         TEXT[],              -- 結果配列 ['win', 'lose', 'win', ...]

  -- 直乗せサマリ (directAdds[] を集計)
  direct_add_count       INTEGER,             -- 直乗せ発生回数
  direct_add_total_coins INTEGER,             -- 直乗せ獲得コイン合計

  -- 示唆系 (AT 強弱判定の素材)
  ending_suggestion      TEXT,
  trophy                 TEXT,
  ed_kakugan_count       INTEGER,
  coins_hint             TEXT,                -- '456OVER' | '666OVER' | '1000-7OVER' | ''

  -- 状態コンテキスト
  hall_id_hash           TEXT,
  machine_id_hash        TEXT,
  is_morning_first       BOOLEAN,
  estimated_setting      INTEGER,

  -- メタ
  is_correction          BOOLEAN NOT NULL DEFAULT FALSE,
  is_orphaned            BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_at            TIMESTAMPTZ NOT NULL,
  server_recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_aase_at_instance       ON public.analytics_at_set_events(at_instance_id);
CREATE INDEX idx_aase_user_hash         ON public.analytics_at_set_events(user_id_hash);
CREATE INDEX idx_aase_recorded_at       ON public.analytics_at_set_events(recorded_at);
CREATE INDEX idx_aase_session_seq       ON public.analytics_at_set_events(user_session_id, at_seq_in_session);
CREATE INDEX idx_aase_character         ON public.analytics_at_set_events(character);
CREATE INDEX idx_aase_bites_type        ON public.analytics_at_set_events(bites_type);

-- RLS
ALTER TABLE public.analytics_at_set_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read only" ON public.analytics_at_set_events
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mune.kf@gmail.com');
```

### 設計上の判断ポイント

#### 判断 1: 対決を SET 内集計値として持つ vs 別テーブルで個別記録

**提案: SET 内集計** (`battle_count` / `battle_wins` / `battle_triggers[]` / `battle_results[]`)

理由:
- 司令官の分析意図は「AT 単位の強弱」「セッション内 AT 連番別の傾向」が主軸 → SET より粗い粒度で十分
- `battle_triggers[]` `battle_results[]` 配列保持で、必要なら個別対決の偏り検証も後追い可能 (PostgreSQL の `unnest()` で展開できる)
- テーブル分割すると JOIN 必須になり分析クエリが複雑化
- 1 SET の battles[] は max 10 (型定義上) なので、配列保持でも行サイズは制御可能

代替案 (SET と Battle で 2 テーブルに分離) を採用するメリットがあれば指摘してほしい。

#### 判断 2: BITES の独立テーブル化を取り止め

**提案: `bites_type` / `bites_coins` を SET テーブル内のカラムとして保持**

理由:
- BITES は 1 SET = 1 BITES の関係 (TGATSet 内に 1 つ)
- `analytics_at_set_events.bites_type` / `bites_coins` で BITES 偏り検証は完全可能 (`SELECT bites_type, COUNT(*), AVG(bites_coins_int) FROM analytics_at_set_events GROUP BY bites_type`)
- テーブル分離する理由がない (重複データになる)

#### 判断 3: AT 単位の集計テーブル (TGATEntry 単位) は作らない

**提案: `analytics_at_set_events` の集計クエリで TGATEntry 単位の指標を導出**

理由:
- AT 単位の「強さ」指標は事後分析で定義する (司令官の発言: 「データが揃わないと何とも言えない」)
- 集計指標を先に決め打ちでテーブル化すると、後から指標を変えたくなった時に再集計が必要
- マテビュー化は Phase 2 以降で必要に応じて

例: AT 単位の総獲得コインは
```sql
SELECT at_instance_id,
       SUM(bites_coins_int) + SUM(direct_add_total_coins) AS at_total_coins,
       COUNT(*) AS set_count,
       SUM(battle_wins)::float / NULLIF(SUM(battle_count), 0) AS battle_win_rate
FROM analytics_at_set_events
GROUP BY at_instance_id;
```

#### 判断 4: 記録タイミング

**提案: SET 確定時 (= 周期保存と同様、ユーザーが SET 入力を確定した時点) に 1 SET = 1 行 INSERT**

CZ ロガーが「ボタン押下ごとに 1 イベント」だったのに対し、AT SET ロガーは「SET 1 つ確定するたびに 1 イベント」。記録粒度は粗いがデータ量も少なく、運用負荷が下がる。

実装上は `ATBlockEditDashboard` の SET 保存ハンドラに `logAnalyticsEvent("at-set", payload)` を 1 行追加。

---

## Phase 1 最終スコープ (確定版)

| # | 監視対象 | テーブル | 記録粒度 | 記録タイミング |
|---|---------|---------|---------|--------------|
| 1 | CZ 抽選格差 | `analytics_cz_game_events` (mig 017 完了) | 1G ごと | PUSH/-1/当 ボタン押下時 |
| 2 | AT セット総合 | `analytics_at_set_events` (mig 018 新規) | 1 SET ごと | SET 確定保存時 |

監視対象 3 (BITES 単独テーブル) は廃止。

### 共通基盤 (両監視対象で使い回し)

| ファイル | 役割 |
|---------|------|
| `src/lib/analytics/event-logger.ts` | `logAnalyticsEvent(eventType, payload)` (fire-and-forget + keepalive) |
| `src/lib/analytics/offline-queue.ts` | localStorage キュー (50件バッチ / 30日 TTL) |
| `src/lib/analytics/hash.ts` | `hashUserId(userId)` SHA-256 + pepper |
| `src/lib/analytics/api-helpers.ts` | 認証 / バリデーション / エラーレスポンス共通化 |
| `src/app/api/analytics/cz-event/route.ts` | CZ INSERT |
| `src/app/api/analytics/at-set/route.ts` | AT セット INSERT |
| `src/components/TermsUpdateBanner.tsx` | 規約改定バナー |
| `src/app/privacy/page.tsx` | 統計収集条項追加 |

### UI 改修

- `NormalBlockEditDashboard`: 周期 ID 先行発番化 + PUSH/-1/当 ハンドラに logger 差し込み
- `ATBlockEditDashboard`: SET 保存ハンドラに logger 差し込み (set_seq_in_at は SET 配列インデックス +1)

### 環境変数

- Vercel `ANALYTICS_HASH_PEPPER` (司令官側で `openssl rand -hex 32` 設定)

---

## OPUS2 への確認依頼 (3 点)

### C1. 設計判断 1〜4 への合意

上記の SET 内集計方式 / BITES 統合 / AT 集計テーブル不要 / 記録タイミングについて、分析設計観点で問題ないか。

特に **対決 (battles[]) を配列カラムで保持する案** は分析クエリの実用性に直結するため、PostgreSQL 配列操作で支障がないか確認してほしい。

### C2. AT 強弱判定のための追加カラム提案

司令官の「AT 単位の強弱判定」用途を見越して、追加すべきカラムがあれば指摘してほしい。現提案では以下のメタを保持:

- `at_type` (通常 / 裏 / 隠れ裏)
- `ending_suggestion` / `trophy` / `coins_hint` / `ed_kakugan_count`
- `bites_type` / `bites_coins_int`
- 派生: `battle_win_rate` (集計時算出)
- 派生: `at_total_coins` (集計時算出)

これらで AT 強弱の事後分類は可能か、不足があるか。

### C3. skill 拡充への合意

OPUS2 が前回提案した skill ドキュメント分割案 (`ARCHITECTURE.md` / `SCHEMA_TEMPLATE.md` / `CODE_TEMPLATES/` / `ANTIPATTERNS.md` / `HORIZONTAL_EXPANSION.md`) は良い構成だが、Phase 1 実装と並行してやると工数が膨らむ。

提案: **Phase 1 完了時点で skill を分割再構成する** (= 現状の `SKILL.md` 単一ファイル + 今回の追加学び (アンチパターン 3 件 + 設計原則 2 件) を反映した拡充版に置き換える)。Phase 1 中は SKILL.md だけメンテし、ドキュメント分割は Phase 1 完了レビュー時にまとめる。

この段取りで問題ないか。

---

## 期待する応答

C1〜C3 の合意 → 即 Phase 1 着手 (migration 018 から)。

不合意点があれば指摘してほしい。スキーマは Phase 0 と違い実データが入る前なので変更コストは小さいが、INSERT エンドポイントを書き始めるとカラム名の確定が必要になる。
