# パチスロアプリ 収支入力UI（投資・交換・トータルゲーム数）スキル

**目的**: パチスロ機種の入力アプリにおいて、「投資枚数 / 交換枚数 / トータルゲーム数 / 最終収支」を1画面でユーザーが直感的に入力できる **横展開可能な収支入力ダッシュボードUI** の固定パターンを定義する。

**起点**: TGR Resonance プロジェクト v5.48（2026-06-09）で確定。真打吉宗・北斗の拳・モンキーターン等の他パチスロアプリでもそのまま再現できるよう機種非依存の構造で記述する。

**前提スタック**:
- Next.js 15 App Router + React 19 + TypeScript 5.6+
- Tailwind CSS 3.4
- Zustand 5 + localStorage キャッシュ + Supabase 永続化（任意）

---

## 0. このスキルを読む順序

| セクション | いつ読むか |
|-----------|-----------|
| 1. UX設計原則（絶対遵守） | 最初に必ず |
| 2. ShushiData 型定義 | データ層実装時 |
| 3. セクション色分け定義（デザイントークン） | UI実装時 |
| 4. コンポーネント完全テンプレート | コピペ実装 |
| 5. 親コンポーネント側の組み込み | 統合時 |
| 6. 機種別カスタマイズポイント | 真打吉宗等への適用時 |
| 7. アンチパターン | 全フェーズ |

---

## 1. UX設計原則（絶対遵守）

### 1.1 UIレギュレーション1（全パチスロ入力アプリ共通）

- **`<select>` ドロップダウン禁止**: 数値入力は `type="number"` + `inputMode="numeric"` のみ。
- **`flex-1` で引き伸ばした薄い入力欄禁止**: 全ての入力欄は `py-3` 以上で縦幅を確保。
- **入力フィールドは中央揃え (`text-center`)**: 数値の視認性を最優先。
- **タップフィードバック**: ボタンに `active:scale-95 transition-transform`。

### 1.2 視覚階層原則

- **セクション題名は最も目立たせる**: `text-[13px] font-mono font-black tracking-wider`。
- **サブラベルは目立つbold**: `text-[11px] font-mono font-bold text-gray-700`。
- **補足説明は控えめに**: `text-[9px] text-gray-500`。
- **色分けで意味を伝える**:
  - グレー = 設定（レート）
  - 赤 = マイナス側（投資）
  - 緑 = プラス側（交換・利益）
  - 青 = 情報（ゲーム数等）

### 1.3 入力誘導原則

- **入力後の単位サジェスト**: 値が入っている時のみ、入力欄右側に「枚」「k」「G」を absolute 表示。空欄時は placeholder のみ。
- **派生計算の即時可視化**: 現金投資kを入力したら「= ○○枚」を横に即表示。
- **最終収支プレビュー**: 投資 or 交換のどちらかが入力された瞬間にカラー付きカードで表示（プラス=緑、マイナス=赤）。

### 1.4 構造原則

- **フルスクリーンモーダル**: `fixed inset-0 z-50 flex flex-col bg-gray-100`。タブ切替式UIに被せて使う。
- **固定ヘッダー（黒）+ 固定フッター（黒）+ スクロール本体**: スマホ片手操作で常に「戻る」「保存」が拇指届。
- **`safe-area-top` / `safe-area-bottom`**: iOS ノッチ・ホームインジケーター回避必須。
- **下部 `pb-32`**: フッターに隠れない余白を確保。

---

## 2. ShushiData 型定義

機種非依存。コインレート（貸出枚数）と4つの数値だけで全て計算可能。

```typescript
// src/types/index.ts （または機種別の types に追加）
export interface ShushiData {
  /** 1000円あたりの貸出枚数（46枚貸し=46, 50枚貸し=50） */
  coinRate: number;
  /** 手持ち枚数（貯玉・当日出玉など、現金以外の投入） */
  handCoins: number | null;
  /** 現金投資（k単位: 3 = 3000円） */
  cashInvestK: number | null;
  /** 交換枚数（最終的に持ち帰った枚数） */
  exchangeCoins: number | null;
  /** TOTALゲーム数（液晶メニュー表示の総消化G数）— 集計の実稼働G数算出に使用 */
  totalGames: number | null;
}
```

