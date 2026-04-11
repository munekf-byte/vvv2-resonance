"use client";
import { useAuth } from "@/components/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  is_pro: boolean;
  is_admin: boolean;
  created_at: string;
}

interface SessionRow {
  id: string;
  userId: string;
  machineName: string;
  createdAt: string;
  updatedAt: string;
  isDeleted: boolean;
  blockCount: number;
  atCount: number;
  totalGames: number;
  userEmail: string;
  userAvatar: string | null;
}

type SortKey = "createdAt" | "updatedAt" | "userEmail" | "machineName" | "blockCount" | "totalGames";

export default function AdminPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "sessions">("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    if (!loading && !profile?.is_admin) router.replace("/dashboard");
  }, [loading, profile, router]);

  useEffect(() => {
    if (!profile?.is_admin) return;
    setLoadingData(true);
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()).then((d) => setUsers(Array.isArray(d) ? d : [])),
      fetch("/api/admin/sessions").then((r) => r.json()).then((d) => setSessions(Array.isArray(d) ? d : [])),
    ]).finally(() => setLoadingData(false));
  }, [profile]);

  async function togglePro(userId: string, currentPro: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, is_pro: !currentPro }),
    });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_pro: !currentPro } : u));
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) { setSortAsc(!sortAsc); }
    else { setSortKey(key); setSortAsc(true); }
  }

  const sortedSessions = [...sessions].sort((a, b) => {
    const va = a[sortKey];
    const vb = b[sortKey];
    const cmp = typeof va === "number" ? (va as number) - (vb as number) : String(va).localeCompare(String(vb));
    return sortAsc ? cmp : -cmp;
  });

  const sortIcon = (key: SortKey) => sortKey === key ? (sortAsc ? " ▲" : " ▼") : "";

  if (loading || !profile?.is_admin) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="font-mono text-gray-500">読み込み中...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 border-b-2 border-gray-600 shadow-md" style={{ backgroundColor: "#1f2937" }}>
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-gray-300 hover:text-white text-sm font-mono">← 戻る</a>
            <span className="font-mono font-bold text-white text-sm">管理者ページ</span>
          </div>
        </div>
        {/* タブバー */}
        <div className="flex max-w-4xl mx-auto">
          {(["users", "sessions"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 text-[12px] font-mono font-bold transition-colors"
              style={tab === t
                ? { color: "#f9fafb", borderBottom: "2px solid #ef4444" }
                : { color: "#6b7280", borderBottom: "2px solid transparent" }
              }>
              {t === "users" ? "ユーザー管理" : "セッション管理"}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* COMMANDER LAB リンク */}
        <a href="/admin/analytics"
          className="block w-full mb-6 px-4 py-3 rounded-xl font-mono font-bold text-sm text-center"
          style={{ backgroundColor: "#92400e", color: "#fef3c7" }}>
          COMMANDER LAB — クロス集計ダッシュボード →
        </a>

        {loadingData ? (
          <p className="text-gray-500 font-mono text-sm text-center py-8">読み込み中...</p>
        ) : tab === "users" ? (
          /* ===== ユーザー管理タブ ===== */
          <div>
            <h2 className="text-lg font-mono font-bold text-gray-900 mb-4">ユーザー管理 ({users.length}人)</h2>
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center gap-3">
                  {u.avatar_url && <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-sm text-gray-900 truncate">{u.display_name ?? u.email}</p>
                    <p className="font-mono text-[10px] text-gray-400 truncate">{u.email}</p>
                    <p className="font-mono text-[9px] text-gray-300">{new Date(u.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.is_admin && <span className="text-[9px] font-mono font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">ADMIN</span>}
                    <button onClick={() => togglePro(u.id, u.is_pro)}
                      className={`text-[11px] font-mono font-bold px-3 py-1.5 rounded transition-colors ${
                        u.is_pro ? "bg-purple-600 text-white hover:bg-purple-700" : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                      }`}>
                      {u.is_pro ? "PRO ✓" : "FREE"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ===== セッション管理タブ ===== */
          <div>
            <h2 className="text-lg font-mono font-bold text-gray-900 mb-4">セッション管理 ({sessions.length}件)</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px] font-mono">
                <thead>
                  <tr style={{ backgroundColor: "#1f2937" }}>
                    {([
                      { key: "createdAt" as SortKey, label: "作成日" },
                      { key: "userEmail" as SortKey, label: "ユーザー" },
                      { key: "machineName" as SortKey, label: "セッション名" },
                      { key: "blockCount" as SortKey, label: "周期" },
                      { key: "totalGames" as SortKey, label: "総G数" },
                    ]).map(({ key, label }) => (
                      <th key={key}
                        onClick={() => handleSort(key)}
                        className="text-left px-3 py-2 text-gray-300 font-bold cursor-pointer hover:text-white whitespace-nowrap"
                      >
                        {label}{sortIcon(key)}
                      </th>
                    ))}
                    <th className="px-3 py-2 text-gray-300 font-bold text-left">AT</th>
                    <th className="px-3 py-2 text-gray-300 font-bold text-left">状態</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSessions.map((s, i) => (
                    <tr key={s.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {new Date(s.createdAt).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          {s.userAvatar && <img src={s.userAvatar} alt="" className="w-5 h-5 rounded-full" />}
                          <span className="text-gray-700 truncate max-w-[120px]">{s.userEmail}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-900 font-bold truncate max-w-[180px]">{s.machineName}</td>
                      <td className="px-3 py-2 text-gray-600 text-right">{s.blockCount}</td>
                      <td className="px-3 py-2 text-gray-600 text-right">{s.totalGames > 0 ? s.totalGames.toLocaleString() : "—"}</td>
                      <td className="px-3 py-2">
                        {s.atCount > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: "#dcfce7", color: "#14532d" }}>
                            AT×{s.atCount}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {s.isDeleted ? (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">削除済</span>
                        ) : (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700">有効</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
