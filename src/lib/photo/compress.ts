// =============================================================================
// 前任者履歴写真: クライアント側圧縮ユーティリティ
//
// Free Plan の Supabase Storage を使うため Image Transform は使えない。
// クライアントで Canvas に描画 → JPEG エンコードし、フル+サムネ 2 枚を生成する。
//
// 仕様:
//   - フル: max 1280px (long edge), JPEG q=0.75, 目標 ~250KB
//   - サムネ: max 320px, JPEG q=0.60, 目標 ~30KB
//   - 入力: image/* (HEIC は Canvas が描画できなければ失敗 → 拒否)
// =============================================================================

export interface CompressedPhoto {
  full: Blob;
  thumb: Blob;
}

const FULL_MAX = 1280;
const FULL_QUALITY = 0.75;
const THUMB_MAX = 320;
const THUMB_QUALITY = 0.6;

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("画像の読み込みに失敗しました（HEIC など非対応形式の可能性）"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fitSize(srcW: number, srcH: number, max: number): { w: number; h: number } {
  const long = Math.max(srcW, srcH);
  if (long <= max) return { w: srcW, h: srcH };
  const scale = max / long;
  return { w: Math.round(srcW * scale), h: Math.round(srcH * scale) };
}

async function renderToBlob(
  img: HTMLImageElement,
  maxEdge: number,
  quality: number
): Promise<Blob> {
  const { w, h } = fitSize(img.naturalWidth, img.naturalHeight, maxEdge);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D コンテキストを取得できませんでした");
  ctx.drawImage(img, 0, 0, w, h);

  const blob: Blob | null = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob) throw new Error("JPEG エンコードに失敗しました");
  return blob;
}

/**
 * File を フル + サムネ の 2 枚に圧縮する。
 * 失敗時は Error を throw（呼び出し側でトースト表示してアップロードを拒否する想定）。
 */
export async function compressForUpload(file: File): Promise<CompressedPhoto> {
  if (!file.type.startsWith("image/")) {
    throw new Error("画像ファイルを選択してください");
  }
  const img = await loadImage(file);
  const [full, thumb] = await Promise.all([
    renderToBlob(img, FULL_MAX, FULL_QUALITY),
    renderToBlob(img, THUMB_MAX, THUMB_QUALITY),
  ]);
  return { full, thumb };
}