### 永続化

- Supabase に保存する場合: `shushi JSONB` カラム1つで保持（スキーマ拡張なしで totalGames を後から追加できるメリット大）。
- localStorage キャッシュ → 500ms デバウンス → Supabase 書き込みの順（プロジェクト規約に従う）。

---

## 3. セクション色分け定義（デザイントークン）

```typescript
const SECTION = {
  rate:     { border: "#6b7280", bg: "#f3f4f6", title: "#374151" }, // グレー：設定
  invest:   { border: "#dc2626", bg: "#fef2f2", title: "#991b1b" }, // 赤：投資（マイナス側）
  exchange: { border: "#16a34a", bg: "#f0fdf4", title: "#14532d" }, // 緑：交換（プラス側）
  totalG:   { border: "#2563eb", bg: "#eff6ff", title: "#1e3a8a" }, // 青：情報（ゲーム数）
} as const;
```

各セクションは:
- 外枠: `1.5px solid {border}` + 左ボーダーのみ `5px` で強調 (`borderLeftWidth: "5px"`)
- 題名バー: `backgroundColor: {bg}` + 下境界 `1px solid {border}`
- 各サブラベルの先頭に色付き丸 `●`（`title` 色を流用）

### 入力欄の枠線

各入力欄は **所属セクションと同色** の `border: 1.5px solid {border}` を必ず使う。  
→ どの項目がどのカテゴリか色だけで一目で分かる。

---

## 4. コンポーネント完全テンプレート

`templates/ShushiEditDashboard.tsx` 参照（このスキルディレクトリ内）。  
そのままコピーして `src/components/<machine>/ShushiEditDashboard.tsx` に配置すればOK。

依存: `@/types` で `ShushiData` をインポートしているだけ。Tailwind と React 以外の外部ライブラリ依存ゼロ。

### 構造サマリー

```
<fullscreen modal>
  <header sticky bg-gray-800>
    [一覧へ戻る] [タイトル「収支入力」]
  </header>

  <scroll body space-y-3>
    <SectionCard グレー  title="貸出レート設定">
      1000円 = [○○] 枚
    </SectionCard>

    <SectionCard 赤      title="投資枚数（マイナス側）">
      ● 手持ち枚数 [入力] 枚
      ● 現金投資   [入力] k  = ○○枚
      └ 投資合計（赤バナー、合計>0時のみ）
    </SectionCard>

    <SectionCard 緑      title="交換枚数（プラス側）">
      ● 最終的に持ち帰った枚数 [入力] 枚
    </SectionCard>

    <SectionCard 青      title="トータルゲーム数">
      ● 液晶メニューのTOTAL G数 [入力] G
      ※ 集計の実稼働G数計算に使用
    </SectionCard>

    <最終収支プレビュー（緑 or 赤、いずれかの値が入った時のみ）>
      最終収支
      +N,NNN 枚
      交換 X − 投資 Y
    </最終収支プレビュー>
  </scroll body>

  <footer fixed bottom bg-gray-800>
    [キャンセル] [保存]
  </footer>
</fullscreen modal>
```

---

## 5. 親コンポーネント側の組み込み

### 5.1 起動ボタン

通常時タブ FAB エリア（または該当画面）に緑のピル型ボタン:

```tsx
<button
  onClick={() => setShushiOpen(true)}
  className="flex items-center gap-1 font-mono font-bold text-[13px] px-5 py-3.5 rounded-full active:scale-95 transition-transform"
  style={{
    backgroundColor: "#059669",
    color: "#fff",
    boxShadow: "0 0 0 2px #ffffff, 0 0 14px rgba(5,150,105,0.65), 0 4px 12px rgba(0,0,0,0.3)",
  }}
>
  収支入力
</button>
```

### 5.2 ダッシュボード表示

