"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: ダッシュボード Client
// localStorage のセッション一覧を表示 / 新規セッション作成 / 削除
// =============================================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { lsGetSessionList, lsCreateSession, lsDeleteSession, type SessionMeta } from "@/lib/tg/localStore";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function DashboardClient() {
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setSessions(lsGetSessionList());
  }, []);

  function handleCreate() {
    const name = sessionName.trim() || "東京喰種 RESONANCE";
    const session = lsCreateSession(name);
    setSessions(lsGetSessionList());
    setShowModal(false);
    setSessionName("");
    router.push(`/play/${session.id}`);
  }

  function handleOpen(id: string) {
    router.push(`/play/${id}`);
  }

  function handleDelete(id: string) {
    lsDeleteSession(id);
    setSessions(lsGetSessionList());
    setDeleteConfirmId(null);
  }

  return (
    <div className="space-y-4">

      {/* ===== セッション一覧 ===== */}
      {sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-gray-600 text-sm font-mono">稼働セッションがまだありません</p>
          <p className="text-gray-400 text-xs font-mono">「＋ 新規セッション開始」で記録を始めましょう</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="flex items-stretch">
                {/* セッション情報 */}
                <button
                  onClick={() => handleOpen(s.id)}
                  className="flex-1 text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                >
                  <p className="font-mono font-bold text-gray-900 text-sm truncate">{s.machineName}</p>
                  <div className="flex gap-3 mt-1">
                    <span className="text-[11px] font-mono text-gray-500">{formatDate(s.updatedAt)}</span>
                    <span className="text-[11px] font-mono text-gray-500">{s.blockCount} 周期</span>
                    {s.atCount > 0 && (
                      <span className="text-[11px] font-mono font-bold text-green-700">AT ×{s.atCount}</span>
                    )}
                  </div>
                </button>

                {/* 操作ボタン */}
                <div className="flex flex-col border-l border-gray-200">
                  <button
                    onClick={() => handleOpen(s.id)}
                    className="flex-1 px-3 text-[11px] font-mono font-bold text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-200 whitespace-nowrap"
                  >
                    再開
                  </button>
                  {deleteConfirmId === s.id ? (
                    <div className="flex">
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 px-2 py-2 text-[10px] font-mono text-gray-500 hover:bg-gray-50 border-r border-gray-200"
                      >
                        戻る
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="flex-1 px-2 py-2 text-[10px] font-mono font-bold text-white bg-red-600 hover:bg-red-700"
                      >
                        削除
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(s.id)}
                      className="flex-1 px-3 text-[11px] font-mono text-red-400 hover:bg-red-50 transition-colors"
                    >
                      削除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===== 新規セッションボタン ===== */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-mono font-bold text-sm rounded-xl px-4 py-4 transition-all duration-150 shadow-md"
      >
        <span className="text-base">＋</span>
        <span>新規セッション開始</span>
      </button>

      {/* ===== セッション名入力モーダル ===== */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
          onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div
              className="px-5 py-4 border-b border-gray-200"
              style={{ backgroundColor: "#1f2937" }}
            >
              <p className="text-white font-mono font-bold text-sm">新規セッション開始</p>
              <p className="text-gray-400 text-xs font-mono mt-0.5">セッション名を入力してください</p>
            </div>
            <div className="px-5 py-5 space-y-4">
              <input
                type="text"
                autoFocus
                placeholder="例: 台番123 / 〇〇ホール"
                className="w-full text-sm font-mono border-2 border-gray-300 rounded-lg px-3 py-3 focus:outline-none focus:border-gray-500"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                maxLength={30}
              />
              <p className="text-[11px] text-gray-400 font-mono">
                ※ 空欄の場合は「東京喰種 RESONANCE」で作成されます
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowModal(false); setSessionName(""); }}
                  className="flex-1 py-3 rounded-lg border-2 border-gray-300 text-gray-600 font-mono text-sm font-bold hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 py-3 rounded-lg text-white font-mono text-sm font-bold transition-colors"
                  style={{ backgroundColor: "#b91c1c" }}
                >
                  開始
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
