# 『L 東京喰種』モード推定アルゴリズム完全実装仕様書 (Ver 2.0)

v2.0: ベイズ尤度更新方式に全面移行（v4.39〜）
旧方式（confirm/boost）→ 新方式（likelihood × Bayesian normalization）

この仕様書は、単なる説明資料ではなく、そのままプログラミングの設計図として機能するように構成されています。

---

## 1. モード定義と不転落Stateモデル

本機の核心は**「天国モードに到達するまでモード転落がない」**という点です。これを「Block（初当たり間の区間）」を跨ぐ状態遷移として定義します。

### 1.1 滞在モード定義 (Mode Registry)

| モード (id) | 天井G数 | 特徴 |
|---|---|---|
| MODE_A | 600G | 基本モード |
| MODE_B | 600G | 100G/300G/500Gがチャンス |
| MODE_C | 500G | 天井が低い。200G/400Gがチャンス |
| MODE_CH | 600G | 規定G数当選期待度が高い |
| MODE_PRE | 300G | 天国への足掛かり。150G/200Gがチャンス |
| MODE_HEAVEN | 100G | 100G以内に必ず当選 |

### 1.2 ブロック間遷移ロジック (Inheritance Logic)

- **CZ失敗時**: Block(N) の事後確率を Block(N+1) の事前確率として継承。ただし、前ブロックで否定された下位モードの確率は 0% を維持する。
- **AT終了時**: モード再抽選。全確率をリセットし、設定別のデフォルト事前確率を適用。

---

## 2. 前兆挙動による確定判定マトリクス (Hard Constraints)

ユーザーが入力を完了した時点で、以下の表に基づき該当しないモードの確率を「0」に、濃厚なモードを「1.0」に強制上書き（Override）します。

### 前兆フラグ判定テーブル

| 液晶ゲーム数 | 前兆なし (None) | 前兆ステージ移行 (Stage) | ステージ非移行 (NoStage) |
|---|---|---|---|
| 50G | (Default) | HEAVEN 濃厚 | CH以上 濃厚 |
| 100G | PRE 濃厚 | (Default) | PRE 濃厚 |
| 150G | B以上 期待 | 本前兆濃厚 | B以上 濃厚 |
| 200G | PRE 濃厚 | (Default) | B以上 期待度UP |
| 250G | C以上 濃厚 | 本前兆濃厚 | C以上 濃厚 |
| 300G | **CH 濃厚** | (Default) | CH 濃厚 |
| 400G | C 濃厚 | (Default) | (Default) |
| 500G | **CH 濃厚** | (Default) | CH 濃厚 |
| 600G | - | 本前兆濃厚 | 本前兆濃厚 |

> **v4.36更新**: 300G/500G + 前兆なし → CH濃厚に修正（旧Defaultは誤り）
> アイキャッチは複数記録対応（string → string[]）

---

## 3. 示唆演出による補正ロジック (Soft & Hard Logic)

### 3.1 アイキャッチ (当該ブロックに即時適用)

入力されたアイキャッチキャラに基づき、モード期待度を補正します。

- **金木研**: 補正なし
- **霧嶋董香**: B以上の重みを加算
- **笛口雛実**: C以上の重みを加算
- **月山習 / 神代利世**: 本前兆期待度UP（計算上の当選率を一時補正）
- **赫眼/喰種ver. (全キャラ)**: 100G以内当選濃厚 → HEAVEN を 100% に固定

### 3.2 招待状 (残りゲーム数制限)

現在の「液晶ゲーム数」と「招待状の内容」を比較し、天井が範囲外のモードを排除します。

- **「最悪の事態にはならない」**: 600G天井モード (A, B, CH) を否定
- **「3時までに」**: 残り300G以内
- **「2時までに」**: 残り200G以内
- **「今すぐ」**: 残り100G以内

### 3.3 CZエンドカード (次ブロックの事前確率に適用)

> **重要**: この項目は、現在のブロックではなく、**次のブロックの初期値**を決定します。

- **亜門鋼太朗**: 次回 B以上 濃厚
- **真戸呉緒**: 次回 C以上 濃厚
- **金木研/霧嶋董香(喰種)**: 次回 CH以上 濃厚
- **月山習**: 次回 PRE以上 濃厚
- **神代利世**: 次回 HEAVEN 濃厚

---

## 4. プログラム実装モデル (JavaScript向け構造)

```javascript
/**
 * L東京喰種 モード推定エンジン
 */
class GhoulModeAnalyzer {
  constructor() {
    this.MODES = ['A', 'B', 'C', 'CH', 'PRE', 'HEAVEN'];
    this.priorProbs = { A: 0.4, B: 0.2, C: 0.1, CH: 0.15, PRE: 0.1, HEAVEN: 0.05 }; // デフォルト
  }

  /**
   * ブロックごとのモード計算
   * @param {Object} blockData - アプリから渡される1区間のデータ
   * @param {Object} inheritedProbs - 前ブロックからの継承確率
   */
  analyzeBlock(blockData, inheritedProbs = null) {
    let currentProbs = inheritedProbs || { ...this.priorProbs };

    // 1. 招待状による範囲制限 (Hard)
    currentProbs = this.applyLetterConstraint(currentProbs, blockData.letter, blockData.currentG);

    // 2. アイキャッチによる補正 (Soft/Hard)
    currentProbs = this.applyEyeCatch(currentProbs, blockData.eyeCatch);

    // 3. 前兆履歴による確定判定 (Hard Override)
    currentProbs = this.applyZenshoLogic(currentProbs, blockData.zenshoHistory);

    // 4. 結果の正規化
    return this.normalize(currentProbs);
  }

  /**
   * CZ失敗後のエンドカード処理
   * 次ブロックの計算が始まる前に事前確率を書き換える
   */
  getInitialProbsForNextBlock(endCard) {
    let nextProbs = { ...this.priorProbs };
    if (endCard === 'MADOWO') return this.filterBelow(nextProbs, 'C');
    if (endCard === 'RIZE') return { HEAVEN: 1.0, others: 0 };
    // ...各カードのロジック
    return nextProbs;
  }
}
```

---

## 5. 精度向上のための追加アドバイス

### 「スイカ加算」の逆算
ユーザーが「実ゲーム数」と「液晶ゲーム数」を両方入力できる場合、その差分から「スイカ成立回数」を推定し、それが高設定（設定差あり）の推測に寄与するロジックを将来的に拡張できるよう、変数を用意しておくべきです。

### 「前兆被り」の除外
強レア役（強チェリー・チャンス目）を引いた直後の規定ゲーム数前兆は、レア役による前兆と混同されるため、ロジック上で「レア役成立後○G以内」の前兆履歴は重みを下げる（あるいは無視する）処理を入れると、ノイズが減り精度が上がります。

### 不転落の「記憶」
アプリ側では、前回のブロックで「通常B以上濃厚」と出た場合、今回のブロックでどれだけAっぽい挙動をしても、Aを0%に固定し続ける「永続フラグ」をStateに持たせてください。
