"use client";
// =============================================================================
// TGR Resonance: 利用規約改定バナー
//   - 改定日から 7日間 表示（× で即時クローズ可）
//   - localStorage キーは改定日を含めるので、将来の改定時に自動で再表示される
//   - 設計合意: docs/opus2-collab/05_opus2_to_claude_reply.md (論点 4)
// =============================================================================

import { useEffect, useState } from "react";
import Link from "next/link";

// 規約改定日 (ISO yyyy-mm-dd)。改定のたびに更新する。
const TERMS_UPDATE_DATE = "2026-05-02";
// 表示期間 (7日間)
const DISPLAY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
// localStorage key (改定日込み = 改定ごとに自動でリセット表示)
const DISMISS_KEY = `tgr_terms_update_${TERMS_UPDATE_DATE}_dismissed`;

function isWithinDisplayWindow(): boolean {
  const updated = new Date(TERMS_UPDATE_DATE).getTime();
  if (Number.isNaN(updated)) return false;
  return Date.now() - updated < DISPLAY_WINDOW_MS;
}

export function TermsUpdateBanner() {
  // SSR と一致させるため初期は非表示。マウント後に判定。
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isWithinDisplayWindow()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {}
    setVisible(true);
  }, []);

  function handleDismiss() {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }

  if (!visible) return null;

  return (
    <div
      className="w-full border-b"
      style={{ backgroundColor: "#fef3c7", borderColor: "#f59e0b" }}
    >
      <div className="max-w-2xl mx-auto px-3 py-2 flex items-start gap-2">
        <span
          className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shrink-0 mt-0.5"
          style={{ backgroundColor: "#f59e0b", color: "#ffffff" }}
        >
          NEW
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-mono leading-snug" style={{ color: "#78350f" }}>
            {TERMS_UPDATE_DATE} 利用規約・プライバシーポリシーを改定しました。
            遊技データの統計分析への協力に関する条項を追加しています。
            {" "}
            <Link
              href="/privacy"
              className="underline font-bold"
              style={{ color: "#92400e" }}
            >
              詳細を見る
            </Link>
          </p>
        </div>
        <button
          onClick={handleDismiss}
          aria-label="閉じる"
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-mono text-[12px] active:scale-90 transition-transform"
          style={{ backgroundColor: "#fde68a", color: "#78350f" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
