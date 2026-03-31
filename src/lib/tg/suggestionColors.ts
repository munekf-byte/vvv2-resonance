// =============================================================================
// TOKYO GHOUL RESONANCE: 示唆カラーマッピング
// 色彩理念: 青=優遇モード示唆, 赤/金=高設定確定, 緑=AT(バッジ側), グレー=デフォルト
// =============================================================================

interface ColorClasses {
  bg: string;
  text: string;
}

// ヒントテキスト → Tailwindクラス (上から優先順位順)
const HINT_COLOR_MAP: Array<[string, ColorClasses]> = [

  // ── 高設定確定 (Gold → Crimson) ────────────────────────────────────────
  // 設定6: ゴールド（鮮やかな黄色）
  ["設定6濃厚",              { bg: "bg-yellow-400",  text: "text-yellow-950" }],
  // 設定5以上 / 設定4以上: 深紅（真紅）
  ["設定5以上濃厚",          { bg: "bg-red-700",     text: "text-white"      }],
  ["設定4以上濃厚",          { bg: "bg-red-600",     text: "text-white"      }],
  ["設定3以上濃厚",          { bg: "bg-red-200",     text: "text-red-900"    }],
  ["設定2以上濃厚",          { bg: "bg-red-100",     text: "text-red-700"    }],

  // ── 高設定示唆 (Blue / 優遇) ───────────────────────────────────────────
  ["高設定示唆［強］",       { bg: "bg-blue-300",    text: "text-blue-900"   }],
  ["高設定示唆［弱］",       { bg: "bg-blue-100",    text: "text-blue-700"   }],

  // ── 設定偶奇 (Purple / Orange) ─────────────────────────────────────────
  ["偶数設定濃厚",           { bg: "bg-purple-300",  text: "text-purple-900" }],
  ["偶数設定示唆",           { bg: "bg-purple-100",  text: "text-purple-700" }],
  ["偶数設定期待度UP",       { bg: "bg-purple-50",   text: "text-purple-600" }],
  ["奇数設定濃厚",           { bg: "bg-orange-300",  text: "text-orange-900" }],
  ["奇数設定示唆",           { bg: "bg-orange-100",  text: "text-orange-700" }],

  // ── モード示唆 (Blue系 / 優遇) ─────────────────────────────────────────
  ["天国濃厚",               { bg: "bg-teal-400",    text: "text-teal-900"   }],
  ["天国準備以上濃厚",       { bg: "bg-teal-200",    text: "text-teal-800"   }],
  ["チャンス以上濃厚",       { bg: "bg-cyan-200",    text: "text-cyan-900"   }],
  ["通常C以上濃厚",          { bg: "bg-blue-200",    text: "text-blue-800"   }],
  ["通常B以上濃厚",          { bg: "bg-blue-100",    text: "text-blue-700"   }],
  ["通常B以上示唆",          { bg: "bg-blue-100",    text: "text-blue-600"   }],

  // ── 特殊トロフィー ─────────────────────────────────────────────────────
  ["次回トロフィー出現濃厚", { bg: "bg-gray-900",    text: "text-gray-100"   }],

  // ── 設定否定 (Lime = 設定X除外 = 有益情報) ────────────────────────────
  ["設定1否定",              { bg: "bg-lime-100",    text: "text-lime-700"   }],
  ["設定2否定",              { bg: "bg-lime-100",    text: "text-lime-700"   }],
  ["設定3否定",              { bg: "bg-lime-100",    text: "text-lime-700"   }],
  ["設定4否定",              { bg: "bg-lime-100",    text: "text-lime-700"   }],

  // ── 残りG数系 (Sky) ────────────────────────────────────────────────────
  ["600G否定",               { bg: "bg-gray-100",    text: "text-gray-500"   }],
  ["規定G数を示唆",          { bg: "bg-sky-100",     text: "text-sky-600"    }],
  ["残り",                   { bg: "bg-sky-100",     text: "text-sky-700"    }],
];

// 通常/デフォルト → グレー
const DEFAULT_COLOR: ColorClasses = { bg: "bg-gray-100", text: "text-gray-400" };

/** " - " で区切られた最後の部分をヒントとして返す */
export function getHintText(value: string): string {
  const parts = value.split(" - ");
  return parts.length > 1 ? parts[parts.length - 1].trim() : value.trim();
}

/** 値文字列からヒントを抽出してTailwindカラークラスを返す */
export function getSuggestionColors(value: string): ColorClasses {
  if (!value) return DEFAULT_COLOR;
  const hint = getHintText(value);
  for (const [key, colors] of HINT_COLOR_MAP) {
    if (hint.includes(key)) return colors;
  }
  return DEFAULT_COLOR;
}
