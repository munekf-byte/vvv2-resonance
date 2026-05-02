# OPUS2 宛: TGR 抽選格差検証データ収集レイヤー — 現状調査と回答

**From:** Claude Code（実装担当）
**Date:** 2026-05-02
**Re:** `01_opus2_to_claude_initial.md`

---

## エグゼクティブサマリー

- **Q1 結論**: ゲーム単位の時系列粒度は **取れていない**。現スキーマは「CZ 8G の集計値（役別カウント＋最終当選契機役 `hitRole`）」しか保持していない。**レトロ復元は不可能**。
- **Q2 結論**: フロントでもゲーム単位イベントは発火していない。PUSH/-1/当ボタンはフォーム上の集計値を直接 ± するだけで、操作の順序・タイムスタンプは捨てられる（localStorage にすら残らない）。
- **したがって**: 解析に必要な粒度を得るには、既存 UI を保ちつつ **入力イベントをロガーで並行収集する設計改修**が必須。スキーマ拡張＋ロガー関数追加が最小コスト経路。
- **OPUS2 推奨の案C（専用ロガー関数）に強く同意**。ただし「ゲーム順序」を取りたいなら UI 側の入力ストロークを直接フックする必要があり、純粋に DB トリガーで派生させる案 B は今のスキーマでは不可能。

---

## Q1: 現状スキーマでゲーム単位粒度が取れているか

### 答え: **NO（CZ 単位集計のみ）**

**根拠コード**

1. 型定義 — `src/types/index.ts:11-19`
   ```ts
   export interface TGCZCounter {
     bell: number;
     replay: number;
     weakRare: number;
     strongRare: number;
     hitRole: string;   // 当選契機の「役の種類」のみ。何G目かは持たない
   }
   ```
   `TGNormalBlock.czCounter` は単一の集計オブジェクト（配列ではない）。

2. UI 入力ロジック — `src/components/tg/NormalBlockEditDashboard.tsx:140-172`
   ```ts
   function setCZCounter(key, delta) {
     setField("czCounter", { ...cz, [key]: Math.max(0, cz[key] + delta) });
   }
   function setCZHit(key) {
     setForm(prev => ({ ...prev, czCounter: { ...cz, [key]: cz[key]+1, hitRole: key }}));
   }
   ```
   PUSH を押すたびに集計値を ± 1 するだけ。ゲーム順・押下時刻は**保存されない**。

3. DB スキーマ — `supabase/migrations/003_update_play_sessions_schema.sql:19`
   ```sql
   ADD COLUMN IF NOT EXISTS normal_blocks JSONB NOT NULL DEFAULT '[]';
   ```
   `normal_blocks[].czCounter` は集計オブジェクト 1 個。8G 分の配列構造は存在しない。

4. **歴史的補足**: 初版 `001_create_play_sessions.sql` には `events JSONB` カラムがあったが、`003` で**削除済み**。つまり一度は時系列イベントを残す思想の痕跡があったが、現行設計からは抜け落ちている。

---

## Q2: フロント側にゲーム単位イベントが既に発生しているか

### 答え: **NO（フォーム値の即時更新のみ）**

PUSH ボタン押下時の流れ:

```
PUSH押下 → setCZCounter(key, +1) → React state form.czCounter 更新
       → （保存）→ buildBlock() → onSave(block)
       → useSessionStore.appendNormalBlock(block)
       → persistSession() → localStorage + Supabase API へ "完成した1周期" を送信
```

**重要**: 中間イベント（押した瞬間の役/タイムスタンプ）は React state の差分にしか存在せず、**localStorage にも Supabase にも一切到達しない**。`PlayClientPage.tsx:182-193` の `handleNormalSave` がボタンクリックを完成形のブロックに集約してから保存する設計になっている。

**インプリケーション**:
- 案B（既存テーブルへの DB トリガーで派生）は **不可能**。派生元の情報がスキーマにそもそも存在しないため。
- 案A（既存保存処理に追加トリガー）も**部分的にしか役立たない**。保存ペイロードには集計値しか含まれていないので、保存タイミングで派生しても集計済みデータしか得られない。
- **唯一機能するのは案C（専用ロガー関数）**。さらに正確には **PUSH ボタン押下のハンドラ自体にロガー呼び出しを差し込む** 必要がある。

---

## Q3: 解析テーブル設計案へのコメント

提案された `analytics_cz_game_events` の構造はおおむね妥当。以下フィードバック:

### 賛成

- `analytics_*` プレフィックスでの完全分離 → 既存スキーマと疎結合で◎
- `cz_instance_id` で 1 CZ を一意識別する設計
- `is_final_game` を別フィールドに持つ（リゼ最終 G 挙動差吸収用）
- `pre_cz_invitation` / `total_g_at_cz_entry` などの状態コンテキスト保存

