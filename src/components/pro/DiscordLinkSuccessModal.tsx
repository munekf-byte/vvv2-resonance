"use client";
import { LINK_DISCORD_SERVER } from "@/lib/config/links";

export function DiscordLinkSuccessModal({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, #1f2937 0%, #292524 100%)", border: "2px solid #5865F2" }}
      >
        <div className="px-6 pt-7 pb-5 text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
            style={{
              background: "linear-gradient(135deg, #5865F2 0%, #4752C4 100%)",
              boxShadow: "0 0 30px rgba(88, 101, 242, 0.55)",
            }}
          >
            <span className="text-4xl">✅</span>
          </div>
          <p className="font-mono font-black text-2xl mb-1" style={{ color: "#e0e7ff" }}>
            Discord 連携完了
          </p>
          <p className="font-mono text-xs" style={{ color: "#c7d2fe" }}>
            サーバーに参加し、TGR-Pro ロールが付与されました
          </p>
        </div>

        <div className="px-6 pb-2">
          <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}>
            <ul className="space-y-2">
              {[
                { icon: "🚪", title: "サーバーに自動参加" },
                { icon: "👑", title: "TGR-Pro ロール付与" },
                { icon: "💬", title: "専用チャンネル閲覧可" },
              ].map((it) => (
                <li key={it.title} className="flex items-center gap-2">
                  <span className="text-lg">{it.icon}</span>
                  <span className="font-mono text-xs text-gray-200">{it.title}</span>
                  <span className="ml-auto text-green-400 font-mono font-bold text-[11px]">✓</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="px-6 py-5 space-y-2">
          <a
            href={LINK_DISCORD_SERVER}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full py-4 rounded-lg font-mono font-black text-base text-white text-center active:scale-95 transition-transform"
            style={{
              backgroundColor: "#5865F2",
              boxShadow: "0 4px 14px rgba(88, 101, 242, 0.45)",
            }}
          >
            Discord を開く →
          </a>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-lg font-mono font-bold text-sm active:scale-95 transition-transform"
            style={{ backgroundColor: "transparent", color: "#c7d2fe", border: "1px solid rgba(199, 210, 254, 0.35)" }}
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
