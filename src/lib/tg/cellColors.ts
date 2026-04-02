// =============================================================================
// TOKYO GHOUL RESONANCE: セル配色 (hex ベース inline style)
// =============================================================================

export interface CellColor {
  backgroundColor: string;
  color: string;
}

const BLK  = "#1a1a1a";
const WHT  = "#ffffff";
const DARK_BLUE = "#1a237e";
const GRAY_DEFAULT: CellColor = { backgroundColor: "#d1d1d1", color: BLK };
const EMPTY_CELL: CellColor   = { backgroundColor: "#f3f4f6", color: "#9ca3af" };

// ─── ゾーン ──────────────────────────────────────────────────────────────────

const ZONE_MAP: Record<string, CellColor> = {
  "不明":         { backgroundColor: "#d1d1d1", color: BLK },
  "50":           { backgroundColor: "#5ec0fc", color: "#0a53a8" },
  "100":          { backgroundColor: "#5ec0fc", color: "#0a53a8" },
  "150":          { backgroundColor: "#ffe5a0", color: BLK },
  "200":          { backgroundColor: "#ffe5a0", color: BLK },
  "250":          { backgroundColor: "#ffe5a0", color: BLK },
  "300":          { backgroundColor: "#ffe5a0", color: BLK },
  "400":          { backgroundColor: "#fdb68f", color: BLK },
  "500":          { backgroundColor: "#fdb68f", color: BLK },
  "600":          { backgroundColor: "#ffbdb4", color: BLK },
  "50or100":      { backgroundColor: "#5ec0fc", color: "#0a53a8" },
  "200以内":      { backgroundColor: "#ffe5a0", color: BLK },
  "300以内":      { backgroundColor: "#ffe5a0", color: BLK },
  "200以上":      { backgroundColor: "#ffe5a0", color: BLK },
  "300以上":      { backgroundColor: "#fdb68f", color: BLK },
  "300 or 400":   { backgroundColor: "#fdb68f", color: BLK },
  "400 or 500":   { backgroundColor: "#fdb68f", color: BLK },
  "500 or 600":   { backgroundColor: "#ffbdb4", color: BLK },
  "600否定":      { backgroundColor: "#ffbdb4", color: BLK },
};

export function getZoneCellColor(zone: string): CellColor {
  return ZONE_MAP[zone] ?? GRAY_DEFAULT;
}

// ─── モード ──────────────────────────────────────────────────────────────────

const MODE_MAP: Record<string, CellColor> = {
  "不明":                    { backgroundColor: "#d1d1d1", color: BLK },
  "朝一モード":              { backgroundColor: "#b6d7a8", color: BLK },
  "通常A: 最大天井 600G":    { backgroundColor: "#f4cccc", color: BLK },
  "通常B: 最大天井 600G":    { backgroundColor: "#fff2cc", color: BLK },
  "通常C: 最大天井 500G":    { backgroundColor: "#fff2cc", color: BLK },
  "チャンス: 最大天井 600G": { backgroundColor: "#cfe2f3", color: BLK },
  "天国準備: 最大天井 300G": { backgroundColor: "#cfe2f3", color: BLK },
  "天国: 最大天井 100G":     { backgroundColor: "#a4c2f4", color: DARK_BLUE },
};

export function getModeCellColor(mode: string): CellColor {
  return MODE_MAP[mode] ?? GRAY_DEFAULT;
}

export function abbrevMode(mode: string): string {
  if (!mode || mode === "不明") return "—";
  if (mode.startsWith("通常A")) return "通A";
  if (mode.startsWith("通常B")) return "通B";
  if (mode.startsWith("通常C")) return "通C";
  if (mode.startsWith("チャンス")) return "チャンス";
  if (mode.startsWith("天国準備")) return "天国P";
  if (mode.startsWith("天国")) return "天国";
  if (mode.startsWith("朝一")) return "朝一";
  return mode.slice(0, 4);
}

// ─── 当選契機 ────────────────────────────────────────────────────────────────

