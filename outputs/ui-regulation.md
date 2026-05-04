# UIデザインにおけるレギュレーション1（パチスロ入力アプリ共通）

このルールはパチスロ機種の入力アプリケーションを作成・改修するすべての場面で**半永久的に適用**される。

---

## 禁止事項（NG）

**横長で縦幅が薄い `<select>` ドロップダウンを一切使用してはならない。**

スマホで押しにくいため。以下はすべて禁止：

- `<select>` 要素によるプルダウン
- `flex-1` で横に引き伸ばされた縦幅の薄いボタン（py-1〜py-2 程度）
- 縦に並んだ複数の `<select>` スロット（MultiSelectSection パターン）

---

## 必須事項（OK）

**ユーザーがタップするすべての選択肢は、縦横の長さを確保した四角いボタン形式にレイアウトする。**

### ボタングリッドの実装パターン

```tsx
// ✅ 正解: グリッドで四角いボタン
<div className="grid grid-cols-4 gap-2">
  {OPTIONS.map((opt) => (
    <button
      key={opt}
      onClick={() => setValue(opt)}
      className="py-3 rounded font-mono font-bold transition-all active:scale-95 text-center"
      style={
        value === opt
          ? { ...colorFn(opt), boxShadow: "0 0 0 2px #1f2937" }
          : { backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }
      }
    >
      {opt}
    </button>
  ))}
</div>

// ❌ 禁止: select ドロップダウン
<select value={value} onChange={(e) => setValue(e.target.value)}>
  {OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
</select>
```

---

## グリッド列数の目安

| 選択肢数 | 推奨 cols | 備考 |
|---------|-----------|------|
| 2〜3個  | `grid-cols-2` or `grid-cols-3` | 大きなボタン |
| 4〜5個  | `grid-cols-4` or `grid-cols-5` | 標準 |
| 6〜8個  | `grid-cols-4` (2行) | 読みやすい |
| 9〜12個 | `grid-cols-3` or `grid-cols-4` | 複数行 |
| 13個以上 | `grid-cols-4` + 短縮ラベル | 省略表記を使う |

---

## ボタンスタイル統一仕様

```tsx
// 未選択
{ backgroundColor: "#f3f4f6", color: "#6b7280", border: "2px solid #e5e7eb" }

// 選択済み (色はカテゴリ依存、boxShadow は共通)
{ ...categoryColor, boxShadow: "0 0 0 2px #1f2937" }

// クラス (共通)
"py-3 rounded font-mono font-bold transition-all active:scale-95 text-center"
```

---

## ラベル表示ルール

- 選択肢テキストが長い場合は**短縮ラベル**（abbrev 関数）を使用
- ボタン内に2行表示する場合: 上段 `text-[10px]`、下段 `text-[7px] opacity-75`
- `<select>` の `<option>` テキストをそのままボタンラベルに使ってはならない（長すぎる場合は省略）

---

## multi-toggle の実装

複数選択可能な項目（赫眼・精神世界・招待状など）はトグルボタンで実装する。

```tsx
function toggleMulti(field: string, value: string) {
  const current = form[field] as string[];
  setField(field, current.includes(value)
    ? current.filter((v) => v !== value)
    : [...current, value]
  );
}
```

---

## 適用確認チェックリスト

新機能追加・改修の際は以下を確認すること：

- [ ] `<select>` 要素が存在しないか
- [ ] 全選択肢がボタングリッドで表示されているか  
- [ ] `py-3` 以上の縦幅が確保されているか
- [ ] 選択状態が `boxShadow` で明示されているか
- [ ] ラベルが短縮表記になっているか（長文の場合）
- [ ] `active:scale-95` によるタップフィードバックがあるか
