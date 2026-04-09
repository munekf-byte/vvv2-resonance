// =============================================================================
// TOKYO GHOUL RESONANCE: セッション永続化
// DB (Supabase) を正とし、localStorage はキャッシュ/オフライン用
// DB保存: debounce + リトライ（最大3回）+ 状態管理
// =============================================================================

import type { PlaySession, TGATSet } from "@/types";
import { inferSetting } from "@/components/tg/SummaryTab";

const LIST_KEY = "tgr_sessions";
const sessionKey = (id: string) => `tgr_session_${id}`;
const PENDING_KEY = "tgr_pending_saves";

export interface SessionMeta {
  id: string;
  machineName: string;
  createdAt: string;
  updatedAt: string;
  blockCount: number;
  atCount: number;
  totalGames: number;
  balance: number | null;
  settingHint: string;
  userSettingGuess: string;
}

// ── DB同期状態 ──────────────────────────────────────────────────────────────

export type SyncStatus = "synced" | "saving" | "pending" | "error" | "auth_error";

type SyncListener = (status: SyncStatus) => void;
const syncListeners = new Set<SyncListener>();
let currentSyncStatus: SyncStatus = "synced";

export function onSyncStatusChange(listener: SyncListener): () => void {
  syncListeners.add(listener);
  listener(currentSyncStatus);
  return () => syncListeners.delete(listener);
}

function setSyncStatus(status: SyncStatus) {
  currentSyncStatus = status;
  syncListeners.forEach((l) => l(status));
}

// ── 未保存セッションID管理 ──────────────────────────────────────────────────

function getPendingSaves(): Set<string> {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
  } catch { return new Set(); }
}

function addPendingSave(id: string) {
  const set = getPendingSaves();
  set.add(id);
  localStorage.setItem(PENDING_KEY, JSON.stringify([...set]));
}

function removePendingSave(id: string) {
  const set = getPendingSaves();
  set.delete(id);
  localStorage.setItem(PENDING_KEY, JSON.stringify([...set]));
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
    const czFail = session.normalBlocks.filter((b) => b.endingSuggestion.startsWith("[cz失敗]")).map((b) => b.endingSuggestion);
    const allSets = session.atEntries.flatMap((e) => e.rows.filter((r): r is TGATSet => r.rowType === "set"));
    const endScreen = allSets.map((s) => s.endingSuggestion ?? "").filter((s) => s.startsWith("[終了画面]"));
    const settingHint = inferSetting(czFail, endScreen, session.normalBlocks, session.atEntries);
    const meta: SessionMeta = {
      id: session.id,
      machineName: session.machineName,
      createdAt: session.createdAt,
      updatedAt: new Date().toISOString(),
      blockCount: session.normalBlocks.length,
      atCount: session.normalBlocks.filter((b) => b.atWin).length,
      totalGames,
      balance,
      settingHint,
      userSettingGuess: session.userSettingGuess ?? "",
    };
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) list[idx] = meta;
    else list.unshift(meta);
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch { /* storage full */ }

  // DB保存（debounce + リトライ）
  addPendingSave(session.id);
  debouncedDbSave(session);
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
  fetch(`/api/session/${id}`, { method: "DELETE" }).catch(() => {});
}

// ── DB保存（リトライ付き） ──────────────────────────────────────────────────

const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 3000, 8000]; // 1秒, 3秒, 8秒

function debouncedDbSave(session: PlaySession) {
  const existing = debounceTimers.get(session.id);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    debounceTimers.delete(session.id);
    dbSaveWithRetry(session, 0);
  }, 500); // 500ms debounce

  debounceTimers.set(session.id, timer);
}

async function dbSaveWithRetry(session: PlaySession, attempt: number): Promise<void> {
  setSyncStatus("saving");
  try {
    const res = await fetch(`/api/session/${session.id}/save`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(session),
    });

    if (res.ok) {
      removePendingSave(session.id);
      const remaining = getPendingSaves();
      setSyncStatus(remaining.size === 0 ? "synced" : "pending");
      return;
    }

    // 401/403 — リトライする（DATA-RESCUE中は認証不要のため通る可能性あり）
    if (res.status === 401 || res.status === 403) {
      // リトライ対象に含める（以前はここでreturnしていた）
    }

    throw new Error(`HTTP ${res.status}`);
  } catch {
    if (attempt < MAX_RETRIES - 1) {
      setSyncStatus("pending");
      setTimeout(() => dbSaveWithRetry(session, attempt + 1), RETRY_DELAYS[attempt]);
    } else {
      setSyncStatus("error");
    }
  }
}

// ── 未保存データのリカバリ（起動時呼び出し） ────────────────────────────────

export function flushPendingSaves(): void {
  const pending = getPendingSaves();
  if (pending.size === 0) return;

  for (const id of pending) {
    const session = lsLoadSession(id);
    if (session) {
      dbSaveWithRetry(session, 0);
    } else {
      removePendingSave(id);
    }
  }
}

// ── Supabase 連携 ──────────────────────────────────────────────────────────

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

export async function dbGetSessionList(): Promise<SessionMeta[]> {
  try {
    const res = await fetch("/api/sessions");
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

export async function dbLoadSession(id: string): Promise<PlaySession | null> {
  try {
    const res = await fetch(`/api/session/${id}/load`);
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

export async function createSessionWithCloud(machineName: string): Promise<PlaySession> {
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
    userSettingGuess: null,
    createdAt: now,
    updatedAt: now,
  };
  lsSaveSession(session);
  return session;
}
