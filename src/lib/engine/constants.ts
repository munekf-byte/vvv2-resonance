// =============================================================================
// TOKYO GHOUL RESONANCE: 全選択肢定数
// =============================================================================

export const TG_ZONES = [
  "不明",
  "50", "100", "150", "200", "250", "300", "400", "500", "600",
  "50or100",
  "200以内", "300以内",
  "200以上", "300以上",
  "300 or 400", "400 or 500", "500 or 600",
  "600否定",
] as const;

export const TG_MODES = [
  "不明",
  "朝一モード",
  "通常A: 最大天井 600G",
  "通常B: 最大天井 600G",
  "通常C: 最大天井 500G",
  "チャンス: 最大天井 600G",
  "天国準備: 最大天井 300G",
  "天国: 最大天井 100G",
] as const;

export const TG_WIN_TRIGGERS = [
  "不明",
  "ゲーム数",
  "ゲーム数orレア役",
  "🍉加算 ゲーム数",
  "強チェリー",
  "チャンス目",
  "弱チェリー",
  "確定チェリー",
  "精神世界",
  "精神世界 [赫眼]",
  "直撃",
  "AT間天井",
] as const;

export const TG_EVENTS = [
  "レミニセンス",
  "大喰いの利世",
  "エピソードボーナス",
  "直撃AT",
  "引き戻し",
  "ロングフリーズ",
] as const;

// AT初当り: "AT Get" のみ。表示時は AT1/AT2... に自動変換。
export const TG_AT_WIN_VALUE = "AT Get" as const;

export const TG_ENDING_SUGGESTIONS = [
  "[cz失敗] 金木研 - デフォルト",
  "[cz失敗] 霧嶋董香 - 通常B以上示唆",
  "[cz失敗] 笛口雛実 - 通常B以上示唆",
  "[cz失敗] 亜門鋼太朗 - 通常B以上濃厚",
  "[cz失敗] 真戸呉緒 - 通常C以上濃厚",
  "[cz失敗] 金木研（喰種） - チャンス以上濃厚",
  "[cz失敗] 霧嶋董香（喰種） - チャンス以上濃厚",
  "[cz失敗] 月山習 - 天国準備以上濃厚",
  "[cz失敗] 神代利世 - 天国濃厚",
  "[cz失敗] 鈴屋什造 - 偶数設定濃厚",
  "[cz失敗] 梟 - 設定4以上濃厚",
  "[cz失敗] 有馬貴将 - 設定6濃厚",
  "[終了画面] 金木研 - デフォルト",
  "[終了画面] 亜門鋼太朗＆真戸暁 - 奇数設定示唆",
  "[終了画面] 鈴屋什造＆篠原幸紀 - 偶数設定示唆",
  "[終了画面] 神代利世 - 設定1否定",
  "[終了画面] 笛口雛実＆笛口リョーコ - 高設定示唆［弱］",
  "[終了画面] 四方蓮示＆イトリ＆ウタ - 高設定示唆［強］",
  "[終了画面] 金木研＆霧嶋董香 - 設定4以上濃厚",
  "[終了画面] あんていく全員集合 - 設定6濃厚",
] as const;

export const TG_TROPHIES = [
  "[終了画面] 銅トロフィー - 設定2以上濃厚",
  "[終了画面] 銀トロフィー - 設定3以上濃厚",
  "[終了画面] 金トロフィー - 設定4以上濃厚",
  "[終了画面] 喰種柄トロフィー - 設定5以上濃厚",
  "[終了画面] 虹トロフィー - 設定6濃厚",
  "[終了画面] 黒トロフィー - 次回トロフィー出現濃厚",
] as const;

export const TG_KAKUGAN = [
  "赫眼10G",
  "赫眼20G",
  "赫眼30G",
  "赫眼50G",
] as const;

export const TG_SHINSEKAI = [
  "精神13G",
  "精神23G",
  "精神33G",
] as const;

// 格納値 = 短縮形 (表示もこのまま使用)
export const TG_INVITATIONS = [
  "今夜ディ - デフォルト",
  "パーティーの - 規定G数を示唆",
  "1時35分 - 残り100G or 300G or 500G以内示唆",
  "2時46分 - 残り200G or 400G or 600G以内示唆",
  "最悪の - 600G否定",
  "喰うか喰 - 残り200G以内or 500G以上示唆",
  "3時までに - 残り300G以内濃厚",
  "2時までに - 残り200G以内濃厚",
  "今すぐ - 残り100G以内濃厚",
  "偶には - 偶数設定期待度UP",
  "不思議な - 設定1否定",
  "活字中毒 - 設定2否定",
  "本は良い - 設定3否定",
  "僕とした - 設定4否定",
  "存分に - 設定4以上濃厚",
  "特別な夜 - 設定6濃厚",
] as const;

export const TG_EYECATCH = [
  "金木研",
  "霧嶋董香",
  "笛口雛実",
  "月山習",
  "神代利世",
  "赫眼/喰種ver.",
] as const;

// =============================================================================
// AT記録 定数
// =============================================================================

export const TG_AT_TYPES = [
  "通常AT",
  "裏AT",
  "隠れ裏AT（推測）",
] as const;

export const TG_AT_CHARACTERS = [
  "鯱", "絢都", "ヤモリ", "特等ら", "亜門", "有馬", "EDボナ",
] as const;

export const TG_BATTLE_TRIGGERS = [
  "15G", "30G", "45G", "60G", "75G", "90G", "150G",
  "強🍒・チャ目", "弱🍒", "🍉", "[赫眼]レア役", "[喰ポイント]解放",
] as const;

