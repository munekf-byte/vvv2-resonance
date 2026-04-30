"use client";
// =============================================================================
// 前任者履歴写真: セッション一覧用サムネイル（小サイズ表示のみ）
// 写真がない場合は何も表示しない（呼び出し側で条件分岐不要）。
// =============================================================================

import { useEffect, useState } from "react";
import { getPhotoSignedUrl } from "@/lib/photo/upload";

interface Props {
  userId: string | null | undefined;
  sessionId: string;
  uploadedAt: string | null | undefined;
  size?: number;
}

export function PrevPhotoThumb({ userId, sessionId, uploadedAt, size = 44 }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!userId || !uploadedAt) { setUrl(null); return; }
    let active = true;
    getPhotoSignedUrl(userId, sessionId, "thumb", uploadedAt).then((u) => {
      if (active) setUrl(u);
    });
    return () => { active = false; };
  }, [userId, sessionId, uploadedAt]);

  if (!uploadedAt) return null;

  return (
    <div
      className="rounded-md border border-gray-300 bg-gray-100 overflow-hidden flex-shrink-0"
      style={{ width: size, height: size }}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="前任者履歴" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-[8px] font-mono text-gray-400">
          ...
        </div>
      )}
    </div>
  );
}
