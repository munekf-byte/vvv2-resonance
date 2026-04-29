"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";

export function ProUpgradePopup() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (profile?.show_pro_popup) setOpen(true);
  }, [profile?.show_pro_popup]);

  async function handleDismiss() {
    if (dismissing) return;
    setDismissing(true);
    try {
      await fetch("/api/profile/dismiss-pro-popup", { method: "POST" });
    } catch (e) {
      console.error("[ProUpgradePopup] dismiss failed:", e);
    } finally {
      setOpen(false);
      setDismissing(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) handleDismiss(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "linear-gradient(135deg, #1f2937 0%, #292524 100%)", border: "2px solid #f59e0b" }}
      >
        <div className="px-6 pt-7 pb-5 text-center">
          <div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-4"
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #b45309 100%)",
              boxShadow: "0 0 30px rgba(245, 158, 11, 0.55)",
            }}
          >
            <span className="text-4xl">👑</span>
          </div>
          <p className="font-mono font-black text-2xl mb-1" style={{ color: "#fef3c7" }}>
            Pro プラン 有効化
          </p>
          <p className="font-mono text-xs" style={{ color: "#fde68a" }}>
            ご購入ありがとうございます！
          </p>
        </div>

        <div className="px-6 pb-2">
          <div className="rounded-xl px-4 py-4" style={{ backgroundColor: "rgba(255, 255, 255, 0.06)" }}>
            <p className="font-mono font-bold text-xs mb-3" style={{ color: "#fef3c7" }}>
              アンロックされた特典
            </p>
            <ul className="space-y-2">
              {[
                { icon: "📊", title: "稼働ログ無制限" },
                { icon: "📈", title: "トータル数値分析" },
                { icon: "💬", title: "専用Discordコミュニティ" },
              ].map((it) => (
                <li key={it.title} className="flex items-center gap-2">
                  <span className="text-lg">{it.icon}</span>
                  <span className="font-mono text-xs text-gray-200">{it.title}</span>
                  <span className="ml-auto text-green-400 font-mono font-bold text-[11px]">✓</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="font-mono text-[10px] text-gray-400 leading-relaxed mt-3 text-center">
            Discord 連携は <a href="/pro" className="underline font-bold" style={{ color: "#fde68a" }}>VIPルーム</a> から設定できます。
          </p>
        </div>

        <div className="px-6 py-5">
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="w-full py-4 rounded-lg font-mono font-black text-base active:scale-95 transition-transform disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)",
              color: "#ffffff",
              boxShadow: "0 4px 14px rgba(245, 158, 11, 0.45)",
            }}
          >
            {dismissing ? "閉じています..." : "OK"}
          </button>
        </div>
      </div>
    </div>
  );
}
