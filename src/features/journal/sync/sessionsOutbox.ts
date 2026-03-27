import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../../lib/apiClient";

export type SessionOutboxEventInput =
  | { type: "create"; localKey: string; payload: { gym_name: string; location_type: string; date?: string } }
  | { type: "end"; localKey: string };

type SessionOutboxEvent = SessionOutboxEventInput & { id: string; createdAt: number };

const KEY = "SESSIONS_OUTBOX_V1";

async function readQueue(): Promise<SessionOutboxEvent[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

async function writeQueue(q: SessionOutboxEvent[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
}

function uid() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export async function enqueueSessionEvent(e: SessionOutboxEventInput) {
  const q = await readQueue();
  q.push({ ...e, id: uid(), createdAt: Date.now() });
  await writeQueue(q);
}

export async function flushSessionsOutbox(opts: {
  resolveServerId: (localKey: string) => string | null;
  saveServerId: (localKey: string, serverId: string) => Promise<void>;
}) {
  const { resolveServerId, saveServerId } = opts;
  const q = await readQueue();
  if (q.length === 0) return;

  const remaining: SessionOutboxEvent[] = [];

  for (const ev of q) {
    try {
      if (ev.type === "create") {
        const existing = resolveServerId(ev.localKey);
        if (existing) continue; // 已创建, 跳过

        const res = await api.post<{ id: string }>("/sessions", ev.payload);
        if (res?.id) {
          await saveServerId(ev.localKey, String(res.id));
        }
        continue;
      }

      if (ev.type === "end") {
        const serverId = resolveServerId(ev.localKey);
        if (!serverId) {
          remaining.push(ev); // create 还没完成, 保留
          continue;
        }
        await api.post(`/sessions/${serverId}/end`, {});
        continue;
      }
    } catch {
      remaining.push(ev); // 网络失败, 保留到下次
    }
  }

  await writeQueue(remaining);
}
