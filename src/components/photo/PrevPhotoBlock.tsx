"use client";
// =============================================================================
// 前任者履歴写真: 集計画面用 表示 + 添付/差し替えボタン
//
// 動作:
//   - 写真あり: フル画像（タップで拡大モーダル）+ 「差し替え」ボタン（Pro時のみ）
//   - 写真なし: 「前任者の履歴写真を添付」ボタン（Pro時のみ）
//   - 無料ユーザー: 写真なしの場合 Pro 訴求バナー
// =============================================================================

import { useEffect, useState } from "react";
import { getPhotoSignedUrl, uploadPrevPhoto } from "@/lib/photo/upload";

interface Props {
  userId: string;
  sessionId: string;
  uploadedAt: string | null;
  isPro: boolean;
  onUploaded: (newUploadedAt: string) => void;
}

export function PrevPhotoBlock({ userId, sessionId, uploadedAt, isPro, onUploaded }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadedAt) { setUrl(null); return; }
    let active = true;
    getPhotoSignedUrl(userId, sessionId, "full", uploadedAt).then((u) => {
      if (active) setUrl(u);
    });
    return () => { active = false; };
  }, [userId, sessionId, uploadedAt]);

  async function handlePick(file: File) {
    setBusy(true);
    setErrMsg(null);
    const res = await uploadPrevPhoto({ userId, sessionId, file });
    setBusy(false);
    if (res.ok) {
      onUploaded(res.uploadedAt);
    } else {
      setErrMsg(res.message);
    }
  }

  function openPicker() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = () => {
      const f = input.files?.[0];
      if (f) handlePick(f);
    };
    input.click();
  }

  if (!uploadedAt) {
    if (!isPro) {
      return (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
          <p className="text-[11px] font-mono text-purple-700">
            前任者の履歴写真添付は <span className="font-bold">Pro限定機能</span> です
          </p>
        </div>
      );
    }
    return (
      <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 text-center space-y-2">
        <button
          onClick={openPicker}
          disabled={busy}
          className="w-full py-3 rounded-lg font-mono text-[12px] font-bold text-white active:scale-95 transition-transform disabled:opacity-60"
          style={{ backgroundColor: "#1f2937" }}
        >
          {busy ? "アップロード中..." : "前任者の履歴写真を添付"}
        </button>
        {errMsg && <p className="text-[10px] font-mono text-red-600">{errMsg}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-300 rounded-lg p-2 space-y-2">
        <p className="text-[10px] font-mono text-gray-500">前任者履歴写真</p>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt="前任者履歴"
            className="w-full rounded cursor-zoom-in"
            onClick={() => setZoomed(true)}
          />
        ) : (
          <div className="w-full aspect-video bg-gray-100 rounded flex items-center justify-center text-[11px] font-mono text-gray-400">
            読み込み中...
          </div>
        )}
        {isPro && (
          <button
            onClick={openPicker}
            disabled={busy}
            className="w-full py-2 rounded font-mono text-[11px] font-bold border border-gray-400 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {busy ? "アップロード中..." : "写真を差し替え"}
          </button>
        )}
        {errMsg && <p className="text-[10px] font-mono text-red-600">{errMsg}</p>}
      </div>

      {zoomed && url && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setZoomed(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="前任者履歴（拡大）" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}
