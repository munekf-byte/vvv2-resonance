// =============================================================================
// セッション写真: アップロード + アトミックなフラグ更新（2 スロット対応）
//
// スロット:
//   - prev   : 前任者履歴（パス互換のため既存のまま {sid}/full.jpg / thumb.jpg）
//   - result : 稼働結果グラフ（新規 {sid}/result_full.jpg / result_thumb.jpg）
//
// 流れ:
//   1) フル + サムネ を並列 upload (各 x3 リトライ)
//   2) 両方成功 → 該当カラムに NOW() を 1 回だけ UPDATE
//   3) 片方でも失敗 → 成功した方を Storage から削除してロールバック
// =============================================================================

import { createClient } from "@/lib/supabase/client";
import { compressForUpload } from "./compress";
import { APP_MACHINE_NAME } from "@/lib/config/app";

export type PhotoKind = "prev" | "result";
export type PhotoUploadResult =
  | { ok: true; uploadedAt: string }
  | { ok: false; reason: "compress" | "upload" | "update"; message: string };

const BUCKET = "session-photos";
const MAX_ATTEMPTS = 3;

function fileName(kind: PhotoKind, type: "full" | "thumb"): string {
  // prev は既存互換のため "full.jpg" / "thumb.jpg"
  // result は "result_full.jpg" / "result_thumb.jpg"
  return kind === "prev" ? `${type}.jpg` : `result_${type}.jpg`;
}

function pathFor(userId: string, sessionId: string, kind: PhotoKind, type: "full" | "thumb"): string {
  return `${userId}/${sessionId}/${fileName(kind, type)}`;
}

function dbColumn(kind: PhotoKind): "prev_photo_uploaded_at" | "result_photo_uploaded_at" {
  return kind === "prev" ? "prev_photo_uploaded_at" : "result_photo_uploaded_at";
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
 * 指定スロットに写真をアップロードし、両方成功時にのみ該当カラムを更新する。
 */
export async function uploadSessionPhoto(params: {
  userId: string;
  sessionId: string;
  file: File;
  kind: PhotoKind;
}): Promise<PhotoUploadResult> {
  const { userId, sessionId, file, kind } = params;

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

  // 2) 並列アップロード
  const fullPath = pathFor(userId, sessionId, kind, "full");
  const thumbPath = pathFor(userId, sessionId, kind, "thumb");
  const [fullRes, thumbRes] = await Promise.all([
    uploadWithRetry(fullPath, compressed.full),
    uploadWithRetry(thumbPath, compressed.thumb),
  ]);

  // 3) 片方でも失敗 → 成功した方を削除
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
    .update({ [dbColumn(kind)]: now })
    .eq("id", sessionId)
    .eq("user_id", userId)
    .eq("machine_name", APP_MACHINE_NAME);

  if (error) {
    await safeRemove(fullPath);
    await safeRemove(thumbPath);
    return { ok: false, reason: "update", message: error.message };
  }

  return { ok: true, uploadedAt: now };
}

/** 後方互換: 既存呼び出し用（prev スロット固定） */
export async function uploadPrevPhoto(params: {
  userId: string;
  sessionId: string;
  file: File;
}): Promise<PhotoUploadResult> {
  return uploadSessionPhoto({ ...params, kind: "prev" });
}

/**
 * 表示用 signed URL。kind と type を指定。
 */
export async function getPhotoSignedUrl(
  userId: string,
  sessionId: string,
  type: "full" | "thumb",
  cacheBust?: string | null,
  expiresInSec = 3600,
  kind: PhotoKind = "prev"
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(pathFor(userId, sessionId, kind, type), expiresInSec);
  if (error || !data?.signedUrl) return null;
  return cacheBust ? `${data.signedUrl}&v=${encodeURIComponent(cacheBust)}` : data.signedUrl;
}
