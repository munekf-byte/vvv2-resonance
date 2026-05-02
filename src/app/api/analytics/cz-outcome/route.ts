// =============================================================================
// TGR Resonance: 統計分析レイヤー — CZ outcome UPDATE エンドポイント
// POST /api/analytics/cz-outcome
//   - body: { cz_instance_id: string, cz_outcome: 'success'|'fail'|'in_progress' }
//   - 認証: Cookie ベース
//   - 書き込み: Service Role 経由 (cz_instance_id でまとめて UPDATE)
//   - 用途: 通常時周期の保存タイミングで、CZ全体の最終結果を確定する。
// =============================================================================

import {
  authenticateAndHash,
  errorResponse,
} from "@/lib/analytics/api-helpers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_OUTCOMES = new Set(["success", "fail", "in_progress"]);

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(400, "Invalid JSON");
  }

  if (!body || typeof body !== "object") {
    return errorResponse(400, "Invalid request body");
  }

  const { cz_instance_id, cz_outcome } = body as {
    cz_instance_id?: unknown;
    cz_outcome?: unknown;
  };

  if (typeof cz_instance_id !== "string" || cz_instance_id.length === 0) {
    return errorResponse(400, "cz_instance_id must be a non-empty string");
  }
  if (typeof cz_outcome !== "string" || !VALID_OUTCOMES.has(cz_outcome)) {
    return errorResponse(400, "Invalid cz_outcome");
  }

  const ctx = await authenticateAndHash();
  if (!ctx) return errorResponse(401, "Unauthorized");

  // 自分の user_id_hash + cz_instance_id でフィルタ (他者データを変更不可)
  const { error, count } = await ctx.admin
    .from("analytics_cz_game_events")
    .update({ cz_outcome }, { count: "exact" })
    .eq("user_id_hash", ctx.userIdHash)
    .eq("cz_instance_id", cz_instance_id);

  if (error) {
    console.error("[analytics/cz-outcome] update error:", error.message);
    return errorResponse(500, "Update failed");
  }

  return NextResponse.json({ ok: true, updated: count ?? 0 });
}