const TRIGGER_MAP: Record<string, CellColor> = {
  "不明":               { backgroundColor: "#d1d1d1", color: BLK },
  "ゲーム数":           { backgroundColor: "#ffe5a0", color: BLK },
  "ゲーム数orレア役":   { backgroundColor: "#fdf485", color: BLK },
  "🍉加算 ゲーム数":    { backgroundColor: "#fdf485", color: BLK },
  "強チェリー":         { backgroundColor: "#f9cb9c", color: BLK },
  "チャンス目":         { backgroundColor: "#f9cb9c", color: BLK },
  "弱チェリー":         { backgroundColor: "#cc0000", color: WHT },
  "確定チェリー":       { backgroundColor: "#351c75", color: WHT },
  "精神世界":           { backgroundColor: "#d9d2e9", color: BLK },
  "精神世界 [赫眼]":    { backgroundColor: "#d9d2e9", color: BLK },
  "直撃":               { backgroundColor: "#cc0000", color: WHT },
};

export function getTriggerCellColor(trigger: string): CellColor {
  return TRIGGER_MAP[trigger] ?? GRAY_DEFAULT;
}

export function abbrevTrigger(t: string): string {
  if (!t || t === "不明") return "—";
  const map: Record<string, string> = {
    "ゲーム数": "G数",
    "ゲーム数orレア役": "G/レア",
    "🍉加算 ゲーム数": "🍉G",
    "強チェリー": "強チェ",
    "チャンス目": "ﾁｬﾝｽ目",
    "弱チェリー": "弱チェ",
    "確定チェリー": "確チェ",
    "精神世界": "精神",
    "精神世界 [赫眼]": "精神[赫]",
    "直撃": "直撃",
  };
  return map[t] ?? t;
}

// ─── イベント ────────────────────────────────────────────────────────────────

const EVENT_MAP: Record<string, CellColor> = {
  "レミニセンス":       { backgroundColor: "#0f913c", color: WHT },
  "大喰いの利世":       { backgroundColor: "#cf5858", color: WHT },
  "エピソードボーナス": { backgroundColor: "#fdff00", color: BLK },
  "直撃AT":            { backgroundColor: "#cc0000", color: WHT },
  "引き戻し":          { backgroundColor: "#e06666", color: WHT },
  "ロングフリーズ":    { backgroundColor: "#000000", color: WHT },
};

export function getEventCellColor(event: string): CellColor {
  if (!event) return EMPTY_CELL;
  return EVENT_MAP[event] ?? GRAY_DEFAULT;
}

export function abbrevEvent(e: string): string {
  if (!e) return "—";
  const map: Record<string, string> = {
    "レミニセンス": "レミニ",
    "大喰いの利世": "利世",
    "エピソードボーナス": "EP-B",
    "直撃AT": "直AT",
    "引き戻し": "引戻",
    "ロングフリーズ": "LF",
  };
  return map[e] ?? e;
}

// ─── AT初当り ────────────────────────────────────────────────────────────────

export const AT_WIN_COLOR:  CellColor = { backgroundColor: "#38761d", color: WHT };
export const AT_NONE_COLOR: CellColor = EMPTY_CELL;

// ─── 終了画面示唆 ────────────────────────────────────────────────────────────

