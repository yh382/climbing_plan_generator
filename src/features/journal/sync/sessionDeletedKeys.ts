// src/features/journal/sync/sessionDeletedKeys.ts
//
// Tombstone set for locally-deleted sessions. When the user deletes a session
// but the backend DELETE /sessions/{id} fails (offline, transient network),
// we persist the sessionKey here so that syncFromBackend() can skip re-adding
// the session when the backend still reports it as existing. The entry is
// cleared once the backend delete eventually succeeds (either via the
// sessionsOutbox "delete" event or a direct retry).

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "SESSIONS_DELETED_KEYS_V1";

async function readRaw(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

async function writeRaw(arr: string[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(arr));
}

export async function markSessionDeleted(sessionKey: string): Promise<void> {
  const arr = await readRaw();
  if (!arr.includes(sessionKey)) {
    arr.push(sessionKey);
    await writeRaw(arr);
  }
}

export async function unmarkSessionDeleted(sessionKey: string): Promise<void> {
  const arr = await readRaw();
  const next = arr.filter((k) => k !== sessionKey);
  if (next.length !== arr.length) {
    await writeRaw(next);
  }
}

export async function readDeletedSessionKeys(): Promise<Set<string>> {
  const arr = await readRaw();
  return new Set(arr);
}

export async function isSessionDeleted(sessionKey: string): Promise<boolean> {
  const arr = await readRaw();
  return arr.includes(sessionKey);
}
