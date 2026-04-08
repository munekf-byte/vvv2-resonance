// =============================================================================
// TOKYO GHOUL RESONANCE: セッション永続化
// localStorage (即時) + Supabase API (非同期)
// =============================================================================

import type { PlaySession } from "@/types";

const LIST_KEY = "tgr_sessions";
const sessionKey = (id: string) => `tgr_session_${id}`;

export interface SessionMeta {
  id: string;
  machineName: string;
  createdAt: string;
  updatedAt: string;
  blockCount: number;
  atCount: number;
  totalGames: number;
  balance: number | null;
}

// ── localStorage 操作 ──────────────────────────────────────────────────────

export function lsGetSessionList(): SessionMeta[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LIST_KEY);
    return raw ? (JSON.parse(raw) as SessionMeta[]) : [];
  } catch { return []; }
}

export function lsSaveSession(session: PlaySession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(sessionKey(session.id), JSON.stringify(session));
    const list = lsGetSessionList();
    const totalGames = session.normalBlocks.reduce((sum, b) => sum + (b.jisshuG ?? 0), 0);
    const sh = session.shushi;
    const balance = sh
      ? (sh.exchangeCoins ?? 0) - ((sh.handCoins ?? 0) + (sh.cashInvestK ?? 0) * sh.coinRate)
      : null;
    const meta: SessionMeta = {
      id: session.id,
      machineName: session.machineName,
      createdAt: session.createdAt,
      updatedAt: new Date().toISOString(),
      blockCount: session.normalBlocks.length,
      atCount: session.normalBlocks.filter((b) => b.atWin).length,
      totalGames,
      balance,
    };
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) list[idx] = meta;
    else list.unshift(meta);
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch { /* storage full */ }

  // Supabase 非同期保存（失敗しても無視）
  dbSaveSession(session);
}

export function lsLoadSession(id: string): PlaySession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(sessionKey(id));
    return raw ? (JSON.parse(raw) as PlaySession) : null;
  } catch { return null; }
}

export function lsDeleteSession(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(sessionKey(id));
    const list = lsGetSessionList().filter((s) => s.id !== id);
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch {}

  // Supabase からも削除
  fetch(`/api/session/${id}`, { method: "DELETE" }).catch(() => {});
}

// ── Supabase 連携 ──────────────────────────────────────────────────────────

/** Supabase にセッション作成し、IDを返す */
export async function dbCreateSession(machineName: string): Promise<{ id: string; userId: string } | null> {
  try {
    const res = await fetch("/api/session/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machineName }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** Supabase からセッション一覧を取得 */
export async function dbGetSessionList(): Promise<SessionMeta[]> {
  try {
    const res = await fetch("/api/sessions");
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

/** Supabase にセッションを保存（debounce無し・呼び出し側でdebounceすること） */
function dbSaveSession(session: PlaySession): void {
  fetch(`/api/session/${session.id}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(session),
  }).catch(() => {});
}

/** Supabase からセッション全体を読み込む */
export async function dbLoadSession(id: string): Promise<PlaySession | null> {
  try {
    const res = await fetch(`/api/session/${id}/load`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/** localStorage 用のセッションを作成 + Supabase にも保存 */
export async function createSessionWithCloud(machineName: string): Promise<PlaySession> {
  // まず Supabase に作成
  const dbResult = await dbCreateSession(machineName);

  const id = dbResult?.id ?? `local-${crypto.randomUUID()}`;
  const userId = dbResult?.userId ?? "guest-user";
  const now = new Date().toISOString();

  const session: PlaySession = {
    id,
    userId,
    machineName: machineName || "東京喰種 RESONANCE",
    startedAt: now,
    endedAt: null,
    status: "ACTIVE",
    startDiff: 0,
    initialThroughCount: 0,
    normalBlocks: [],
    atEntries: [],
    summary: null,
    modeInferences: [],
    memo: null,
    uchidashi: null,
    shushi: null,
    createdAt: now,
    updatedAt: now,
  };
  lsSaveSession(session);
  return session;
}
