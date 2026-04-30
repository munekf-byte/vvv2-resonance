// =============================================================================
// 前任者履歴写真: アップロード + アトミックなフラグ更新
//
// 流れ:
//   1) フル + サムネ を並列 upload (各 x3 リトライ)
//   2) 両方成功 → play_sessions.prev_photo_uploaded_at = NOW() を 1 回だけ UPDATE
//   3) 片方でも失敗 → 成功した方を Storage から削除してロールバック、
//      prev_photo_uploaded_at は NULL のまま（写真なし扱い）
//
// 注意:
//   - セッション保存とは別トランザクション。失敗してもセッション本体は影響を受けない。
//   - 既存写真がある場合は upsert で上書きされる（同一パス）。
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import { compressForUpload } from "./compress";

export type PhotoUploadResult =
  | { ok: true; uploadedAt: string }
  | { ok: false; reason: "compress" | "upload" | "update"; message: string };

const BUCKET = "session-photos";
const MAX_ATTEMPTS = 3;

function pathFor(userId: string, sessionId: string, kind: "full" | "thumb"): string {
  return `${userId}/${sessionId}/${kind}.jpg`;
}

async function uploadWithRetry(
  path: string,
  blob: Blob,
  attempts = MAX_ATTEMPTS
): Promise<{ ok: true } | { ok: false; message: string }> {
  const supabase = createClient();
  let lastMsg = "unknown";
  for (let i = 1; i <= attempts; i++) {
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, blob, {
        contentType: "image/jpeg",
        upsert: true,
        cacheControl: "3600",
      });
    if (!error) return { ok: true };
    lastMsg = error.message;
    if (i < attempts) {
      await new Promise((r) => setTimeout(r, 300 * i));
    }
  }
  return { ok: false, message: lastMsg };
}

async function safeRemove(path: string): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.storage.from(BUCKET).remove([path]);
  } catch {
    // ロールバック失敗は致命ではない（次回 upsert で上書きされる）
  }
}

/**
 * 写真をアップロードし、両方成功時にのみ prev_photo_uploaded_at を更新する。
 * 失敗時はロールバックを実施。セッション保存自体は呼び出し側で別途行う前提。
 */
export async function uploadPrevPhoto(params: {
  userId: string;
  sessionId: string;
  file: File;
}): Promise<PhotoUploadResult> {
  const { userId, sessionId, file } = params;

  // 1) 圧縮
  let compressed;
  try {
    compressed = await compressForUpload(file);
  } catch (e) {
    return {
      ok: false,
      reason: "compress",
      message: e instanceof Error ? e.message : "圧縮に失敗しました",
    };
  }

  // 2) 並列アップロード（各 x3 リトライ）
  const fullPath = pathFor(userId, sessionId, "full");
  const thumbPath = pathFor(userId, sessionId, "thumb");
  const [fullRes, thumbRes] = await Promise.all([
    uploadWithRetry(fullPath, compressed.full),
    uploadWithRetry(thumbPath, compressed.thumb),
  ]);

  // 3) 片方でも失敗 → 成功した方を削除してロールバック
  if (!fullRes.ok || !thumbRes.ok) {
    if (fullRes.ok) await safeRemove(fullPath);
    if (thumbRes.ok) await safeRemove(thumbPath);
    const msg = !fullRes.ok ? fullRes.message : (thumbRes as { ok: false; message: string }).message;
    return { ok: false, reason: "upload", message: msg };
  }

  // 4) 両方成功 → アトミックに UPDATE
  const supabase = createClient();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("play_sessions")
    .update({ prev_photo_uploaded_at: now })
    .eq("id", sessionId)
    .eq("user_id", userId);

  if (error) {
    // UPDATE 失敗 → Storage 側もロールバックして整合を保つ
    await safeRemove(fullPath);
    await safeRemove(thumbPath);
    return { ok: false, reason: "update", message: error.message };
  }

  return { ok: true, uploadedAt: now };
}

/**
 * 表示用の signed URL を取得（Public バケットではないため）。
 * 期限切れ時は呼び出し側で再取得する想定。
 */
export async function getPhotoSignedUrl(
  userId: string,
  sessionId: string,
  kind: "full" | "thumb",
  cacheBust?: string | null,
  expiresInSec = 3600
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(pathFor(userId, sessionId, kind), expiresInSec);
  if (error || !data?.signedUrl) return null;
  return cacheBust ? `${data.signedUrl}&v=${encodeURIComponent(cacheBust)}` : data.signedUrl;
}
