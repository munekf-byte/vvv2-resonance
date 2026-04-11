"use client";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { DashboardClient } from "./DashboardClient";
import { TotalAnalysis } from "./TotalAnalysis";
import { createClient } from "@/lib/supabase/client";

export function DashboardShell() {
  const { profile, user } = useAuth();
  const isPro = profile?.is_pro ?? false;
  const isAdmin = profile?.is_admin ?? false;
  const [tab, setTab] = useState<"log" | "total">("log");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div>
      {/* ユーザー情報バー */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
          )}
          <span className="text-[11px] font-mono text-gray-600 truncate max-w-[150px]">
            {profile?.display_name ?? user?.email ?? ""}
          </span>
          {isPro && <span className="text-[9px] font-mono font-bold text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">PRO</span>}
          {isAdmin && <span className="text-[9px] font-mono font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">ADMIN</span>}
          <span className="text-[8px] font-mono text-orange-500">Pro:{String(isPro)} Admin:{String(isAdmin)}</span>
        </div>
        <div className="flex items-center gap-2">
          <a href="/pro" className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded active:scale-95 transition-transform"
            style={{ backgroundColor: isPro ? "#f59e0b" : "#7c3aed", color: "#fff" }}>
            👑 {isPro ? "VIP" : "Pro"}
          </a>
          {isAdmin && (
            <a href="/admin" className="text-[10px] font-mono text-gray-500 hover:text-gray-800">管理</a>
          )}
          <button onClick={handleSignOut} className="text-[10px] font-mono text-gray-400 hover:text-gray-700">ログアウト</button>
        </div>
      </div>

      {/* タブバー */}
      <div className="flex border-b-2 border-gray-300" style={{ backgroundColor: "#1f2937" }}>
        <button onClick={() => setTab("log")}
          className="flex-1 py-2.5 text-[12px] font-mono font-bold transition-colors"
          style={tab === "log" ? { color: "#f9fafb", borderBottom: "2px solid #ef4444" } : { color: "#6b7280", borderBottom: "2px solid transparent" }}>
          稼働ログ
        </button>
        <button onClick={() => setTab("total")}
          className="flex-1 py-2.5 text-[12px] font-mono font-bold transition-colors relative"
          style={tab === "total" ? { color: "#f9fafb", borderBottom: "2px solid #ef4444" } : { color: "#6b7280", borderBottom: "2px solid transparent" }}>
          トータル数値分析
          {!isPro && <span className="ml-1 text-[9px]">🔒</span>}
        </button>
      </div>

      {/* コンテンツ */}
      <div className="px-4 py-6">
        {tab === "log" ? (
          <>
            <div className="mb-5">
              <h1 className="text-lg font-mono font-bold text-gray-900">稼働ログ</h1>
              <p className="text-gray-500 text-xs font-mono mt-0.5">SESSION LIST · データはクラウドに保存されます</p>
            </div>
            <DashboardClient />
          </>
        ) : isPro ? (
          <TotalAnalysis />
        ) : (
          <div className="bg-purple-50 rounded-xl border border-purple-200 p-6 text-center space-y-3">
            <span className="text-3xl">🔒</span>
            <p className="font-mono font-bold text-purple-800">Pro版 限定機能</p>
            <p className="font-mono text-purple-600 text-sm">
              トータル数値分析は Pro版 で利用できます。
            </p>
            <a href="/pro"
              className="inline-block mt-2 px-6 py-3 rounded-lg font-mono font-bold text-sm text-white active:scale-95 transition-transform"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}>
              👑 Proプランの詳細を見る
            </a>
          </div>
        )}
      </div>

      {/* Pro Discord リンク */}
      {isPro && (
        <div className="px-4 pb-4">
          <a href="https://discord.gg/YOUR_INVITE_LINK" target="_blank" rel="noopener noreferrer"
            className="block bg-indigo-600 hover:bg-indigo-700 text-white text-center font-mono font-bold text-sm rounded-lg px-4 py-3 transition-colors">
            Discord コミュニティに参加
          </a>
        </div>
      )}
    </div>
  );
}