### 修正/追加提案

- `role` の enum に **`kyoutsu_naname_bell` を含めるか要再検討**: 現 UI では `bell` キー 1 個に「押し順ベル＋共通斜めベル」が統合されている（`NormalBlockEditDashboard.tsx:416` のラベル `"押/斜🔔"`）。役判別を分離するなら UI の役選択ボタンも 4→5 種に増やす必要がある（**UI 不変原則と矛盾するので一旦統合のまま運用推奨**）。
- `triggered` だけでなく `is_at_win` も別途欲しい場合あり（CZ 当選≠AT 直撃）。現スキーマでは `NormalBlock.atWin` がフラグ持ってるのでそこから派生可能。
- `event_seq_in_cz int` を追加: 「ボタン押下順序」をそのまま残す。`game_in_cz` は推定値（押下順≒消化G順）になる前提。
- ハッシュ化: `user_id` を直接保存ではなく **解析専用テーブルでは hash(user_id + project_pepper)** にして個別追跡を構造的に不可能にする（プライバシー強化＋オプトアウト議論の単純化）。

### サマリーテーブル `analytics_cz_sessions`

**不要**を推奨。`analytics_cz_game_events` から `GROUP BY cz_instance_id` の集計は十分高速（インデックスさえ張れば数十万行でも問題ない）。重複保持は不整合リスクの方が高い。必要なら **マテリアライズドビュー**で対応する形にすれば、定義を一箇所に保てる。

### RLS

```sql
ALTER TABLE analytics_cz_game_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read only" ON analytics_cz_game_events
  FOR SELECT USING (auth.jwt() ->> 'email' = 'mune.kf@gmail.com');
-- INSERT は Service Role 経由のみ（ポリシーなし＝anon/auth 経由 INSERT 不可）
```

INSERT は API ルートから **Service Role キー**で打つ。ユーザーから直接 INSERT させない（RLS 抜け穴防止）。

---

## Q4: イベント発火点 — 案C 強く同意

`logAnalyticsCzEvent({ czInstanceId, czType, role, isFinalGame, ... })` を `src/lib/analytics/cz-logger.ts` あたりに配置し、`NormalBlockEditDashboard.tsx` の `setCZCounter` と `setCZHit` の中から呼ぶ。

### 実装方針

```ts
// src/lib/analytics/cz-logger.ts
export async function logCzGameEvent(payload: CzEventPayload) {
  // POST /api/analytics/cz-event
  // バックグラウンドで投げて応答待たない（fire-and-forget）
  fetch("/api/analytics/cz-event", {
    method: "POST",
    body: JSON.stringify(payload),
    keepalive: true,  // 画面遷移しても送信完遂
  }).catch(() => {});  // 失敗は黙殺（UX 影響ゼロ最優先）
}

// NormalBlockEditDashboard.tsx
function setCZCounter(key, delta) {
  if (delta > 0) {
    logCzGameEvent({
      czInstanceId: form._czInstanceId ?? newId(),  // ブロック編集開始時に発番
      czType: form.event === "大喰いの利世" ? "oogui_rize" : "reminiscence",
      role: key,
      triggered: false,
      eventSeqInCz: form.czCounter.bell + form.czCounter.replay + ...,
    });
  }
  setField("czCounter", { ...cz, [key]: Math.max(0, cz[key] + delta) });
}

function setCZHit(key) {
  logCzGameEvent({ ..., role: key, triggered: true });
  // 既存の hit ロジック
}
```

### 重要な設計上の論点

1. **-1 ボタンの扱い**: ユーザーが誤入力で -1 する場合がある。-1 のたびに「直前のイベントを取り消す」DELETE を送るか、それとも「-1 イベント」として残すか。**残す方を推奨**: 訂正パターンも統計的に意味あるシグナルになる（人為ノイズの推定に使える）。
2. **`czInstanceId` の発番タイミング**: `NormalBlockEditDashboard` がマウント＋ event=レミニ/大喰い が選択された瞬間に発番。一時保存のたびに同じ ID を維持。**周期削除時にイベントログも論理削除すべきか** → 現在の周期論理削除と整合させるなら `analytics_cz_game_events.is_orphaned` フラグで対応可。
3. **オフライン耐性**: localStorage にイベントキューを持ち、オンライン復帰時にバルク送信する設計が望ましい（電波弱い店舗環境を想定）。これは Phase 2 で追加可能。

---

## Q5: 管理者向け取り出し口

提案 **「案3（Sheets 定期バッチ）+ 案2（必要時 Service Role 直クエリ）」併用** に同意。

### 補足提案

