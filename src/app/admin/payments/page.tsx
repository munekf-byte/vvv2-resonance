"use client";
import { useAuth } from "@/components/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface PaymentRow {
  id: string;
  user_id: string;
  email: string;
  payment_method: string;
  payment_date: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  approved_at: string | null;
  discord_id: string | null;
}

type StatusFilter = "pending" | "approved" | "rejected" | "all";

export default function AdminPaymentsPage() {
  const { profile, loading } = useAuth();
  const router = useRouter();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; type: "approve" | "reject" } | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !profile?.is_admin) router.replace("/dashboard");
  }, [loading, profile, router]);

  async function loadList() {
    setLoadingData(true);
    try {
      const res = await fetch(`/api/admin/payments?status=${statusFilter}`);
      const data = await res.json();
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("[admin/payments] load failed:", e);
      setRows([]);
    } finally {
      setLoadingData(false);
    }
  }

  useEffect(() => {
    if (!profile?.is_admin) return;
    loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, statusFilter]);

  async function executeAction() {
    if (!confirmAction) return;
    const { id, type } = confirmAction;
    setActingId(id);
    try {
      const endpoint = type === "approve" ? "/api/admin/payments/approve" : "/api/admin/payments/reject";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: id, adminNote: adminNote || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setResultMsg(`${type === "approve" ? "承認" : "却下"}失敗: ${body?.error || res.status}`);
      } else {
        setResultMsg(`${type === "approve" ? "承認" : "却下"}完了`);
        await loadList();
      }
    } catch (e) {
      setResultMsg(`通信エラー: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setActingId(null);
      setConfirmAction(null);
      setAdminNote("");
      setTimeout(() => setResultMsg(null), 3000);
    }
  }

  if (loading || !profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="font-mono text-gray-500">読み込み中...</p>
      </div>
    );
  }

  const statusLabel: Record<StatusFilter, string> = {
    pending: "確認待ち",
    approved: "承認済み",
    rejected: "却下済み",
    all: "全て",
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="sticky top-0 z-40 border-b-2 border-gray-600 shadow-md" style={{ backgroundColor: "#1f2937" }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-gray-300 hover:text-white text-sm font-mono">← 戻る</a>
            <span className="font-mono font-bold text-white text-sm">送金報告 管理</span>
          </div>
        </div>
        <div className="flex max-w-5xl mx-auto">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="flex-1 py-2 text-[12px] font-mono font-bold transition-colors"
              style={statusFilter === s
                ? { color: "#f9fafb", borderBottom: "2px solid #ef4444" }
                : { color: "#6b7280", borderBottom: "2px solid transparent" }
              }>
              {statusLabel[s]}{statusFilter === s ? ` (${rows.length})` : ""}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {resultMsg && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-green-100 border border-green-300 text-green-800 font-mono text-sm text-center">
            {resultMsg}
          </div>
        )}

        {loadingData ? (
          <p className="text-gray-500 font-mono text-sm text-center py-8">読み込み中...</p>
        ) : rows.length === 0 ? (
          <p className="text-gray-500 font-mono text-sm text-center py-8">該当する送金報告はありません。</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-bold text-sm text-gray-900 truncate">{r.email}</p>
                    <p className="font-mono text-[10px] text-gray-400 truncate">user_id: {r.user_id}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      r.status === "pending" ? "bg-amber-100 text-amber-700" :
                      r.status === "approved" ? "bg-green-100 text-green-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {r.status.toUpperCase()}
                    </span>
                    <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      r.discord_id
                        ? "bg-green-100 text-green-700 border border-green-300"
                        : "bg-gray-100 text-gray-500 border border-gray-300"
                    }`}>
                      {r.discord_id ? "Discord 連携済み ✅" : "Discord 未連携"}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-700 mb-3">
                  <div>
                    <span className="text-gray-400">送金方法:</span> {r.payment_method}
                  </div>
                  <div>
                    <span className="text-gray-400">金額:</span> ¥{r.amount.toLocaleString()}
                  </div>
                  <div>
                    <span className="text-gray-400">送金日時:</span> {new Date(r.payment_date).toLocaleString("ja-JP")}
                  </div>
                  <div>
                    <span className="text-gray-400">申請日時:</span> {new Date(r.created_at).toLocaleString("ja-JP")}
                  </div>
                  {r.approved_at && (
                    <div className="col-span-2">
                      <span className="text-gray-400">承認日時:</span> {new Date(r.approved_at).toLocaleString("ja-JP")}
                    </div>
                  )}
                  {r.admin_note && (
                    <div className="col-span-2">
                      <span className="text-gray-400">管理者メモ:</span> {r.admin_note}
                    </div>
                  )}
                </div>

                {r.status === "pending" && (
                  <div className="flex gap-2 pt-2 border-t border-gray-100">
                    <button
                      onClick={() => setConfirmAction({ id: r.id, type: "reject" })}
                      disabled={actingId === r.id}
                      className="flex-1 py-2 rounded-lg text-[12px] font-mono font-bold transition-all active:scale-95"
                      style={{ backgroundColor: "#f3f4f6", color: "#991b1b", border: "1px solid #d1d5db" }}>
                      却下
                    </button>
                    <button
                      onClick={() => setConfirmAction({ id: r.id, type: "approve" })}
                      disabled={actingId === r.id}
                      className="flex-1 py-2 rounded-lg text-[12px] font-mono font-bold transition-all active:scale-95"
                      style={{ backgroundColor: "#7c3aed", color: "#ffffff" }}>
                      承認 → Pro昇格
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {confirmAction && (() => {
        const r = rows.find((x) => x.id === confirmAction.id);
        if (!r) return null;
        const isApprove = confirmAction.type === "approve";
        return (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
            onClick={(e) => e.target === e.currentTarget && setConfirmAction(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="px-5 py-4" style={{ backgroundColor: isApprove ? "#7c3aed" : "#b91c1c" }}>
                <p className="text-white font-mono font-bold text-sm">
                  {isApprove ? "✓ Pro昇格 承認" : "✗ 送金報告 却下"}
                </p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="bg-gray-100 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-700 space-y-0.5">
                  <p>{r.email}</p>
                  <p>送金日時: {new Date(r.payment_date).toLocaleString("ja-JP")}</p>
                  <p>金額: ¥{r.amount.toLocaleString()}</p>
                </div>
                {isApprove ? (
                  <p className="text-gray-900 font-mono text-xs">
                    承認すると、ユーザーは即時 Pro 昇格し、ポップアップ・昇格メール・Discordロール付与が自動で実行されます。
                  </p>
                ) : (
                  <p className="text-gray-900 font-mono text-xs">
                    却下します。ユーザーには Pro 昇格は行われません。
                  </p>
                )}
                <div>
                  <label className="text-[11px] font-mono text-gray-500 block mb-1">管理者メモ（任意）</label>
                  <textarea
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1.5 text-[12px] font-mono border border-gray-300 rounded resize-none"
                    placeholder="例: PayPay受領確認済 / 送金履歴に該当なし 等"
                  />
                </div>
              </div>
              <div className="flex border-t border-gray-200">
                <button onClick={() => { setConfirmAction(null); setAdminNote(""); }}
                  className="flex-1 py-4 text-sm font-mono font-bold text-gray-600 hover:bg-gray-50 border-r border-gray-200">
                  キャンセル
                </button>
                <button onClick={executeAction} disabled={actingId === r.id}
                  className="flex-1 py-4 text-sm font-mono font-bold text-white"
                  style={{ backgroundColor: isApprove ? "#7c3aed" : "#b91c1c" }}>
                  {actingId === r.id ? "処理中..." : isApprove ? "承認実行" : "却下実行"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
