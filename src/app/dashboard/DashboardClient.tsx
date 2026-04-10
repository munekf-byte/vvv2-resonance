"use client";
// =============================================================================
// TOKYO GHOUL RESONANCE: ダッシュボード Client
// 論理削除 + 無料プラン3件制限（作成ブロック方式）
// =============================================================================

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthContext";
import {
  lsGetSessionList, lsDeleteSession,
  dbGetSessionList, createSessionWithCloud,
  type SessionMeta,
} from "@/lib/tg/localStore";
import { FREE_SESSION_LIMIT } from "@/lib/auth/access";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function DashboardClient() {
  const router = useRouter();
  const { profile } = useAuth();
  const isPro = profile?.is_pro ?? false;
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [sessionName, setSessionName] = useState("");
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [hallName, setHallName] = useState("");
  const [machineNumber, setMachineNumber] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() {
    setLoading(true);
    console.log("[Dashboard] loading sessions from cloud...");
    const cloud = await dbGetSessionList();
    console.log("[Dashboard] cloud returned", cloud.length, "sessions");
    // DBが絶対正義: クラウドデータでlocalStorageを無条件上書き
    setSessions(cloud);
    try {
      localStorage.setItem("tgr_sessions", JSON.stringify(cloud));
    } catch {}
    setLoading(false);
  }

  function handleNewSession() {
    // 無料プラン: 有効セッション3件以上なら作成ブロック
    if (!isPro && sessions.length >= FREE_SESSION_LIMIT) {
      setShowLimitDialog(true);
      return;
    }
    setShowModal(true);
  }

  function generateAutoName(): string {
    const d = sessionDate ? sessionDate.replace(/-/g, "/").slice(5) : "-";
    const h = hallName.trim() || "-";
    const m = machineNumber.trim() ? `[${machineNumber.trim()}]番台` : "-";
    return `${d} ${h} ${m}`;
  }

  async function handleCreateWithName(name: string) {
    if (creating) return;
    setCreating(true);
    const session = await createSessionWithCloud(name);
    setShowModal(false);
    setSessionName("");
    setHallName("");
    setMachineNumber("");
    setCreating(false);
    router.push(`/play/${session.id}`);
  }

  async function handleCreate() {
    const name = sessionName.trim() || "東京喰種 RESONANCE";
    await handleCreateWithName(name);
  }

  async function handleAutoCreate() {
    await handleCreateWithName(generateAutoName());
  }

  function handleOpen(id: string) {
    router.push(`/play/${id}`);
  }

  async function handleDelete(id: string) {
    // 論理削除: API経由で is_deleted=true + localStorage削除
    lsDeleteSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setDeleteConfirmId(null);
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <p className="text-center text-gray-500 font-mono py-8 text-sm">読み込み中...</p>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">📋</span>
          <p className="text-gray-600 text-sm font-mono">稼働セッションがまだありません</p>
          <p className="text-gray-400 text-xs font-mono">「＋ 新規セッション開始」で記録を始めましょう</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* 全件表示（slice なし） */}
          {sessions.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-stretch">
                <button onClick={() => handleOpen(s.id)}
                  className="flex-1 text-left px-3 py-2.5 hover:bg-gray-50 transition-colors min-w-0">
                  {/* セッション名 */}
                  <p className="font-mono font-bold text-gray-900 text-[13px] break-all line-clamp-2 leading-tight">{s.machineName}</p>
                  {/* 稼働実績バッジ（固定位置グリッド） */}
                  <div className="grid grid-cols-2 gap-x-1.5 gap-y-1 mt-1.5">
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: "#e0e7ff", color: "#3730a3" }}>
                      総G数 {s.totalGames > 0 ? `${s.totalGames.toLocaleString()}G` : "—"}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: "#dcfce7", color: "#14532d" }}>
                      AT初当たり {s.atCount > 0 ? `${s.atCount}回` : "—"}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: s.balance != null ? (s.balance >= 0 ? "#f0fdf4" : "#fef2f2") : "#f3f4f6",
                        color: s.balance != null ? (s.balance >= 0 ? "#16a34a" : "#dc2626") : "#9ca3af",
                      }}>
                      収支 {s.balance != null ? `${s.balance >= 0 ? "+" : ""}${s.balance.toLocaleString()}枚` : "—"}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded truncate"
                      style={{
                        backgroundColor: s.settingHint ? "#fef3c7" : "#f3f4f6",
                        color: s.settingHint ? "#92400e" : "#9ca3af",
                      }}>
                      確定 {s.settingHint || "—"}
                    </span>
                    <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded truncate col-span-2"
                      style={{
                        backgroundColor: s.userSettingGuess ? "#fce7f3" : "#f3f4f6",
                        color: s.userSettingGuess ? "#9d174d" : "#9ca3af",
                      }}>
                      推測 {s.userSettingGuess || "—"}
                    </span>
                  </div>
                </button>
                <div className="flex flex-col border-l border-gray-200 shrink-0">
                  <button onClick={() => handleOpen(s.id)}
                    className="flex-1 px-3 text-[11px] font-mono font-bold text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-200 whitespace-nowrap">
                    再開
                  </button>
                  {deleteConfirmId === s.id ? (
                    <div className="flex">
                      <button onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 px-2 py-2 text-[10px] font-mono text-gray-500 hover:bg-gray-50 border-r border-gray-200">戻る</button>
                      <button onClick={() => handleDelete(s.id)}
                        className="flex-1 px-2 py-2 text-[10px] font-mono font-bold text-white bg-red-600 hover:bg-red-700">削除</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirmId(s.id)}
                      className="flex-1 px-3 text-[11px] font-mono text-red-400 hover:bg-red-50 transition-colors">削除</button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* 無課金者: セッション数表示 */}
          {!isPro && (
            <p className="text-center text-[10px] font-mono text-gray-400">
              {sessions.length} / {FREE_SESSION_LIMIT} セッション使用中
            </p>
          )}
        </div>
      )}

      {/* 新規セッションボタン */}
      <button onClick={handleNewSession}
        className="w-full flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 active:bg-red-900 text-white font-mono font-bold text-sm rounded-xl px-4 py-4 transition-all duration-150 shadow-md">
        <span className="text-base">＋</span>
        <span>新規セッション開始</span>
      </button>

      {/* ===== 無料プラン制限ダイアログ ===== */}
      {showLimitDialog && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4"
          onClick={(e) => e.target === e.currentTarget && setShowLimitDialog(false)}>
          <div className="rounded-2xl shadow-xl w-full max-w-sm overflow-hidden" style={{ backgroundColor: "#f5f0e8" }}>
            <div className="px-5 py-5 space-y-3">
              <p className="font-mono font-bold text-gray-900 text-base">無料プランの制限</p>
              <p className="font-mono text-gray-700 text-sm leading-relaxed">
                無料プランの記録可能セッション数（{FREE_SESSION_LIMIT}件）を超えています。
                これ以上のセッションを記録したい場合は、過去のセッションを削除するか、プロプランへのアップグレードをお願いします。
              </p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => setShowLimitDialog(false)}
                  className="flex-1 py-3 rounded-lg border-2 border-gray-300 text-gray-600 font-mono text-sm font-bold hover:bg-white/50 transition-colors"
                  style={{ backgroundColor: "rgba(255,255,255,0.3)" }}>
                  OK
                </button>
                <button onClick={() => { setShowLimitDialog(false); /* TODO: Pro詳細ページ */ }}
                  className="flex-1 py-3 rounded-lg text-white font-mono text-sm font-bold transition-colors"
                  style={{ backgroundColor: "#7c3aed" }}>
                  プロプランの詳細
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== セッション作成モーダル ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
          onClick={(e) => !creating && e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden relative">

            {/* 作成中オーバーレイ */}
            {creating && (
              <div className="absolute inset-0 z-10 bg-white/80 flex flex-col items-center justify-center gap-3 rounded-2xl">
                <div className="w-8 h-8 border-4 border-gray-300 border-t-red-600 rounded-full animate-spin" />
                <p className="text-sm font-mono font-bold text-gray-700">セッション作成中...</p>
              </div>
            )}

            <div className="px-5 py-4 border-b border-gray-200" style={{ backgroundColor: "#1f2937" }}>
              <p className="text-white font-mono font-bold text-sm">新規セッション開始</p>
            </div>
            <div className="px-5 py-4 space-y-3">

              {/* 日付 */}
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1">日付</p>
                <input type="date"
                  className="w-full text-sm font-mono border-2 border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-gray-500"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                />
              </div>

              {/* ホール名 */}
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1">ホール名</p>
                <input type="text" placeholder="例: マルハン新宿"
                  className="w-full text-sm font-mono border-2 border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-gray-500"
                  value={hallName}
                  onChange={(e) => setHallName(e.target.value)}
                  maxLength={20}
                />
              </div>

              {/* 台番号 */}
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1">台番号</p>
                <input type="text" inputMode="numeric" placeholder="例: 123"
                  className="w-full text-sm font-mono border-2 border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-gray-500"
                  value={machineNumber}
                  onChange={(e) => setMachineNumber(e.target.value)}
                  maxLength={10}
                />
              </div>

              {/* 上記の情報でセッション作成 */}
              <button
                onClick={handleAutoCreate}
                className="w-full py-3 rounded-lg font-mono font-bold text-sm active:scale-95 transition-transform"
                style={{ backgroundColor: "#b91c1c", color: "#fff" }}
                disabled={creating}
              >
                上記の情報でセッション開始
              </button>

              {/* プレビュー */}
              <p className="text-[10px] font-mono text-gray-400 text-center">
                → {generateAutoName()}
              </p>

              {/* セパレーター */}
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-gray-300" />
                <span className="text-[9px] font-mono text-gray-400">または</span>
                <div className="flex-1 border-t border-gray-300" />
              </div>

              {/* フリー入力 */}
              <div>
                <p className="text-[10px] font-mono text-gray-500 mb-1">セッション名（フリー入力）</p>
                <input type="text" placeholder="例: 東京喰種 夕方実戦"
                  className="w-full text-sm font-mono border-2 border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-gray-500"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  maxLength={30}
                />
              </div>

              {/* フリー入力でのアクションボタン */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => { setShowModal(false); setSessionName(""); setHallName(""); setMachineNumber(""); }}
                  className="flex-1 py-3 rounded-lg border-2 border-gray-300 text-gray-600 font-mono text-sm font-bold hover:bg-gray-50"
                  disabled={creating}
                >
                  キャンセル
                </button>
                <button
                  onClick={handleCreate}
                  className="flex-1 py-3 rounded-lg text-white font-mono text-sm font-bold active:scale-95 transition-transform"
                  style={{ backgroundColor: "#374151" }}
                  disabled={creating}
                >
                  この題名にする
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
