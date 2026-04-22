# TGR Resonance — プロジェクトルール

## スタック
- Next.js 15 (App Router) + React 19 + TypeScript 5.6+
- Supabase (PostgreSQL + Auth + RLS) + Zustand 5 + Stripe 22
- Tailwind CSS 3.4 + Vercel デプロイ

## 編集前の鉄則
- **読んでいないコードは決して変更するな。** 対象ファイルは必ず事前に Read で確認。
- 関連ファイルへの影響（import 先、型定義、Store、API）も事前に確認すること。
- 型定義: `src/types/index.ts`
- Store: `src/store/useSessionStore.ts`
- 定数: `src/lib/engine/constants.ts`

## UIレギュレーション1（パチスロ入力アプリ共通・半永久適用）

### 禁止
- `<select>` ドロップダウン → **一切禁止**
- `flex-1` で引き伸ばした縦幅の薄いボタン群
- 縦並びの複数 `<select>` スロット

### 必須
- 全選択肢 → 四角いボタングリッド（`grid grid-cols-N gap-2` + `py-3以上`）
- 選択状態: `boxShadow: "0 0 0 2px #1f2937"`
- タップフィードバック: `active:scale-95`
- トグルキャンセル: 再タップで選択解除

詳細: `.claude/commands/ui-regulation.md`

## デザインシステム
- 浮遊カード: ウォームベージュ `#e8e2d8` 背面 + 白カード `border: 1px solid #000`
- セグメントコントロール: ダッシュボード=黒 `#1f2937` / Play=赤 `#dc2626`
- 一時保存: 緑フラッシュ `#16a34a` → 1.2秒後復帰
- 長押しヘルプ: 1.5秒 → モーダル（`user-select: none`）

全仕様: `docs/DESIGN.md`

## データフロー
- localStorage = キャッシュ、Supabase = 唯一の真実
- 書き込み: Zustand → localStorage(即時) → 500ms デバウンス → Supabase(リトライ3回)
- user_id はサーバー側 `auth.getUser()` から注入（フロント値は無視）
- 論理削除（`is_deleted`）、物理削除は管理者APIのみ

## セキュリティ
- RLS: `FOR ALL` 禁止、操作ごとに個別ポリシー定義
- Service Role Key: Webhook と Admin API のみ（他は anon key）
- Stripe Webhook: `runtime = "nodejs"`, `dynamic = "force-dynamic"`, 署名検証必須
- 秘密鍵に `NEXT_PUBLIC_` を付けない

## バージョン管理
- 1コミット = 1バージョンアップ（例外なし）
- 表示箇所: `src/app/dashboard/page.tsx` ヘッダー内
- コミット: `feat: vX.XX - 説明` / `fix: vX.XX - 説明`

## デプロイ
```
git add <files>
git commit --amend --reset-author
git push -f origin main
vercel ls で確認
```

## ファイル作成
- npx 系インタラクティブ CLI は使わない。Write/Edit/Bash で直接作成する。

## 参照ドキュメント
| ドキュメント | パス |
|-------------|------|
| デザインシステム全仕様 | `docs/DESIGN.md` |
| アーキテクチャ設計書 | `docs/ARCHITECTURAL_BLUEPRINT.md` |
| 差枚数計算仕様 | `docs/tg-medal-calculation.md` |
| モード推定仕様 | `docs/tg-mode-estimation.md` |
| UIレギュレーション | `.claude/commands/ui-regulation.md` |
| スキルファイル | `.claude/skills/nextjs-supabase-app/SKILL.md` |
| Discord連携 作業順序 | `docs/discord/IMPLEMENTATION_ORDER.md` |
| Discord連携 仕様書 | `docs/discord/TGR_DISCORD_INTEGRATION_SPEC.md` |
