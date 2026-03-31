// =============================================================================
// TOKYO GHOUL RESONANCE: セル全体背景色マッピング
// 色彩: ゾーン(浅→青/深→赤), モード(A=ピンク/B=黄/C=水/チャンス天国=濃青)
//       契機・イベント各色, AT=濃緑, 示唆=設定6金/456赤/高設定淡赤/偶数淡黄/奇数淡青
// =============================================================================

import { getHintText } from "./suggestionColors";

/** Tailwind bg+text クラス文字列 */
type CellStyle = string;

// ─── ゾーン (浅い=青系, 深い=赤系) ──────────────────────────────────────────

export function getZoneCellStyle(zone: string): CellStyle {
  if (!zone || zone === "不明") return "bg-gray-100 text-gray-500";
  const n = parseInt(zone);
  if (!isNaN(n)) {
    if (n <= 100) return "bg-sky-200 text-sky-900";
    if (n <= 250) return "bg-blue-200 text-blue-900";
    if (n <= 400) return "bg-violet-200 text-violet-900";
    return "bg-red-300 text-red-900"; // 500, 600
  }
  // 範囲値
  if (zone.includes("50") && !zone.includes("500")) return "bg-sky-200 text-sky-900";
  if (zone.includes("200") && !zone.includes("400") && !zone.includes("600")) return "bg-blue-200 text-blue-900";
  if (zone.includes("300")) return "bg-violet-200 text-violet-900";
  if (zone.includes("400") || zone.includes("500") || zone.includes("600")) return "bg-red-300 text-red-900";
  return "bg-gray-100 text-gray-500";
}

// ─── 推定モード ───────────────────────────────────────────────────────────────

export function getModeCellStyle(mode: string): CellStyle {
  if (!mode || mode === "不明") return "bg-gray-100 text-gray-500";
  if (mode.startsWith("通常A")) return "bg-pink-200 text-pink-900";
  if (mode.startsWith("通常B")) return "bg-yellow-200 text-yellow-900";
  if (mode.startsWith("通常C")) return "bg-cyan-200 text-cyan-900";
  if (mode.startsWith("チャンス")) return "bg-blue-500 text-white";
  if (mode.startsWith("天国準備")) return "bg-blue-600 text-white";
  if (mode.startsWith("天国")) return "bg-blue-800 text-white";
  if (mode.startsWith("朝一")) return "bg-gray-300 text-gray-800";
  return "bg-gray-100 text-gray-500";
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

// ─── 当選契機 ─────────────────────────────────────────────────────────────────

export function getTriggerCellStyle(trigger: string): CellStyle {
  if (!trigger || trigger === "不明") return "bg-gray-100 text-gray-500";
  if (trigger === "確定チェリー")       return "bg-red-600 text-white";
  if (trigger === "強チェリー")         return "bg-red-400 text-white";
  if (trigger === "弱チェリー")         return "bg-pink-200 text-pink-900";
  if (trigger === "チャンス目")          return "bg-orange-300 text-orange-900";
  if (trigger === "精神世界 [赫眼]")    return "bg-teal-500 text-white";
  if (trigger === "精神世界")           return "bg-teal-300 text-teal-900";
  if (trigger === "直撃")              return "bg-purple-500 text-white";
  if (trigger.includes("🍉"))          return "bg-green-300 text-green-900";
  if (trigger === "ゲーム数orレア役")   return "bg-gray-300 text-gray-800";
  if (trigger === "ゲーム数")           return "bg-gray-200 text-gray-700";
  return "bg-gray-100 text-gray-500";
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

// ─── イベント ─────────────────────────────────────────────────────────────────

export function getEventCellStyle(event: string): CellStyle {
  if (!event) return "bg-gray-100 text-gray-400";
  if (event === "ロングフリーズ")     return "bg-yellow-400 text-yellow-950";
  if (event === "直撃AT")            return "bg-red-500 text-white";
  if (event === "レミニセンス")       return "bg-purple-300 text-purple-900";
  if (event === "大喰いの利世")       return "bg-teal-300 text-teal-900";
  if (event === "エピソードボーナス") return "bg-blue-300 text-blue-900";
  if (event === "引き戻し")          return "bg-orange-200 text-orange-800";
  return "bg-gray-100 text-gray-500";
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

// ─── 終了画面示唆 / トロフィー ────────────────────────────────────────────────

export function getSuggestionCellStyle(value: string): CellStyle {
  if (!value) return "bg-gray-100 text-gray-400";
  const hint = getHintText(value);
  if (hint.includes("設定6"))              return "bg-yellow-400 text-yellow-950";
  if (hint.includes("設定5以上"))          return "bg-red-700 text-white";
  if (hint.includes("設定4以上"))          return "bg-red-500 text-white";
  if (hint.includes("設定3以上"))          return "bg-red-300 text-red-900";
  if (hint.includes("設定2以上"))          return "bg-red-200 text-red-800";
  if (hint.includes("高設定示唆［強］"))   return "bg-red-200 text-red-800";
  if (hint.includes("高設定示唆［弱］"))   return "bg-red-100 text-red-700";
  if (hint.includes("偶数設定濃厚"))       return "bg-yellow-300 text-yellow-900";
  if (hint.includes("偶数設定示唆"))       return "bg-yellow-200 text-yellow-800";
  if (hint.includes("偶数設定期待度UP"))   return "bg-yellow-100 text-yellow-700";
  if (hint.includes("奇数設定濃厚"))       return "bg-blue-300 text-blue-900";
  if (hint.includes("奇数設定示唆"))       return "bg-blue-100 text-blue-700";
  if (hint.includes("天国濃厚"))           return "bg-teal-400 text-teal-900";
  if (hint.includes("天国準備以上濃厚"))   return "bg-teal-200 text-teal-800";
  if (hint.includes("チャンス以上濃厚"))   return "bg-cyan-200 text-cyan-900";
  if (hint.includes("通常C以上"))          return "bg-blue-200 text-blue-800";
  if (hint.includes("通常B以上"))          return "bg-blue-100 text-blue-700";
  if (hint.includes("次回トロフィー"))     return "bg-gray-900 text-gray-100";
  if (hint.includes("設定1否定") || hint.includes("設定2否定") ||
      hint.includes("設定3否定") || hint.includes("設定4否定"))
                                          return "bg-lime-100 text-lime-700";
  if (hint.includes("600G否定"))          return "bg-gray-100 text-gray-500";
  if (hint.includes("残り") || hint.includes("規定G数")) return "bg-sky-100 text-sky-700";
  return "bg-gray-100 text-gray-400";
}
