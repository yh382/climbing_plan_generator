// src/features/journal/sync/syncAllLocalSessions.ts
// One-time migration: sync all local SessionEntry objects that have no serverId to the backend.

import { api } from "../../../lib/apiClient";
import { setSessionServerId, readAllSessionServerIds } from "./sessionServerIdMap";

type MinimalSession = {
  sessionKey: string;
  serverId: string | null;
  synced: boolean;
  date: string;
  startTime: string;
  endTime: string;
  gymName: string;
  discipline: string;
};

type StoreAccessor = {
  getSessions: () => MinimalSession[];
  updateSession: (sessionKey: string, patch: { serverId: string; synced: boolean }) => void;
};

/**
 * Sync all local sessions that lack a serverId to the backend.
 * Sends start_time + end_time so the backend creates them as "completed" with correct dates.
 * Returns the number of sessions successfully synced.
 */
export async function syncAllLocalSessions(store: StoreAccessor): Promise<number> {
  const sessions = store.getSessions();
  const unsynced = sessions.filter((s) => !s.serverId && !s.synced);
  if (unsynced.length === 0) return 0;

  // Load existing map — some sessions may have been synced via outbox since last store persist
  const existingMap = await readAllSessionServerIds();

  let synced = 0;

  for (const session of unsynced) {
    try {
      // Check if already in the serverIdMap (outbox may have handled it)
      const existing = existingMap[session.sessionKey];
      if (existing) {
        store.updateSession(session.sessionKey, { serverId: existing, synced: true });
        synced++;
        continue;
      }

      // Create on backend with historical timestamps
      const res = await api.post<{ id: string }>("/sessions", {
        gym_name: session.gymName,
        location_type: "gym",
        start_time: session.startTime,
        end_time: session.endTime,
      });

      if (res?.id) {
        const serverId = String(res.id);
        await setSessionServerId(session.sessionKey, serverId);
        store.updateSession(session.sessionKey, { serverId, synced: true });
        synced++;
      }
    } catch {
      // Network error — skip this session, will retry next time
      continue;
    }
  }

  return synced;
}
