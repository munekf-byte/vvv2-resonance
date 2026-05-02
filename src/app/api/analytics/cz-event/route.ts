// =============================================================================
// TGR Resonance: 統計分析レイヤー — CZ イベント INSERT エンドポイント
// POST /api/analytics/cz-event
//   - body: { events: CzEventPayload[] } (max 50 件)
//   - 認証: Cookie ベース (createServerSupabaseClient)
//   - 書き込み: Service Role 経由 (RLS バイパス)
// =============================================================================

import {
  authenticateAndHash,
  validateBatchPayload,
  errorResponse,
  okResponse,
} from "@/lib/analytics/api-helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_CZ_TYPES = new Set(["reminiscence", "oogui_rize"]);
const VALID_ROLES = new Set(["bell", "replay", "weak_rare", "strong_rare", "hazure"]);
const VALID_OUTCOMES = new Set(["success", "fail", "in_progress"]);

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
    const cz_type = e.cz_type;
    const role = e.role;
    const cz_outcome = e.cz_outcome;

    if (typeof cz_type !== "string" || !VALID_CZ_TYPES.has(cz_type)) {
      return errorResponse(400, "Invalid cz_type");
    }
    if (typeof role !== "string" || !VALID_ROLES.has(role)) {
      return errorResponse(400, "Invalid role");
    }
    if (cz_outcome !== undefined && cz_outcome !== null &&
        (typeof cz_outcome !== "string" || !VALID_OUTCOMES.has(cz_outcome))) {
      return errorResponse(400, "Invalid cz_outcome");
    }
    if (typeof e.event_seq_in_cz !== "number") {
      return errorResponse(400, "event_seq_in_cz must be a number");
    }
    if (typeof e.triggered !== "boolean") {
      return errorResponse(400, "triggered must be a boolean");
    }
    if (typeof e.recorded_at !== "string") {
      return errorResponse(400, "recorded_at must be an ISO string");
    }

    rows.push({
      user_id_hash: ctx.userIdHash,
      user_session_id: e.user_session_id ?? null,
      cz_instance_id: e.cz_instance_id ?? null,
      cz_type,
      event_seq_in_cz: e.event_seq_in_cz,
      game_in_cz: e.game_in_cz ?? null,
      role,
      triggered: e.triggered,
      is_correction: e.is_correction === true,
      is_final_game: typeof e.is_final_game === "boolean" ? e.is_final_game : null,
      cz_outcome: cz_outcome ?? null,
      hall_id_hash: e.hall_id_hash ?? null,
      machine_id_hash: e.machine_id_hash ?? null,
      is_morning_first: typeof e.is_morning_first === "boolean" ? e.is_morning_first : null,
      estimated_setting: typeof e.estimated_setting === "number" ? e.estimated_setting : null,
      pre_cz_stage: e.pre_cz_stage ?? null,
      pre_cz_invitation: e.pre_cz_invitation ?? null,
      total_g_at_cz_entry: typeof e.total_g_at_cz_entry === "number" ? e.total_g_at_cz_entry : null,
      recorded_at: e.recorded_at,
    });
  }

  const { error } = await ctx.admin.from("analytics_cz_game_events").insert(rows);
  if (error) {
    console.error("[analytics/cz-event] insert error:", error.message);
    return errorResponse(500, "Insert failed");
  }

  return okResponse(rows.length);
}
