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
  adminRank: string | null;
  userEmail: string;
  userAvatar: string | null;
}

const RANK_OPTIONS = [
  { value: null, label: "—", bg: "#f3f4f6", color: "#6b7280" },
  { value: "S", label: "S", bg: "#fde047", color: "#92400e" },
  { value: "A", label: "A", bg: "#86efac", color: "#14532d" },
  { value: "B", label: "B", bg: "#93c5fd", color: "#1e3a5f" },
  { value: "C", label: "C", bg: "#d1d5db", color: "#374151" },
  { value: "X", label: "X", bg: "#fca5a5", color: "#991b1b" },
];

type SortKey = "createdAt" | "updatedAt" | "userEmail" | "machineName" | "blockCount" | "totalGames" | "adminRank";

export default function AdminPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"users" | "sessions">("users");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortAsc, setSortAsc] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  // 未保存の変更を追跡
  const [pendingRanks, setPendingRanks] = useState<Map<string, string | null>>(new Map());
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<string | null>(null);

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

  // ランク変更（ローカルのみ、保存ボタンで反映）
  function setLocalRank(sessionId: string, rank: string | null) {
    setPendingRanks((prev) => {
      const next = new Map(prev);
      next.set(sessionId, rank);
      return next;
    });
    // UIにも即座に反映
    setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, adminRank: rank } : s));
  }

  // 一括保存
  async function saveAllChanges() {
    if (pendingRanks.size === 0) return;
    setSaving(true);
    setSaveResult(null);
    let success = 0;
    let failed = 0;
    for (const [sessionId, rank] of pendingRanks) {
      try {
        const res = await fetch("/api/admin/sessions", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, adminRank: rank }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setPendingRanks(new Map());
    setSaving(false);
    setSaveResult(failed === 0 ? `${success}件 保存完了` : `${success}件 成功 / ${failed}件 失敗`);
    setTimeout(() => setSaveResult(null), 3000);
  }

  async function deleteSession(sessionId: string) {
    await fetch("/api/admin/sessions", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    pendingRanks.delete(sessionId);
    setDeleteConfirm(null);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  const sortedSessions = [...sessions].sort((a, b) => {
    const va = a[sortKey] ?? "";
    const vb = b[sortKey] ?? "";
    const cmp = typeof va === "number" ? (va as number) - (vb as number) : String(va).localeCompare(String(vb));
    return sortAsc ? cmp : -cmp;
  });

  const sortIcon = (key: SortKey) => sortKey === key ? (sortAsc ? " ▲" : " ▼") : "";
  const shortId = (id: string) => id.slice(0, 8);

  if (loading || !profile?.is_admin) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="font-mono text-gray-500">読み込み中...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 border-b-2 border-gray-600 shadow-md" style={{ backgroundColor: "#1f2937" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-gray-300 hover:text-white text-sm font-mono">← 戻る</a>
            <span className="font-mono font-bold text-white text-sm">管理者ページ</span>
          </div>
        </div>
        <div className="flex max-w-5xl mx-auto">
          {(["users", "sessions"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2 text-[12px] font-mono font-bold transition-colors"
              style={tab === t
                ? { color: "#f9fafb", borderBottom: "2px solid #ef4444" }
                : { color: "#6b7280", borderBottom: "2px solid transparent" }
              }>
              {t === "users" ? `ユーザー管理 (${users.length})` : `セッション管理 (${sessions.length})`}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <a href="/admin/analytics"
          className="block w-full mb-6 px-4 py-3 rounded-xl font-mono font-bold text-sm text-center"
          style={{ backgroundColor: "#92400e", color: "#fef3c7" }}>
          COMMANDER LAB — クロス集計ダッシュボード →
        </a>

        {loadingData ? (
          <p className="text-gray-500 font-mono text-sm text-center py-8">読み込み中...</p>
        ) : tab === "users" ? (
          <div>
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
          <div>
            {/* 保存バー */}
            <div className="sticky top-[90px] z-30 bg-white border border-gray-200 rounded-lg shadow-md px-4 py-2 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {pendingRanks.size > 0 && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                    {pendingRanks.size}件の未保存変更
                  </span>
                )}
                {saveResult && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">
                    {saveResult}
                  </span>
                )}
              </div>
              <button
                onClick={saveAllChanges}
                disabled={pendingRanks.size === 0 || saving}
                className="text-[12px] font-mono font-bold px-5 py-2 rounded-lg transition-all active:scale-95"
                style={{
                  backgroundColor: pendingRanks.size > 0 ? "#b91c1c" : "#d1d5db",
                  color: pendingRanks.size > 0 ? "#ffffff" : "#9ca3af",
                  cursor: pendingRanks.size > 0 ? "pointer" : "not-allowed",
                }}
              >
                {saving ? "保存中..." : "変更を保存"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[11px] font-mono">
                <thead>
                  <tr style={{ backgroundColor: "#1f2937" }}>
                    <th className="text-left px-2 py-2 text-gray-400 font-bold whitespace-nowrap">ID</th>
                    {([
                      { key: "createdAt" as SortKey, label: "作成日" },
                      { key: "userEmail" as SortKey, label: "ユーザー" },
                      { key: "machineName" as SortKey, label: "セッション名" },
                      { key: "blockCount" as SortKey, label: "周期" },
                      { key: "totalGames" as SortKey, label: "総G数" },
                    ]).map(({ key, label }) => (
                      <th key={key} onClick={() => handleSort(key)}
                        className="text-left px-2 py-2 text-gray-300 font-bold cursor-pointer hover:text-white whitespace-nowrap">
                        {label}{sortIcon(key)}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-gray-300 font-bold text-left">AT</th>
                    <th onClick={() => handleSort("adminRank")}
                      className="px-2 py-2 text-gray-300 font-bold text-left cursor-pointer hover:text-white whitespace-nowrap">
                      ランク{sortIcon("adminRank")}
                    </th>
                    <th className="px-2 py-2 text-gray-300 font-bold text-left">状態</th>
                    <th className="px-2 py-2 text-gray-300 font-bold text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSessions.map((s, i) => {
                    const hasPending = pendingRanks.has(s.id);
                    return (
                      <tr key={s.id}
                        className="border-b border-gray-200 hover:bg-blue-50 transition-colors"
                        style={{
                          backgroundColor: hasPending ? "#fffbeb" : s.isDeleted ? "#fef2f2" : i % 2 === 0 ? "#ffffff" : "#f9fafb",
                        }}>
                        <td className="px-2 py-2">
                          <span className="text-[9px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded select-all"
                            title={s.id}>{shortId(s.id)}</span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-gray-600">
                          {new Date(s.createdAt).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1">
                            {s.userAvatar && <img src={s.userAvatar} alt="" className="w-4 h-4 rounded-full" />}
                            <span className="text-gray-700 truncate max-w-[100px]">{s.userEmail}</span>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-gray-900 font-bold truncate max-w-[150px]">{s.machineName}</td>
                        <td className="px-2 py-2 text-gray-600 text-right">{s.blockCount}</td>
                        <td className="px-2 py-2 text-gray-600 text-right">{s.totalGames > 0 ? s.totalGames.toLocaleString() : "—"}</td>
                        <td className="px-2 py-2">
                          {s.atCount > 0 && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ backgroundColor: "#dcfce7", color: "#14532d" }}>
                              ×{s.atCount}
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex gap-0.5">
                            {RANK_OPTIONS.map((opt) => (
                              <button key={opt.label} onClick={() => setLocalRank(s.id, opt.value)}
                                className="text-[8px] font-mono font-black w-5 h-5 rounded flex items-center justify-center transition-transform active:scale-90"
                                style={{
                                  backgroundColor: s.adminRank === opt.value ? opt.bg : "#f3f4f6",
                                  color: s.adminRank === opt.value ? opt.color : "#d1d5db",
                                  border: s.adminRank === opt.value ? `2px solid ${opt.color}` : "1px solid #e5e7eb",
                                }}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {s.isDeleted ? (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-red-100 text-red-600">削除済</span>
                          ) : (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-green-100 text-green-700">有効</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <button onClick={() => setDeleteConfirm(s.id)}
                            className="text-[9px] font-mono text-red-400 hover:text-red-600 transition-colors">🗑</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* 削除確認ダイアログ */}
      {deleteConfirm && (() => {
        const s = sessions.find((x) => x.id === deleteConfirm);
        return s ? (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
            onClick={(e) => e.target === e.currentTarget && setDeleteConfirm(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="bg-red-700 px-5 py-4">
                <p className="text-white font-mono font-bold text-sm">⚠ 完全削除の確認</p>
              </div>
              <div className="px-5 py-4 space-y-2">
                <p className="text-gray-900 font-mono text-sm font-bold">このセッションをDBから完全に削除します。</p>
                <div className="bg-gray-100 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-700 space-y-0.5">
                  <p>ID: {shortId(s.id)}</p>
                  <p>セッション名: {s.machineName}</p>
                  <p>ユーザー: {s.userEmail}</p>
                  <p>周期: {s.blockCount} / 総G: {s.totalGames}</p>
                </div>
                <p className="text-red-600 font-mono text-xs font-bold">この操作は取り消せません。</p>
              </div>
              <div className="flex border-t border-gray-200">
                <button onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-4 text-sm font-mono font-bold text-gray-600 hover:bg-gray-50 border-r border-gray-200">キャンセル</button>
                <button onClick={() => deleteSession(s.id)}
                  className="flex-1 py-4 text-sm font-mono font-bold text-white bg-red-600 hover:bg-red-700">完全削除</button>
              </div>
            </div>
          </div>
        ) : null;
      })()}
    </div>
  );
}
