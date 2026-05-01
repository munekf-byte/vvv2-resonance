"use client";
// =============================================================================
// 赫眼 後追い確定 フローティングバナー
// 通常ダッシュボードで「赫眼発生」ボタンを押した直後から、ユーザーが
// AT 等の任意画面に遷移しても継続G数を確定できるよう、画面最上位に追従表示する。
// =============================================================================

import { useState } from "react";
import type { PendingKakugan } from "@/types";
import { TG_KAKUGAN } from "@/lib/engine/constants";

interface Props {
  pending: PendingKakugan;
  /** 周期No表示用（pending.blockId に対応する 1-based の番号） */
  blockNo: number | null;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PendingKakuganBanner({ pending, blockNo, onConfirm, onCancel }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const startedDisp = (() => {
    try {
      const d = new Date(pending.startedAt);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    } catch {
      return "";
    }
  })();

  return (
    <>
      {/* バナー（画面最上位に固定） */}
      <button
        onClick={() => setPickerOpen(true)}
        className="fixed left-1/2 -translate-x-1/2 active:scale-95 transition-transform"
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 8px)",
          zIndex: 70,
          backgroundColor: "#b91c1c",
          color: "#ffffff",
          border: "2px solid #fca5a5",
          borderRadius: "9999px",
          padding: "8px 16px",
          fontFamily: "ui-monospace, monospace",
          fontSize: "12px",
          fontWeight: 700,
          boxShadow: "0 4px 16px rgba(185,28,28,0.5)",
          maxWidth: "calc(100vw - 24px)",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        🔴 赫眼継続中{blockNo != null ? `（周期No.${blockNo}・${startedDisp}〜）` : `（${startedDisp}〜）`} — タップで継続G確定
      </button>

      {/* 確定ピッカー */}
      {pickerOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center px-4"
          style={{ zIndex: 80, backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setPickerOpen(false);
          }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
            style={{ border: "2px solid #b91c1c" }}
          >
            <div className="px-5 py-3" style={{ backgroundColor: "#b91c1c" }}>
              <p className="text-white font-mono font-bold text-sm">
                赫眼 継続G数 確定
              </p>
              {blockNo != null && (
                <p className="text-white/80 font-mono text-[10px] mt-0.5">
                  発生元: 周期No.{blockNo}（{startedDisp} 発生）
                </p>
              )}
            </div>

            <div className="px-4 py-4 space-y-2">
              <p className="text-[11px] font-mono text-gray-600 leading-snug">
                確定する継続G数を選択してください。値は発生元の周期に追記されます。
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[...TG_KAKUGAN].map((k) => (
                  <button
                    key={k}
                    onClick={() => {
                      onConfirm(k);
                      setPickerOpen(false);
                    }}
                    className="w-full font-mono font-bold text-[13px] rounded active:scale-95 transition-transform"
                    style={{
                      backgroundColor: "#b91c1c",
                      color: "#ffffff",
                      border: "2px solid #7f1d1d",
                      minHeight: "56px",
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex border-t border-gray-200">
              <button
                onClick={() => {
                  onCancel();
                  setPickerOpen(false);
                }}
                className="flex-1 py-3 text-sm font-mono font-bold text-red-700 hover:bg-red-50 transition-colors border-r border-gray-200"
              >
                保留を取消
              </button>
              <button
                onClick={() => setPickerOpen(false)}
                className="flex-1 py-3 text-sm font-mono font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
