// src/features/journal/sync/logsOutbox.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiCreateLog, apiRepeatLog, apiDeleteLog } from "../../../../src/lib/logsApi";
import { getSessionServerId } from "./sessionServerIdMap";

export type LocalLogId = string;

/**
 * ✅ 关键：不要对 union 直接 Omit（会把 payload 这种“只存在于部分分支”的字段抹掉，导致 TS 报错）。
 * 我们定义一个专门给 enqueue 用的输入类型：create 一定有 payload，其它事件没有。
 */
export type OutboxEventInput =
  | { type: "create"; localId: LocalLogId; payload: any }
  | { type: "repeat"; localId: LocalLogId }
  | { type: "delete"; localId: LocalLogId };

type OutboxEvent = OutboxEventInput & { id: string; createdAt: number };

const KEY = "LOGS_OUTBOX_V1";

async function readQueue(): Promise<OutboxEvent[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeQueue(q: OutboxEvent[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

// ✅ 统一对外 API：全项目只用 payload 方案
export async function enqueueLogEvent(e: OutboxEventInput) {
  const q = await readQueue();
  q.push({ ...e, id: uid(), createdAt: Date.now() });
  await writeQueue(q);
}

export async function flushLogsOutbox(opts: {
  token: string;
  resolveServerId: (localId: LocalLogId) => string | null;
  saveServerId: (localId: LocalLogId, serverId: string) => Promise<void>;
}) {
  const { token, resolveServerId, saveServerId } = opts;

  const q = await readQueue();
  if (q.length === 0) return;

  const remaining: OutboxEvent[] = [];

  for (const ev of q) {
    try {
      if (ev.type === "create") {
        const existing = resolveServerId(ev.localId);
        if (existing) continue;

        // Resolve session_id from _sessionKey if still null (offline fallback)
        if (!ev.payload.session_id && ev.payload._sessionKey) {
          const sid = await getSessionServerId(ev.payload._sessionKey);
          if (sid) ev.payload.session_id = sid;
        }
        delete ev.payload._sessionKey; // strip before sending

        const created = await apiCreateLog(token, ev.payload);
        if (created?.id) {
          await saveServerId(ev.localId, String(created.id));
        }
        continue;
      }

      if (ev.type === "repeat") {
        const serverId = resolveServerId(ev.localId);
        if (!serverId) {
          remaining.push(ev);
          continue;
        }
        await apiRepeatLog(token, serverId);
        continue;
      }

      if (ev.type === "delete") {
        const serverId = resolveServerId(ev.localId);
        if (!serverId) {
          // 本地删了但后端还没建出来：直接丢弃即可
          continue;
        }
        await apiDeleteLog(token, serverId);
        continue;
      }
    } catch {
      // 网络/后端失败：保留事件，下一次再试
      remaining.push(ev);
    }
  }

  await writeQueue(remaining);
}