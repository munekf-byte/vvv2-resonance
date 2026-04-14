"use client";
import { useState, useRef, useCallback, type ReactNode } from "react";

interface Props {
  hint: string;
  children: ReactNode;
}

const LONG_PRESS_MS = 1500;

/**
 * 子要素を長押し（1.5秒）するとヒントをフロート表示するラッパー。
 * 通常のタップ（短押し）は子要素の onClick にそのまま透過される。
 */
export function LongPressHint({ hint, children }: Props) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const start = useCallback(() => {
    firedRef.current = false;
    timerRef.current = setTimeout(() => {
      firedRef.current = true;
      setShow(true);
    }, LONG_PRESS_MS);
  }, []);

  const end = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return (
    <>
      <div
        onTouchStart={start}
        onTouchEnd={end}
        onTouchCancel={end}
        onMouseDown={start}
        onMouseUp={end}
        onMouseLeave={end}
        onContextMenu={(e) => { if (firedRef.current) e.preventDefault(); }}
      >
        {children}
      </div>

      {show && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
          onClick={() => setShow(false)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4" style={{ backgroundColor: "#1f2937" }}>
              <p className="text-white font-mono font-bold text-sm">ヘルプ</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-gray-700 font-mono text-sm leading-relaxed whitespace-pre-wrap">
                {hint}
              </p>
            </div>
            <div className="border-t border-gray-200">
              <button
                onClick={() => setShow(false)}
                className="w-full py-3 text-sm font-mono font-bold text-blue-600 hover:bg-gray-50 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