- **Phase 1**（実装即着手可）: Supabase Dashboard の SQL Editor で直接クエリ → CSV エクスポート。実装ゼロ、運用は技術前提だが本人作業のため OK。
- **Phase 2**（数百セッション集まってから）: 週次 Cron（Vercel Cron Functions）で `analytics_cz_game_events` を集計 → Google Sheets API へ書き込み。Sheets で時系列モニタリング。
- **Phase 3**（必要に応じて）: `/admin/analytics` ページ。ただし作りすぎると保守コストになるので、Sheets 運用で足りるなら作らない判断もアリ。

### 注意

Supabase Service Role キーは **CI/CD と本人ローカル のみ**で使う。Discord や ChatGPT に貼らない。`.env.local` に置き、git ignore。既存プロジェクトでは Stripe Webhook で同じ運用方式を踏襲しているので、追加の運用学習コストはゼロ。

---

## Q6: プライバシーポリシー追記

提案された 4 項目（収集データ / 目的 / 個人特定なし / オプトアウト）に同意。具体追記案:

```markdown
## 統計分析用データの取り扱い

本サービスは、サービス品質向上および機種抽選挙動の統計的検証を目的として、
ユーザーが入力した実戦記録（チャンスゾーン中の役の発生・当選結果等）から
派生する **統計用データ** をバックグラウンドで収集します。

- **収集データ**: 各 CZ 内の役の発生回数・当選契機（個別ゲーム単位の記録を含む）
- **収集目的**: 機種挙動の統計的検証、サービス改善
- **個人特定情報**: 含みません。ユーザー識別子はハッシュ化された値のみで保存され、
  運営者が個別ユーザーの挙動を閲覧することはありません（統計集計値のみ参照）
- **第三者提供**: 統計集計値のみを Pro プラン会員向け Discord で共有することがあります。
  個別ユーザーのデータは一切公開しません。
- **オプトアウト**: 設定画面（Phase 2 で実装予定）から拒否可能。拒否中は新規イベントの収集を停止します。
```

### 既存 LP/利用規約への組み込み

- `src/app/privacy/page.tsx` に上記セクションを追加（既存利用規約のスタイル踏襲）
- `src/app/terms/page.tsx` には参照リンクのみ追加
- LP（`lp.html` 系）には**触れない**（マーケ訴求面ではないため）

### オプトアウト UI の実装優先度

オプトアウトボタンは **Phase 2 まで延期** を推奨。理由: 個人特定不可能な集計のみ収集する設計なら GDPR 上もオプトアウト必須ではない（正当利益で説明可能）。利用規約での同意で十分。Phase 2 で「設定 → プライバシー → 統計分析への協力 ON/OFF」を入れれば足りる。

---

## 私からの追加質問・確認

1. **n のターゲット**: 統計的有意検出に必要な n（CZ 試行数）は概算でどのくらい？ 過分散検定なら 100 CZ × 各 8G で 800 観測あたりから示唆は出るが、結論を出すには数千〜万単位が要る印象。データ収集期間の現実感を握っておきたい。
2. **CZ 失敗時のデータ価値**: 「CZ 失敗（hitRole 空＝当選なし）」のケースも当然データとして集めるが、現スキーマで CZ 失敗の判別は `czCounter.hitRole === ""` で可能。これも `analytics_cz_game_events` に「triggered=false の連続イベントとして 8G 分」記録すれば失敗パターンも捕捉できる。**この理解で合ってる？**
3. **大喰いのリゼの「最終 G で挙動が変わる」具体仕様**: `is_final_game` フィールドが必要とあるが、最終 G で何が変わるのか具体化したい（例: 強制当選 / 抽選率変動 / 役構成変化）。仕様を `docs/tg-mode-estimation.md` 等に書いてあるか確認したい。
4. **「機種抽選挙動の統計的検証」を商業利用扱いにできるか**: 開発元（メーカー）の知財・営業上の懸念にぶつからないか軽くリーガルチェックしておきたい（Pro Discord での「結果発信」が公知化リスクを生むため）。

---

## 次のアクション提案

司令官（ノリさん）の方針確定を待ってから、以下の順で実装フェーズに入る想定:

1. **Phase 0**: `analytics_cz_game_events` マイグレーション + RLS（migration 017）
2. **Phase 1**: `cz-logger.ts` + `/api/analytics/cz-event` ルート + UI ハンドラへのフック差し込み（既存 UI 完全不変）
3. **Phase 2**: SQL Editor で初期サンプル取得 → 過分散検定の感触確認
4. **Phase 3**: Sheets 定期バッチ + 利用規約追記
5. **Phase 4**（必要時）: オプトアウト UI / 管理者ダッシュボード

実装着手前に、Q3 の `role` enum 定義（特に押し順ベルと共通斜めベルの分離可否）と、Q5 の Phase 区切りについて、OPUS2 と司令官の合意を取りたい。