export const TG_DISADVANTAGE = ["-", "不利益⭕️", "不利益❌"] as const;

export const TG_BITES_TYPES = [
  "Table:A [50/100/200/300/500]",
  "Table:B [50/50/500/500/1000]",
  "Table:C [100/200/300/500/1000]",
  "Table:D [100/100/500/1000/2000]",
  "Table:E [200/300/500/1000/2000]",
  "Table:超 [300/500/1000/2000/3000]",
  "Table:極 [2000/ED]",
  "百足覚醒",
  "隻眼の梟",
] as const;

export const TG_BITES_COINS = [
  "50", "100", "200", "300", "500", "1000", "2000", "3000", "ED",
] as const;

export const TG_DIRECT_ADD_TRIGGERS = [
  "弱🍒", "🍉", "チャ目", "強🍒", "確定🍒", "後乗せ",
] as const;

/** 直乗せ1番目のみの追加選択肢 */
export const TG_DIRECT_ADD_TRIGGERS_FIRST = [
  "エピボ中", "開始エピ中", "弱🍒", "🍉", "チャ目", "強🍒", "確定🍒", "後乗せ",
] as const;

export const TG_DIRECT_ADD_COINS = [10, 20, 30, 50, 100, 200, 300, 500] as const;

export const TG_ARIMA_RESULTS = ["成功", "失敗"] as const;

export const TG_ARIMA_ROLES = ["小役ナシ", "リプレイ", "レア役"] as const;

export const TG_CCG_COINS = [300, 500, 1000, 2000] as const;

export const TG_FAVORABLE_CUT = ["-", "切断[ED]", "切断[推定]"] as const;

/** 対決成績の最大枠数 */
export const TG_MAX_BATTLE_RESULTS = 10;

/** 直乗せの最大スロット数 */
export const TG_MAX_DIRECT_ADDS = 10;

/** 対決成績列ヘッダー (15G刻み × 10回) */
export const TG_BATTLE_RESULT_HEADERS = [
  "15", "30", "45", "60", "75", "90", "105", "120", "135", "150",
] as const;

// 前兆履歴: ゾーンごとのスロット方式
// 格納値フォーマット: "ゾーン:タイプ" (例: "100:東京上空")
export const TG_ZENCHO_ZONES = [
  "50", "100", "150", "200", "250", "300", "400", "500", "600",
] as const;

export const TG_ZENCHO_TYPES = [
  "前兆",
  "東京上空",
  "前兆なし",
] as const;

// =============================================================================
// エンディングカード定数
// =============================================================================

/** エンディングカード — 白/青/赤カードの表示ラベル・カラー・出現キャラ */
export const TG_ENDING_CARD_LABELS = [
  {
    key: "whiteWeak", label: "【白カード】奇数設定示唆〔弱〕",
    color: "#e0e0e0", textColor: "#424242",
    characters: ["金木研", "霧嶋董香", "笛口雛実", "永近英良", "西尾錦", "月山習"],
  },
  {
    key: "whiteStrong", label: "【白カード】奇数設定示唆〔強〕",
    color: "#bdbdbd", textColor: "#212121",
    characters: ["芳村", "四方蓮示", "ウタ", "イトリ", "古間円児", "入見カヤ"],
  },
  {
    key: "blueWeak", label: "【青カード】偶数設定示唆〔弱〕",
    color: "#90caf9", textColor: "#0d47a1",
    characters: ["金木研", "霧嶋董香", "笛口雛実", "ナキ", "西尾錦", "月山習"],
  },
  {
    key: "blueStrong", label: "【青カード】偶数設定示唆〔強〕",
    color: "#1565c0", textColor: "#ffffff",
    characters: ["亜門鋼太朗", "篠原幸紀", "滝澤政道", "真戸暁", "真戸呉緒", "丸手斎"],
  },
  {
    key: "redWeak", label: "【赤カード】高設定示唆〔弱〕",
    color: "#ef9a9a", textColor: "#b71c1c",
    characters: ["鯱", "亜門鋼太朗", "篠原幸紀", "鈴屋什造"],
  },
  {
    key: "redStrong", label: "【赤カード】高設定示唆〔強〕",
    color: "#c62828", textColor: "#ffffff",
    characters: ["鯱", "亜門鋼太朗", "篠原幸紀", "鈴屋什造"],
  },
] as const;

/** 銅カード (ad-22/23) */
export const TG_COPPER_CARD_TYPES = [
  { key: "copper1", label: "【銅】設定1否定", character: "鈴屋什造", color: "#a1887f", textColor: "#fff" },
  { key: "copper2", label: "【銅】設定2否定", character: "高槻泉",   color: "#8d6e63", textColor: "#fff" },
  { key: "copper3", label: "【銅】設定3否定", character: "梟",       color: "#795548", textColor: "#fff" },
  { key: "copper4", label: "【銅】設定4否定", character: "エト",     color: "#4e342e", textColor: "#fff" },
] as const;

/** 確定カード (ad-24〜28) */
export const TG_CONFIRMED_CARD_TYPES = [
  { key: "confirmed1", label: "【銀】設定3以上濃厚", character: "金木研",   color: "#9e9e9e", textColor: "#fff", rainbow: false },
  { key: "confirmed2", label: "【金】設定4以上濃厚", character: "神代利世", color: "#f9a825", textColor: "#000", rainbow: false },
  { key: "confirmed3", label: "【金】設定5以上濃厚", character: "隻眼の梟", color: "#e65100", textColor: "#fff", rainbow: false },
  { key: "confirmed4", label: "【虹】設定6濃厚",    character: "有馬貴将", color: "#9333ea", textColor: "#fff", rainbow: true  },
] as const;
