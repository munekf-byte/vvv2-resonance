"use client";
// =============================================================================
// セッション写真スロット表示 + 添付/差し替えボタン
//
// kind="prev"   : 前任者履歴
// kind="result" : 稼働結果
//
// 動作:
//   - 写真あり: フル画像（タップで拡大モーダル）+ 「写真を差し替え」（Pro時）
//   - 写真なし: 「写真を追加」ボタン（Pro時のみ）
//   - 無料ユーザー: 写真なしの場合 Pro 訴求バナー
// =============================================================================

import { useEffect, useState } from "react";
import { getPhotoSignedUrl, uploadSessionPhoto, type PhotoKind } from "@/lib/photo/upload";

interface Props {
  userId: string;
  sessionId: string;
  kind: PhotoKind;
  label: string;
  emptyButtonLabel: string;
  uploadedAt: string | null;
  isPro: boolean;
  onUploaded: (newUploadedAt: string) => void;
}

export function PhotoSlotBlock({
  userId, sessionId, kind, label, emptyButtonLabel,
  uploadedAt, isPro, onUploaded,
}: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!uploadedAt) { setUrl(null); return; }
    let active = true;
    getPhotoSignedUrl(userId, sessionId, "full", uploadedAt, 3600, kind).then((u) => {
      if (active) setUrl(u);
    });
    return () => { active = false; };
  }, [userId, sessionId, kind, uploadedAt]);

  async function handlePick(file: File) {
    setBusy(true);
    setErrMsg(null);
    const res = await uploadSessionPhoto({ userId, sessionId, file, kind });
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
            {label}添付は <span className="font-bold">Pro限定機能</span> です
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
          {busy ? "アップロード中..." : emptyButtonLabel}
        </button>
        {errMsg && <p className="text-[10px] font-mono text-red-600">{errMsg}</p>}
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-300 rounded-lg p-2 space-y-2">
        <p className="text-[10px] font-mono text-gray-500">{label}</p>
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={label}
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
          <img src={url} alt={`${label}（拡大）`} className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </>
  );
}
