// =============================================================================
// TGR Resonance: 統計分析レイヤー — AT セット INSERT エンドポイント
// POST /api/analytics/at-set
//   - body: { events: AtSetEventPayload[] } (max 50 件)
//   - 認証: Cookie ベース
//   - 書き込み: Service Role 経由
// =============================================================================

import {
  authenticateAndHash,
  validateBatchPayload,
  errorResponse,
  okResponse,
} from "@/lib/analytics/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_DISADVANTAGE = new Set(["-", "不利益⭕️", "不利益❌"]);

function asStringArray(v: unknown): string[] | null {
  if (v == null) return null;
  if (!Array.isArray(v)) return null;
  if (!v.every((x) => typeof x === "string")) return null;
  return v as string[];
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON");
  }

  const validation = validateBatchPayload(body);
  if (!validation.ok) return errorResponse(400, validation.error);

  const ctx = await authenticateAndHash();
  if (!ctx) return errorResponse(401, "Unauthorized");

  const rows: Record<string, unknown>[] = [];
  for (const e of validation.events) {
    if (typeof e.at_instance_id !== "string") {
      return errorResponse(400, "at_instance_id must be a string (uuid)");
    }
    if (typeof e.set_instance_id !== "string") {
      return errorResponse(400, "set_instance_id must be a string (uuid)");
    }
    if (typeof e.at_seq_in_session !== "number") {
      return errorResponse(400, "at_seq_in_session must be a number");
    }
    if (typeof e.set_seq_in_at !== "number") {
      return errorResponse(400, "set_seq_in_at must be a number");
    }
    if (typeof e.recorded_at !== "string") {
      return errorResponse(400, "recorded_at must be an ISO string");
    }

    const battle_triggers = asStringArray(e.battle_triggers);
    const battle_results = asStringArray(e.battle_results);
    if ((battle_triggers === null) !== (battle_results === null)) {
      return errorResponse(400, "battle_triggers and battle_results must both be present or both absent");
    }
    if (battle_triggers && battle_results && battle_triggers.length !== battle_results.length) {
      return errorResponse(400, "battle_triggers and battle_results must have the same length");
    }

    const disadvantage = e.disadvantage;
    if (disadvantage !== undefined && disadvantage !== null &&
        (typeof disadvantage !== "string" || !VALID_DISADVANTAGE.has(disadvantage))) {
      return errorResponse(400, "Invalid disadvantage");
    }

    rows.push({
      user_id_hash: ctx.userIdHash,
      user_session_id: e.user_session_id ?? null,

      at_instance_id: e.at_instance_id,
      at_seq_in_session: e.at_seq_in_session,
      set_instance_id: e.set_instance_id,
      set_seq_in_at: e.set_seq_in_at,

      at_type: typeof e.at_type === "string" ? e.at_type : null,
      at_entry_type: typeof e.at_entry_type === "string" ? e.at_entry_type : null,

      character: typeof e.character === "string" ? e.character : null,
      bites_type: typeof e.bites_type === "string" ? e.bites_type : null,
      bites_coins: typeof e.bites_coins === "string" ? e.bites_coins : null,
      bites_coins_numeric: typeof e.bites_coins_numeric === "number" ? e.bites_coins_numeric : null,
      disadvantage: disadvantage ?? null,

      battle_count: typeof e.battle_count === "number" ? e.battle_count : null,
      battle_wins: typeof e.battle_wins === "number" ? e.battle_wins : null,
      battle_triggers,
      battle_results,

      direct_add_count: typeof e.direct_add_count === "number" ? e.direct_add_count : null,
      direct_add_total_coins: typeof e.direct_add_total_coins === "number" ? e.direct_add_total_coins : null,

      ending_suggestion: typeof e.ending_suggestion === "string" ? e.ending_suggestion : null,
      trophy: typeof e.trophy === "string" ? e.trophy : null,
      ending_card_data: e.ending_card_data && typeof e.ending_card_data === "object" ? e.ending_card_data : null,
      ed_kakugan_count: typeof e.ed_kakugan_count === "number" ? e.ed_kakugan_count : null,
      kakugan_states: asStringArray(e.kakugan_states),
      kakugan_count: typeof e.kakugan_count === "number" ? e.kakugan_count : null,
      coins_hint: typeof e.coins_hint === "string" ? e.coins_hint : null,

      hall_id_hash: typeof e.hall_id_hash === "string" ? e.hall_id_hash : null,
      machine_id_hash: typeof e.machine_id_hash === "string" ? e.machine_id_hash : null,
      is_morning_first: typeof e.is_morning_first === "boolean" ? e.is_morning_first : null,
      estimated_setting: typeof e.estimated_setting === "number" ? e.estimated_setting : null,

      is_correction: e.is_correction === true,
      recorded_at: e.recorded_at,
    });
  }

  const { error } = await ctx.admin.from("analytics_at_set_events").insert(rows);
  if (error) {
    console.error("[analytics/at-set] insert error:", error.message);
    return errorResponse(500, "Insert failed");
  }

  return okResponse(rows.length);
}
