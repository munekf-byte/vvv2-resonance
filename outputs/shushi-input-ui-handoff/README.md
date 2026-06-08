# 収支入力UI 移植パッケージ — 真打吉宗担当へ

このディレクトリは、TGR Resonance の収支入力ダッシュボードUIを真打吉宗プロジェクトに移植するための **自己完結パッケージ** です。

## まず読むもの

**`HANDOFF.md`** を最初に読んでください。作業順序（Step 1 → Step 2）が書かれています。

## 中身

```
shushi-input-ui-handoff/
├── README.md                          ← 今読んでるこれ
├── HANDOFF.md                         ← 作業順序・全体指示（最初に読む）
├── SKILL.md                           ← UI設計仕様書（実装時に参照）
└── templates/
    ├── ShushiEditDashboard.tsx        ← コピペ可能なReactコンポーネント本体
    ├── types.ts                       ← ShushiData 型定義スニペット
    └── integration-example.tsx        ← 親画面への組み込みサンプル
```

## 作業フロー（要約）

1. **HANDOFF.md** を読む
2. **Step 1**: 既存コードは触らず、V2 サフィックスで新規実装 → ユーザーに動作確認報告
3. **Step 2**: 報告後、SKILL.md に従って既存スキル・コードを自律的に更新

詳細は HANDOFF.md 参照。
