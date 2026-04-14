# L東京喰種 RESONANCE — 差枚数計算ロジック仕様書

最終更新: 2026-04-14

## 概要

通常時の消費とAT中の獲得を積み上げ計算し、「その瞬間手元に何枚あるべきか」を算出する。

---

## 1. 定数

```
COIN_LOSS_PER_G = 50 / 31   // ≈ 1.613枚/G（50枚あたり約31G回せるコイン持ち）
PURE_INCREASE   = 4.0        // AT純増 約4.0枚/G
INTRO_G         = 10          // 導入エピソード 約10G
INTRO_GAIN      = INTRO_G * PURE_INCREASE  // = 40枚
CZ_G            = 8           // CZ継続 8G固定
CZ_GAIN_PER     = CZ_G * PURE_INCREASE     // = 32枚
```

## 2. 入力変数（アプリのデータから導出）

| 変数 | 取得元 | 説明 |
|------|--------|------|
| `totalNormalG` | `blocks.reduce(jisshuG)` (sum2) | 通常時の実消化G数合計。CZ中のG数は**含まない** |
| `czCount` | イベントが「レミニセンス」or「大喰いの利世」のブロック数 | CZ当選回数 |
| AT初当たり種別 | `block.event` | 通常AT / エピソードボーナス / ロングフリーズ |
| `atSets` | 各ATエントリのSET行数 | 導入パート発生回数 |
| `totalUenose` | BITES + 直乗せ + CCG死神 | AT中の上乗せ合計枚数 |

## 3. 【減算】通常時の消費枚数

```
Total_Loss = totalNormalG × COIN_LOSS_PER_G
```

- `totalNormalG` = ユーザーが各周期に入力した実G数の合算
- CZ中の8Gはユーザー入力に含まれないため二重計上の心配なし
- CZはベルナビ発生（AT同等の純増区間）のため、消費側ではなく**増加側で処理**

## 4. 【加算】AT中 + CZ中の獲得枚数

```
Total_Gain = Σ(ATエントリごと: Base + Intro + Uenose) + CZ_Gain
```

### 4-1. ATエントリごとの獲得

| 要素 | 計算 |
|------|------|
| **ベース枚数 (Base)** | 通常AT: **150枚** / エピボ経由: **250枚** / ロンフリ経由: **2000枚** |
| **導入パート (Intro)** | `setCount × 40枚` (SET数 × INTRO_GAIN) |
| **上乗せ (Uenose)** | `bitesTotal + directTotal + ccgTotal` |

- `bitesTotal`: 各SET行のBITES獲得枚数合算（"ED"・空 = 0）
- `directTotal`: 各SET行の直乗せ枚数合算
- `ccgTotal`: 有馬ジャッジメント成功時のccgCoins合算

### 4-2. CZ獲得

```
CZ_Gain = czCount × 32枚  (8G × 4.0枚/G)
```

## 5. 【最終計算】差枚数

```
Final_Result = Total_Gain - Total_Loss
```

正なら出玉プラス、負ならマイナス。

### ED（エンディング）発生時

- 有利区間完走時は積み上げ計算と実際の払い出しに乖離が生じる
- `bitesCoins = "ED"` をトリガーとし、液晶表示の最終獲得枚数で強制上書き（Override）する予定
- **現時点では未実装（誤差として許容）。EDダッシュボード改編時に対応**

## 6. 計算例

3000G消化、CZ 8回、AT 2回（通常AT + エピボ）の場合:

```
Total_Loss = 3000 × 1.613 = 4,839枚

AT1 (通常AT, 3set, BITES合計600, 直乗せ100):
  = 150 + (3×40) + 600 + 100 = 970枚

AT2 (エピボ, 2set, BITES合計400, CCG500):
  = 250 + (2×40) + 400 + 500 = 1,230枚

CZ_Gain = 8 × 32 = 256枚

Total_Gain = 970 + 1,230 + 256 = 2,456枚

Final_Result = 2,456 - 4,839 = -2,383枚
```
