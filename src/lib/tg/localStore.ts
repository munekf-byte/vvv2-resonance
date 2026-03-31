// =============================================================================
// TOKYO GHOUL RESONANCE: localStorage セッション永続化
// Supabase 認証バイパス中の一次ストレージ
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
}

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
    const meta: SessionMeta = {
      id: session.id,
      machineName: session.machineName,
      createdAt: session.createdAt,
      updatedAt: new Date().toISOString(),
      blockCount: session.normalBlocks.length,
      atCount: session.normalBlocks.filter((b) => b.atWin).length,
    };
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) list[idx] = meta;
    else list.unshift(meta);
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch { /* storage full etc — ignore */ }
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
}

export function lsCreateSession(machineName: string): PlaySession {
  const id = `local-${crypto.randomUUID()}`;
  const now = new Date().toISOString();
  const session: PlaySession = {
    id,
    userId: "guest-user",
    machineName,
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
    createdAt: now,
    updatedAt: now,
  };
  lsSaveSession(session);
  return session;
}
