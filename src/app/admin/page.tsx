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

export default function AdminPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    if (!loading && !profile?.is_admin) {
      router.replace("/dashboard");
    }
  }, [loading, profile, router]);

  useEffect(() => {
    if (profile?.is_admin) {
      fetch("/api/admin/users")
        .then((r) => r.json())
        .then(setUsers)
        .finally(() => setLoadingUsers(false));
    }
  }, [profile]);

  async function togglePro(userId: string, currentPro: boolean) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, is_pro: !currentPro }),
    });
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_pro: !currentPro } : u));
  }

  if (loading || !profile?.is_admin) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <p className="font-mono text-gray-500">読み込み中...</p>
    </div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 border-b-2 border-gray-600 shadow-md" style={{ backgroundColor: "#1f2937" }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-gray-300 hover:text-white text-sm font-mono">← 戻る</a>
            <span className="font-mono font-bold text-white text-sm">管理者ページ</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-lg font-mono font-bold text-gray-900 mb-4">ユーザー管理</h1>

        {loadingUsers ? (
          <p className="text-gray-500 font-mono text-sm">読み込み中...</p>
        ) : (
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
                  <button
                    onClick={() => togglePro(u.id, u.is_pro)}
                    className={`text-[11px] font-mono font-bold px-3 py-1.5 rounded transition-colors ${
                      u.is_pro
                        ? "bg-purple-600 text-white hover:bg-purple-700"
                        : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                    }`}
                  >
                    {u.is_pro ? "PRO ✓" : "FREE"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
