// src/features/journal/sync/sessionBetaTracker.ts
// Tracks Beta record IDs created during an active session so that
// `discardActiveSession` can clean them up alongside the logs (otherwise the
// uploaded R2 video + backend Beta row stay around after a discard).
//
// Keyed by `sessionKey` (the active session's startTime as a string — same
// key used by readSessionList / writeSessionList). Cleared on both end +
// discard so a fresh session starts empty.

import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY_PREFIX = "@session_beta_ids_v1:";
const storageKey = (sessionKey: string) => `${KEY_PREFIX}${sessionKey}`;

export async function trackSessionBeta(
  sessionKey: string,
  betaId: string,
): Promise<void> {
  if (!sessionKey || !betaId) return;
  try {
    const raw = await AsyncStorage.getItem(storageKey(sessionKey));
    const existing: string[] = raw ? JSON.parse(raw) : [];
    if (existing.includes(betaId)) return;
    existing.push(betaId);
    await AsyncStorage.setItem(storageKey(sessionKey), JSON.stringify(existing));
  } catch {
    // Non-fatal — worst case the beta stays around if discard happens before
    // the user could re-track. Logs flow is unaffected.
  }
}

export async function readSessionBetas(sessionKey: string): Promise<string[]> {
  if (!sessionKey) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(sessionKey));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function clearSessionBetas(sessionKey: string): Promise<void> {
  if (!sessionKey) return;
  try {
    await AsyncStorage.removeItem(storageKey(sessionKey));
  } catch {
    // Non-fatal.
  }
}
