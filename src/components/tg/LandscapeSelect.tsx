"use client";
// =============================================================================
// LandscapeSelectOverlay
// 縦画面ではネイティブの <select> をそのまま使い、横画面（CSS回転ステージ内）
// では回転に追従するモーダルを開く。
//
// 横画面時はネイティブのプルダウンが画面回転に追従しないため、視覚と入力UIが
// ねじれて切れる問題を回避する。modal は position:fixed で配置するので、
// transform 祖先（回転ステージ）に閉じ込められて回転と一緒に表示される。
// =============================================================================

import { useState } from "react";

interface Props {
  value: string;
  options: string[]; // "" を含めて空オプションを表現できる
  onChange: (v: string) => void;
  /** 親ステージが横画面回転中なら true */
  landscape: boolean;
  emptyLabel?: string;
  optionLabel?: (v: string) => string;
  title?: string;
}

export function LandscapeSelectOverlay({
  value, options, onChange, landscape,
  emptyLabel = "—", optionLabel, title = "選択",
}: Props) {
  const [open, setOpen] = useState(false);

  if (!landscape) {
    return (
      <select
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "" ? emptyLabel : (optionLabel ? optionLabel(opt) : opt)}
          </option>
        ))}
      </select>
    );
  }

  return (
    <>
      <button
        type="button"
        className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
        onClick={() => setOpen(true)}
        aria-label={title}
      />
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="bg-white w-full max-w-lg flex flex-col rounded-t-2xl overflow-hidden shadow-2xl"
            style={{ maxHeight: "85%" }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-300 flex-shrink-0">
              <p className="text-sm font-mono font-bold text-gray-700">{title}</p>
              <button
                onClick={() => setOpen(false)}
                className="text-xs font-mono text-gray-400 px-2 py-1"
              >
                閉じる
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1.5">
              {options.map((opt) => {
                const sel = value === opt;
                const label = opt === "" ? emptyLabel : (optionLabel ? optionLabel(opt) : opt);
                return (
                  <button
                    key={opt}
                    onClick={() => { onChange(opt); setOpen(false); }}
                    className="w-full rounded-lg py-3 px-4 text-left font-mono text-[13px] active:scale-95 transition-transform"
                    style={sel
                      ? { backgroundColor: "#1f2937", color: "#ffffff", boxShadow: "0 0 0 2px #1f2937" }
                      : { backgroundColor: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db" }
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