```tsx
{shushiOpen && (
  <ShushiEditDashboard
    data={session?.shushi ?? null}
    onSave={(data) => {
      updateSessionShushi(data); // Zustand or 親state update
      setShushiOpen(false);
    }}
    onClose={() => setShushiOpen(false)}
  />
)}
```

### 5.3 集計タブとの連動（任意）

集計画面で TOTAL G数 が必要な場合:

```tsx
<SummaryTab
  ...
  shushi={shushi}  // ← ここから totalGames を読む
/>

// SummaryTab 側で:
const rawTotalG = shushi?.totalGames ?? 0;
const realPlayG = rawTotalG > 0 ? rawTotalG - uchidashiG : blocks内合計;
```

→ **集計画面に重複した入力欄を置かないこと**。収支入力を「真実の単一ソース」にする。

---

## 6. 機種別カスタマイズポイント

機種ごとに変えるのはここだけ。それ以外は触らない。

| 項目 | TGR Resonance | 真打吉宗 想定 | 北斗 想定 |
|------|---------------|---------------|-----------|
| ヘッダータイトル | 収支入力 | 収支入力 | 収支入力 |
| 起動ボタンラベル | 収支入力 | 収支入力 | 収支入力 |
| ヘッダー背景色 | `#1f2937` | `#1f2937` | `#1f2937` |
| 保存ボタン色 | `#2563eb` | 機種テーマ色 | 機種テーマ色 |
| `coinRate` デフォルト | 46 | 46 | 46 |
| TOTAL G数 補足 | 「集計タブの実稼働G数計算に使用」 | 同左（変えなくてOK） | 同左 |

**変えてはいけないもの**:
- セクション4色（グレー/赤/緑/青）の意味
- セクションの並び順（レート → 投資 → 交換 → トータルG → 最終収支）
- 入力欄の py-3, text-center, 単位サジェスト挙動
- 最終収支プレビューの計算式 `交換 − (手持ち + 現金k × coinRate)`

---

## 7. アンチパターン

| ❌ NG | ✅ OK |
|------|------|
| 投資・交換・G数を別々のモーダルに分散 | 1画面に統合（このスキル） |
| 入力欄の枠線を全部グレーで統一 | セクション色と同色で意味を持たせる |
| トータルG数を集計タブで別途入力 | 収支入力に集約し集計はそれを参照 |
| サブラベルを `text-gray-500` で薄くする | `text-gray-700 font-bold` で明確に |
| 保存ボタンを画面下部のテキストリンクにする | 黒固定フッターの中央CTAボタンに |
| `<select>` でレート選択 | `<input type="number">` で直接入力 |
| 単位「枚」「k」「G」をプレースホルダ内に書く | 入力後 absolute で右端に表示 |
| 投資合計を常時表示 | 投資>0 の時だけ表示（視覚ノイズ削減） |
| 最終収支を空欄でも表示 | 投資 or 交換のどちらかが入力された時のみ |

---

## 8. 横展開チェックリスト

新規パチスロアプリで実装する際:

- [ ] `ShushiData` 型を `src/types/` に追加（totalGames含む5フィールド）
- [ ] Supabase スキーマ: `shushi JSONB` カラムを sessions テーブルに追加（既存なら不要）
- [ ] `templates/ShushiEditDashboard.tsx` をコピー → `src/components/<machine>/` に配置
- [ ] 親コンポーネント（PlayClientPage 等）に shushiOpen state + 緑FABボタン + モーダル描画
- [ ] Zustand store に `updateSessionShushi(data)` アクションを追加
- [ ] 集計画面の TOTAL G数 入力欄を削除し `shushi.totalGames` 参照に変更
- [ ] 既存セッションの localStorage 旧キー（`<prefix>_totalG_<id>`）を読み取り専用フォールバックとして残す（移行期間）
- [ ] 実機で iOS Safari + Android Chrome の両方で safe-area とキーボード挙動を確認

---

## 9. テンプレートファイル

- `templates/ShushiEditDashboard.tsx` — そのままコピー可能なコンポーネント本体

`@/types` の import パスのみプロジェクトに合わせて調整。それ以外は変更不要。
