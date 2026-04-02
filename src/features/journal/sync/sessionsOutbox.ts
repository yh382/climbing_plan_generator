import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../../../lib/apiClient";

export type SessionOutboxEventInput =
  | { type: "create"; localKey: string; payload: { gym_name: string; location_type: string; date?: string; start_time?: string; end_time?: string } }
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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Outbox flush timeout")), ms)
    ),
  ]);
}

const FLUSH_TIMEOUT = 10_000;

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
        if (existing) continue;

        const res = await withTimeout(
          api.post<{ id: string }>("/sessions", ev.payload),
          FLUSH_TIMEOUT
        );
        if (res?.id) {
          await saveServerId(ev.localKey, String(res.id));
        }
        continue;
      }

      if (ev.type === "end") {
        const serverId = resolveServerId(ev.localKey);
        if (!serverId) {
          remaining.push(ev);
          continue;
        }
        await withTimeout(
          api.post(`/sessions/${serverId}/end`, {}),
          FLUSH_TIMEOUT
        );
        continue;
      }
    } catch (err: any) {
      // 409 = already exists → treat as success
      const msg = String(err?.message || "");
      if (msg.includes("409")) continue;
      remaining.push(ev);
    }
  }

  await writeQueue(remaining);
}