const ENDING_MAP: Record<string, CellColor> = {
  "[cz失敗] 金木研 - デフォルト":                        { backgroundColor: "#d1d1d1", color: BLK },
  "[cz失敗] 霧嶋董香 - 通常B以上示唆":                  { backgroundColor: "#d1d1d1", color: BLK },
  "[cz失敗] 笛口雛実 - 通常B以上示唆":                  { backgroundColor: "#d1d1d1", color: BLK },
  "[cz失敗] 亜門鋼太朗 - 通常B以上濃厚":                { backgroundColor: "#d1d1d1", color: BLK },
  "[cz失敗] 真戸呉緒 - 通常C以上濃厚":                  { backgroundColor: "#d1d1d1", color: BLK },
  "[cz失敗] 金木研（喰種） - チャンス以上濃厚":          { backgroundColor: "#d1d1d1", color: BLK },
  "[cz失敗] 霧嶋董香（喰種） - チャンス以上濃厚":        { backgroundColor: "#d1d1d1", color: BLK },
  "[cz失敗] 月山習 - 天国準備以上濃厚":                  { backgroundColor: "#d1d1d1", color: BLK },
  "[cz失敗] 神代利世 - 天国濃厚":                        { backgroundColor: "#d1d1d1", color: BLK },
  "[cz失敗] 鈴屋什造 - 偶数設定濃厚":                   { backgroundColor: "#fce5cd", color: BLK },
  "[cz失敗] 梟 - 設定4以上濃厚":                        { backgroundColor: "#ff0000", color: WHT },
  "[cz失敗] 有馬貴将 - 設定6濃厚":                      { backgroundColor: "#ffff00", color: BLK },
  "[終了画面] 金木研 - デフォルト":                      { backgroundColor: "#d1d1d1", color: BLK },
  "[終了画面] 亜門鋼太朗＆真戸暁 - 奇数設定示唆":        { backgroundColor: "#c9daf8", color: BLK },
  "[終了画面] 鈴屋什造＆篠原幸紀 - 偶数設定示唆":        { backgroundColor: "#fce5cd", color: BLK },
  "[終了画面] 神代利世 - 設定1否定":                     { backgroundColor: "#b4a7d6", color: BLK },
  "[終了画面] 笛口雛実＆笛口リョーコ - 高設定示唆［弱］": { backgroundColor: "#f4cccc", color: BLK },
  "[終了画面] 四方蓮示＆イトリ＆ウタ - 高設定示唆［強］": { backgroundColor: "#e06666", color: WHT },
  "[終了画面] 金木研＆霧嶋董香 - 設定4以上濃厚":         { backgroundColor: "#ff0000", color: WHT },
  "[終了画面] あんていく全員集合 - 設定6濃厚":           { backgroundColor: "#ffff00", color: BLK },
};

export function getEndingCellColor(value: string): CellColor {
  return ENDING_MAP[value] ?? GRAY_DEFAULT;
}

// ─── トロフィー ───────────────────────────────────────────────────────────────

const TROPHY_MAP: Record<string, CellColor> = {
  "[終了画面] 銅トロフィー - 設定2以上濃厚":          { backgroundColor: "#b4a7d6", color: BLK },
  "[終了画面] 銀トロフィー - 設定3以上濃厚":          { backgroundColor: "#e06666", color: WHT },
  "[終了画面] 金トロフィー - 設定4以上濃厚":          { backgroundColor: "#ff0000", color: WHT },
  "[終了画面] 喰種柄トロフィー - 設定5以上濃厚":      { backgroundColor: "#ff0000", color: WHT },
  "[終了画面] 虹トロフィー - 設定6濃厚":             { backgroundColor: "#ffff00", color: BLK },
  "[終了画面] 黒トロフィー - 次回トロフィー出現濃厚": { backgroundColor: "#d1d1d1", color: BLK },
};

export function getTrophyCellColor(value: string): CellColor {
  return TROPHY_MAP[value] ?? GRAY_DEFAULT;
}

/** 終了画面示唆またはトロフィーのどちらか存在する方の色を返す */
export function getSuggestionOrTrophyColor(ending: string, trophy: string): CellColor {
  if (ending) return getEndingCellColor(ending);
  if (trophy) return getTrophyCellColor(trophy);
  return EMPTY_CELL;
}

// ─── 赫眼 ────────────────────────────────────────────────────────────────────

export const KAKUGAN_COLOR: CellColor = { backgroundColor: "#b10202", color: WHT };

export function getKakuganCellColor(_value: string): CellColor {
  return KAKUGAN_COLOR;
}

// ─── 精神世界 ────────────────────────────────────────────────────────────────

