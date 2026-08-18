import client from "../api/client.js";
import { addPending, getAllPending, removePending, countPending } from "./db.js";

const listeners = new Set();

function notify() {
  countPending().then((n) => listeners.forEach((cb) => cb(n)));
}

export function onPendingCountChange(cb) {
  listeners.add(cb);
  notify();
  return () => listeners.delete(cb);
}

export function newClientId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// 입출고 등록: 온라인이면 즉시 전송, 실패/오프라인이면 로컬 큐에 저장 후 나중에 동기화
export async function submitTransaction(tx) {
  const payload = { ...tx, client_id: tx.client_id || newClientId() };
  if (navigator.onLine) {
    try {
      const res = await client.post("/transactions", payload);
      return { ...res.data, queued: false };
    } catch (e) {
      if (!e.response) {
        await addPending(payload);
        notify();
        return { status: "queued", transaction: payload, queued: true };
      }
      throw e;
    }
  } else {
    await addPending(payload);
    notify();
    return { status: "queued", transaction: payload, queued: true };
  }
}

export async function flushQueue() {
  const pending = await getAllPending();
  if (!pending.length) return { synced: 0, failed: 0 };
  try {
    const res = await client.post("/transactions/sync", { transactions: pending });
    let synced = 0;
    for (const result of res.data.results) {
      if (result.status === "created" || result.status === "duplicate") {
        await removePending(result.client_id);
        synced++;
      }
    }
    notify();
    return { synced, failed: pending.length - synced };
  } catch (e) {
    return { synced: 0, failed: pending.length };
  }
}

export function startSyncListener() {
  window.addEventListener("online", () => flushQueue());
  // 앱이 열려있는 동안 주기적으로 재시도 (연결이 불안정한 현장 환경 대비)
  setInterval(() => {
    if (navigator.onLine) flushQueue();
  }, 15000);
  if (navigator.onLine) flushQueue();
}
