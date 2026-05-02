// =============================================================================
// TGR Resonance: 統計分析レイヤー — localStorage キュー (client-only)
// オフライン or 送信失敗時に蓄積 → オンライン復帰時にバルク送信。
// バッチサイズ 50、TTL 30 日、最大保持 1000 件。
// =============================================================================

const QUEUE_KEY = "tgr_analytics_queue_v1";
const MAX_QUEUE_SIZE = 1000;
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BATCH_SIZE = 50;

type QueuedEvent = {
  eventType: string;
  payload: unknown;
  queuedAt: string; // ISO
};

function isClient(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readQueue(): QueuedEvent[] {
  if (!isClient()) return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedEvent[]): void {
  if (!isClient()) return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage 容量超過等は黙殺
  }
}

export function enqueueOffline(eventType: string, payload: unknown): void {
  if (!isClient()) return;
  try {
    const queue = readQueue();
    queue.push({ eventType, payload, queuedAt: new Date().toISOString() });
    // 古いものから捨てる (1000 件上限)
    while (queue.length > MAX_QUEUE_SIZE) queue.shift();
    writeQueue(queue);
  } catch {
    // 黙殺
  }
}

function pruneExpired(queue: QueuedEvent[]): QueuedEvent[] {
  const now = Date.now();
  return queue.filter((e) => {
    const t = Date.parse(e.queuedAt);
    if (!Number.isFinite(t)) return false;
    return now - t < TTL_MS;
  });
}

function groupByEventType(queue: QueuedEvent[]): Map<string, QueuedEvent[]> {
  const map = new Map<string, QueuedEvent[]>();
  for (const e of queue) {
    const arr = map.get(e.eventType) ?? [];
    arr.push(e);
    map.set(e.eventType, arr);
  }
  return map;
}

let flushing = false;

/**
 * キューに溜まったイベントを eventType ごとに 50 件単位でバッチ送信。
 * 失敗したバッチはキューに残す。多重起動防止のため flushing フラグで排他。
 */
export async function flushQueue(): Promise<void> {
  if (!isClient() || flushing) return;
  flushing = true;
  try {
    let queue = pruneExpired(readQueue());
    writeQueue(queue);

    if (queue.length === 0) return;

    const grouped = groupByEventType(queue);
    const remaining: QueuedEvent[] = [];

    for (const [eventType, events] of grouped.entries()) {
      for (let i = 0; i < events.length; i += BATCH_SIZE) {
        const batch = events.slice(i, i + BATCH_SIZE);
        const ok = await sendBatch(eventType, batch.map((e) => e.payload));
        if (!ok) remaining.push(...batch);
      }
    }

    writeQueue(remaining);
  } finally {
    flushing = false;
  }
}

async function sendBatch(eventType: string, payloads: unknown[]): Promise<boolean> {
  try {
    const res = await fetch(`/api/analytics/${eventType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: payloads }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * オンライン復帰検知 + 初期フラッシュ。
 * App ルートで 1 回だけ呼び出す。
 */
export function initOfflineQueueAutoFlush(): void {
  if (!isClient()) return;

  // 起動時に prune + flush
  void flushQueue();

  window.addEventListener("online", () => {
    void flushQueue();
  });
}
