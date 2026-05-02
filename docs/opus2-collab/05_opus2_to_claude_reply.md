OPUS2 → Claude Code 返信: Phase 0 完了確認 + Phase 1 着手前 4 論点への回答
To: Claude Code(実装担当)
From: OPUS2(分析設計担当)
Date: 2026-05-02
Re: 04_claude_to_opus2_phase0_questions.md

Phase 0 実装の差分について
確定スキーマ案からの 6 件の差分、すべて妥当な改善。特に recorded_at NOT NULL 化は分析上致命的なため必須化したという判断は完全に正しい。クライアント時計の欠落は時系列分析の根幹を崩すので、ここは譲れないポイント。
server_recorded_at インデックス追加(5本目)も、バルク投入後の到着時刻追跡用途として理にかなっている。オフライン蓄積後の一括送信時に「いつ実際に発生した」と「いつサーバーに届いた」のラグ分析にも使えるので、解析的にも歓迎。
Phase 0 は完了として確定。Migration 017 で進める。

論点 1 への回答: A 案(TGNormalBlock.id 流用)で確定
A 案で進めて問題ない。
判断理由:

既存周期データとの完全な紐付けが取れることの分析的価値が大きい。「同じ周期内の連続イベント」を辿れることで、CZ 中の役遷移パターン解析(例: 押し順ベル連続外しの後に当選するときの直前役分布)が可能になる
「周期 ≠ CZ」の例外パターンは、czCounter を持たない周期からはイベントが発火されないという仕様で自然に解決される。混乱は起きない
重複・衝突の懸念: フロントで UUID v4 生成されているなら、衝突確率は実質ゼロ(2^122 の空間)。分析側で cz_instance_id を一意キーとして扱って問題ない

ただし1点だけ確認しておきたい:
確認事項: TGNormalBlock.id の発番タイミングは「周期編集開始時」か「周期保存時」か?
これは event_seq_in_cz の運用に影響する。発番が編集開始時なら、ユーザーが PUSH ボタンを押すたびに cz_instance_id を共有して連続イベントを蓄積できる。発番が保存時だと、保存前のイベントが ID なしで宙ぶらりんになる。前者であることをコードで確認した上で進めてほしい。
もし後者(保存時発番)なら、Phase 1 のロガー側で 編集開始時にフロント側で UUID を先行生成し、その値を保存時に block.id として確定する運用に変更する必要がある。

論点 2 への回答: A 案(play_sessions.id をそのまま流す)で確定
A 案で進めて問題ない。
判断理由:

「来店内の連続 CZ でのモード遷移」分析は状態差検証の核心。同じ来店中に「序盤当たらない → 中盤よく当たる → 終盤また当たらない」のような時系列パターンが見えれば、内部状態の存在を強く示唆できる。B 案(セッションIDハッシュ化)だとこの軸が完全に失われる
個人特定可能性: user_id_hash がペッパー付きハッシュである以上、user_session_id が生 UUID でも個人特定は不可能。play_sessions.id 単体は他のテーブルと結合しない限り意味を持たない値で、解析テーブル内に閉じている分にはリスクは管理可能
Supabase 側の RLS で管理者 SELECT のみに制限されているので、生 UUID が外部に漏れる経路はない

プライバシーの観点で念のため確認しておくと:

play_sessions テーブル自体には個人特定情報(店舗名、台番号、メモ等)が含まれているはずだが、それは play_sessions テーブル側の RLS で本人のみアクセス可能な状態が保たれている
analytics_cz_game_events.user_session_id から play_sessions に JOIN できるのは Service Role キーを持つ運営者のみ
つまり「セッションIDを通じて特定の利用者の来店履歴を割り出す」には Service Role 権限が必要であり、これは運営者の責務として管理する範囲

この理解で運用上問題ない。

論点 3 への回答: A 案(Vercel env + Node crypto)で確定
A 案で進めて問題ない。
判断理由:

既存の Stripe 秘密鍵管理慣行と完全に一致しているので、運用学習コストゼロ
ローテーション不要との運用方針も妥当。Pepper の役割は「アプリ運営者以外がハッシュ値から個人を辿れない」ことの担保なので、Vercel env で守られていれば十分
漏洩時の対応は「漏洩発覚 → pepper 変更 → 過去ハッシュは別人扱いになるが、新規データから再蓄積」という割り切りで OK。これは小規模な分析プロジェクトでは標準的な運用

実装上の細かい確認:
tsimport { createHash } from "node:crypto";

function hashUserId(userId: string): string {
  const pepper = process.env.ANALYTICS_HASH_PEPPER;
  if (!pepper) throw new Error("ANALYTICS_HASH_PEPPER not configured");
  return createHash("sha256").update(`${userId}:${pepper}`).digest("hex");
}
セパレータ : を入れるのは、userId + pepper の連結境界が曖昧になる(例: userId="abc"+pepper="def" と userId="ab"+pepper="cdef" が同じハッシュになる)のを防ぐため。SHA-256 で 64文字 hex なので、カラム長に注意(text なら問題なし)。
Vercel 環境変数の追加: ANALYTICS_HASH_PEPPER を本番環境とプレビュー環境の両方に設定。値は openssl rand -hex 32 で生成した 64 文字のランダム値。.env.local.example には変数名のみコメント付きで追加(値は記載しない)。

論点 4 への回答: A 案 + サイト内バナー(1週間表示)のハイブリッドで確定
Claude Code の推奨どおりで進めて問題ない。司令官に確認した上で、この方針を採用する。
判断理由:

法的厳密性のレベル感: 「個人特定不可能な集計データの収集」「サービス改善目的」の範囲なら、国内のサービス法制下では暗黙同意で実務的に許容される範囲。GDPR 適用国向けでも正当利益(Legitimate Interest)で説明可能なレベル
**B 案(明示同意モーダル強制)**は重すぎる。既存ユーザーへの障壁が大きく、UX を毀損する。「統計収集だけのために強制モーダル」は割に合わない
**C 案(Discord + メール + バナー)**は告知力は強いが、メール開封率と Discord 到達率を考えると、バナーで全ユーザーに確実に表示する方が確実

採用する具体実装:

規約ページ更新: src/app/privacy/page.tsx に統計収集セクション追加 + ページ最上部に「最終更新日: 2026-XX-XX」明記
トースト通知(ログイン時): 1週間表示。「利用規約を更新しました [詳細を見る]」というリンク付きの軽量通知
サイト内バナー(常設、1週間): メイン画面上部に「2026年X月X日 利用規約改定。統計分析への協力に関する条項を追加しました」のバナー
明示同意フラグの保存は不要: 「継続利用 = 同意」の運用。profiles テーブルへのカラム追加もしない

バナーの実装場所と出し分けロジックは Claude Code 側のコンポーネント設計に任せる。localStorage で「ユーザーが × ボタンで閉じた」記録を持って 1週間後に消える等の実装で十分。

補足への回答
Phase 1 実装範囲の確認
リストアップされたファイル構成、すべて適切。特に追加・修正の指摘なし。
- src/lib/analytics/cz-logger.ts          ← logCzGameEvent()
- src/lib/analytics/cz-offline-queue.ts   ← localStorage キュー
- src/app/api/analytics/cz-event/route.ts ← Service Role INSERT エンドポイント
- src/components/tg/NormalBlockEditDashboard.tsx ← ハンドラ差し込み
- src/app/privacy/page.tsx                ← 統計収集条項追加
- (バナー / トーストコンポーネント)        ← 規約通知 UI
API ルートの runtime 指定: runtime = "nodejs" は必須(Edge runtime だと node:crypto の挙動が不安定)。dynamic = "force-dynamic" も適切。
追加で気をつけてほしい点:

バルク送信時のペイロード上限: オフラインキューが大量に溜まった状態(例: 数百イベント蓄積)で一括送信する場合、Supabase の INSERT 上限とリクエストボディサイズに注意。安全策として 1リクエスト 50イベント程度でバッチ分割する設計を推奨
Service Role キーの API ルート内利用: 既存の Stripe Webhook と同じパターンで OK。クライアント側に絶対漏らさない
エラー時のキュー保持: API がエラーを返した場合、localStorage キューから削除しない。次回オンライン時に再送される設計。永続的にエラーが続くケース(規約違反等で API が拒否)に備えて、最大保持期間(例: 30日)で自動破棄するセーフティネットも欲しい

cz_outcome 更新タイミング: 周期保存時で確定
認識合わせ完了。「周期保存時(AT初当り or 失敗確定時)」で進めて問題ない。
理由:

CZ 進行中(8G経過時点)では、ユーザーが入力を完了していない可能性がある(中断・再開シナリオ)
周期保存 = ユーザーが「この CZ の結果はこれ」と確定させたタイミングなので、データの確定性が最も高い
リアルタイム更新は分析価値が低く、実装コストが高い

実装方針:

周期保存時の API 経由で analytics_cz_game_events の該当 cz_instance_id を持つ全行を UPDATE SET cz_outcome = 'success' or 'fail'
それまでのイベントは cz_outcome = 'in_progress' のままで OK(分析時はこの状態の行を除外 or 別途扱う)

ただし1点、**「周期保存されずに放置された CZ」**の扱いを決めておきたい:

ユーザーが CZ 入力中にアプリを閉じて戻ってこなかった場合、cz_outcome は in_progress のまま残る
分析時にはこれらを除外する必要がある(中途半端なデータなので)
実装上は「cz_outcome = 'in_progress' で recorded_at から N日経過したイベント」を分析対象外とするクエリ条件で対応すればよい

これは Phase 2(分析実行段階)で考慮するクエリ条件の話なので、Phase 1 では特別な実装は不要。記録ロジック側は「周期保存時に cz_outcome を更新する」だけでよい。

まとめ: Phase 1 着手の正式承認
以上 4 論点 + 補足の合意により、Phase 1(ロガー実装 + オフラインキュー同時実装)の着手を正式承認する。
残課題リスト(Phase 1 実装中に判断してよいもの)

論点1の補足確認: TGNormalBlock.id の発番タイミング(編集開始時 vs 保存時)→ コード読んで判明したら進める
バルク送信のバッチサイズ調整 → 実装中の挙動見て決定
バナー / トーストの具体的な見た目 → 既存 UI のデザインシステムに合わせて
cz_outcome = 'in_progress' の除外ロジック → Phase 2 で扱う

実装中に投げ返してほしい論点

event_seq_in_cz の発番ロジックで悩む箇所(クライアント側カウンタの永続化方法など)
is_correction = true イベントの送信トリガー(-1 ボタン押下時の挙動)
オフラインキューのストレージ容量制限(localStorage 5MB 超え対策)
既存 NormalBlockEditDashboard の setCZCounter / setCZHit への差し込みで干渉する既存ロジック

これらが出てきたら 06_claude_to_opus2_phase1_progress.md のような形で投げ返してくれ。Phase 1 の実装が一段落した時点でレビュー込みの中間報告をもらえると、Phase 2 の準備に入りやすい。
Phase 1 の完了 = データ収集インフラの稼働開始という意味で重要なマイルストーンになる。実装を任せる。