const SHINSEKAI_MAP: Record<string, CellColor> = {
  "精神13G": { backgroundColor: "#e6cff2", color: BLK },
  "精神23G": { backgroundColor: "#e6cff2", color: BLK },
  "精神33G": { backgroundColor: "#5a3286", color: WHT },
};

export function getShinsekaiCellColor(value: string): CellColor {
  return SHINSEKAI_MAP[value] ?? GRAY_DEFAULT;
}

// ─── 招待状 (ヒントベース) ────────────────────────────────────────────────────

export function getInvitationCellColor(value: string): CellColor {
  if (!value) return EMPTY_CELL;
  const hint = getHintFromValue(value);
  if (hint.includes("設定6")) return { backgroundColor: "#ffff00", color: BLK };
  if (hint.includes("設定4以上")) return { backgroundColor: "#ff0000", color: WHT };
  if (hint.includes("設定4否定") || hint.includes("設定3否定") ||
      hint.includes("設定2否定") || hint.includes("設定1否定")) {
    return { backgroundColor: "#b4a7d6", color: BLK };
  }
  if (hint.includes("偶数設定期待度UP")) return { backgroundColor: "#fce5cd", color: BLK };
  if (hint.includes("残り")) return { backgroundColor: "#cfe2f3", color: BLK };
  if (hint.includes("600G否定")) return { backgroundColor: "#d1d1d1", color: BLK };
  if (hint.includes("規定G数")) return { backgroundColor: "#cfe2f3", color: BLK };
  return GRAY_DEFAULT;
}

// ─── 表示ヘルパー ─────────────────────────────────────────────────────────────

/** " - " 以降をヒントとして返す */
export function getHintFromValue(value: string): string {
  const idx = value.indexOf(" - ");
  return idx !== -1 ? value.slice(idx + 3).trim() : value.trim();
}

/**
 * プルダウン表示ラベル: " - " より前の部分のみ
 * 例) "[cz失敗] 金木研 - デフォルト" → "[cz失敗] 金木研"
 */
export function getSuggestionDropdownLabel(value: string): string {
  if (!value) return "なし";
  const idx = value.indexOf(" - ");
  return idx !== -1 ? value.slice(0, idx).trim() : value;
}

// =============================================================================
// AT記録 配色
// =============================================================================

// ─── 敵キャラ ────────────────────────────────────────────────────────────────

const AT_CHAR_MAP: Record<string, CellColor> = {
  "鯱":    { backgroundColor: "#546e7a", color: "#ffffff" },
  "絢都":  { backgroundColor: "#2e7d32", color: "#ffffff" },
  "ヤモリ":{ backgroundColor: "#e65100", color: "#ffffff" },
  "特等ら":{ backgroundColor: "#c62828", color: "#ffffff" },
  "亜門":  { backgroundColor: "#1565c0", color: "#ffffff" },
  "有馬":  { backgroundColor: "#f9a825", color: "#000000" },
  "EDボナ":{ backgroundColor: "#6a1b9a", color: "#ffffff" },
};

export function getATCharColor(char: string): CellColor {
  return AT_CHAR_MAP[char] ?? { backgroundColor: "#9e9e9e", color: "#ffffff" };
}

// ─── BITES種別 ────────────────────────────────────────────────────────────────

const BITES_TYPE_MAP: Record<string, CellColor> = {
  "Table:A [50/100/200/300/500]":    { backgroundColor: "#e0e0e0", color: "#424242" },
  "Table:B [50/50/500/500/1000]":    { backgroundColor: "#bbdefb", color: "#1565c0" },
  "Table:C [100/200/300/500/1000]":  { backgroundColor: "#c8e6c9", color: "#1b5e20" },
  "Table:D [100/100/500/1000/2000]": { backgroundColor: "#ffe0b2", color: "#e65100" },
  "Table:E [200/300/500/1000/2000]": { backgroundColor: "#ffccbc", color: "#bf360c" },
  "Table:超 [300/500/1000/2000/3000]":{ backgroundColor: "#e1bee7", color: "#4a148c" },
  "Table:極 [2000/ED]":              { backgroundColor: "#fff176", color: "#827717" },
  "百足覚醒":                         { backgroundColor: "#b2dfdb", color: "#00695c" },
  "隻眼の梟":                         { backgroundColor: "#1a1a1a", color: "#ffffff" },
};

