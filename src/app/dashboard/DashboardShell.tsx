"use client";
import { useState } from "react";
import { useAuth } from "@/components/auth/AuthContext";
import { DashboardClient } from "./DashboardClient";
import { TotalAnalysis } from "./TotalAnalysis";
import { LINK_DISCORD } from "@/lib/config/links";
import { createClient } from "@/lib/supabase/client";
import { ProUpgradePopup } from "@/components/pro/ProUpgradePopup";

export function DashboardShell() {
  const { profile, user } = useAuth();
  const isPro = profile?.is_pro ?? false;
  const isAdmin = profile?.is_admin ?? false;
  const [tab, setTab] = useState<"log" | "total">("log");

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith("tgr_")) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {}
    window.location.reload();
  }

  return (
    <div>
      <ProUpgradePopup />
      {/* ユーザー情報バー */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2">
          {profile?.avatar_url && (
            <img src={profile.avatar_url} alt="" className="w-6 h-6 rounded-full" />
          )}
          <span className="text-[11px] font-mono text-gray-600 truncate max-w-[150px]">
            {profile?.display_name ?? user?.email ?? ""}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isPro ? (
            <span className="flex-shrink-0">
              <img src="/images/pro_plan.png" alt="PRO" className="h-8 rounded" />
            </span>
          ) : (
            <>
              <span className="text-[10px] font-mono font-bold px-2 py-1.5 rounded bg-gray-200 text-gray-500">無料版</span>
              <a href="/lp" className="text-[10px] font-mono font-bold px-2.5 py-1.5 rounded active:scale-95 transition-transform inline-block"
                style={{ backgroundColor: "#7c3aed", color: "#fff" }}>
                Pro詳細
              </a>
            </>
          )}
          {isAdmin && (
            <a href="/admin" className="text-[10px] font-mono font-bold px-2 py-1.5 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors">管理</a>
          )}
          <a href="/tutorial"
            className="text-[11px] font-mono font-black px-2.5 py-1.5 rounded active:scale-95 transition-transform inline-flex items-center gap-1 shadow-sm"
            style={{ backgroundColor: "#06b6d4", color: "#ffffff", border: "2px solid #0e7490" }}>
            📖 使い方
          </a>
          <button onClick={handleSignOut} className="text-[10px] font-mono font-bold px-2.5 py-1.5 rounded border border-gray-300 text-gray-500 hover:text-red-600 hover:border-red-300 transition-colors">ログアウト</button>
        </div>
      </div>

      {/* タブバー（セグメントコントロール） */}
      <div className="flex mx-3 my-2 rounded-lg overflow-hidden" style={{ border: "2px solid #374151" }}>
        <button onClick={() => setTab("log")}
          className="flex-1 py-2.5 text-[12px] font-mono font-bold transition-colors"
          style={tab === "log"
            ? { backgroundColor: "#1f2937", color: "#f9fafb" }
            : { backgroundColor: "#f3f4f6", color: "#6b7280" }}>
          稼働ログ
        </button>
        <button onClick={() => setTab("total")}
          className="flex-1 py-2.5 text-[12px] font-mono font-bold transition-colors"
          style={tab === "total"
            ? { backgroundColor: "#1f2937", color: "#f9fafb", borderLeft: "2px solid #374151" }
            : { backgroundColor: "#f3f4f6", color: "#6b7280", borderLeft: "2px solid #374151" }}>
          <span>トータル数値分析</span>
          {isPro ? (
            <span className="block text-[7px] font-bold tracking-wider" style={{ color: tab === "total" ? "#fbbf24" : "#f59e0b" }}>PRO PLAN</span>
          ) : (
            <span className="block text-[11px] font-bold mt-0.5" style={{ color: tab === "total" ? "#fbbf24" : "#f59e0b" }}>🔒 PRO限定</span>
          )}
        </button>
      </div>

      {/* コンテンツ */}
      <div className="px-4 py-6">
        {tab === "log" ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h1 className="text-base font-mono font-bold text-gray-900">稼働ログ</h1>
              <span className="text-[9px] font-mono text-gray-400">データはクラウドに保存されます</span>
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
            <a href="/lp"
              className="mt-2 px-6 py-3 rounded-lg font-mono font-bold text-sm text-white active:scale-95 transition-transform inline-block"
              style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}>
              👑 Proプランの詳細を見る
            </a>
          </div>
        )}
      </div>

      {/* Pro Discord リンク */}
      {isPro && (
        <div className="px-4 pb-4">
          <button onClick={() => alert("現在パイロット版で準備中です")}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center font-mono font-bold text-sm rounded-lg px-4 py-3 transition-colors">
            Discord コミュニティに参加
          </button>
        </div>
      )}
    </div>
  );
}