export function getBitesTypeCellColor(bitesType: string): CellColor {
  return BITES_TYPE_MAP[bitesType] ?? { backgroundColor: "#f3f4f6", color: "#9ca3af" };
}

/** "Table:A [50/...]" → "Table:A" に短縮 */
export function getBitesTypeShort(bitesType: string): string {
  const idx = bitesType.indexOf(" [");
  return idx !== -1 ? bitesType.slice(0, idx) : bitesType;
}

// ─── AT種別 ──────────────────────────────────────────────────────────────────

const AT_TYPE_MAP: Record<string, CellColor> = {
  "通常AT":           { backgroundColor: "#f5f5f5", color: "#424242" },
  "裏AT":             { backgroundColor: "#b71c1c", color: "#ffffff" },
  "隠れ裏AT（推測）": { backgroundColor: "#4a148c", color: "#ffffff" },
};

export function getATTypeCellColor(atType: string): CellColor {
  return AT_TYPE_MAP[atType] ?? { backgroundColor: "#e0e0e0", color: "#616161" };
}

// ─── 不利益 ──────────────────────────────────────────────────────────────────

const DISADVANTAGE_MAP: Record<string, CellColor> = {
  "-":        { backgroundColor: "#f5f5f5", color: "#9e9e9e" },
  "不利益⭕️": { backgroundColor: "#e8f5e9", color: "#2e7d32" },
  "不利益❌": { backgroundColor: "#ffebee", color: "#c62828" },
};

export function getDisadvantageCellColor(val: string): CellColor {
  return DISADVANTAGE_MAP[val] ?? { backgroundColor: "#f5f5f5", color: "#9e9e9e" };
}

// ─── 有馬ジャッジメント ───────────────────────────────────────────────────────

export const ARIMA_SUCCESS_COLOR: CellColor = { backgroundColor: "#f9a825", color: "#000000" };
export const ARIMA_FAIL_COLOR:    CellColor = { backgroundColor: "#bdbdbd", color: "#424242" };

export function getArimaResultColor(result: string): CellColor {
  if (result === "成功") return ARIMA_SUCCESS_COLOR;
  if (result === "失敗") return ARIMA_FAIL_COLOR;
  return { backgroundColor: "#f5f5f5", color: "#9ca3af" };
}

// ─── 対決成績 ────────────────────────────────────────────────────────────────

export const BATTLE_WIN_COLOR:  CellColor = { backgroundColor: "#1b5e20", color: "#ffffff" };
export const BATTLE_LOSE_COLOR: CellColor = { backgroundColor: "#c62828", color: "#ffffff" };
export const BATTLE_EMPTY_COLOR:CellColor = { backgroundColor: "#f5f5f5", color: "#d1d5db" };

export function getBattleResultColor(result: string): CellColor {
  if (result === "○") return BATTLE_WIN_COLOR;
  if (result === "×") return BATTLE_LOSE_COLOR;
  return BATTLE_EMPTY_COLOR;
}

/**
 * 一覧表示用 2行データ: 括弧プレフィックスを除去
 * 例) "[cz失敗] 金木研 - デフォルト" → { name: "金木研", hint: "デフォルト" }
 */
export function getSuggestionListLines(value: string): { name: string; hint: string } | null {
  if (!value) return null;
  const idx = value.indexOf(" - ");
  const hint = idx !== -1 ? value.slice(idx + 3).trim() : "";
  const withoutHint = idx !== -1 ? value.slice(0, idx) : value;
  const name = withoutHint.replace(/^\[.*?\]\s*/, "").trim();
  return { name, hint };
}
