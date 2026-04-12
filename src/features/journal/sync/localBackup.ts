// src/features/journal/sync/localBackup.ts
// Crash recovery module for orphaned sessions (Bug #14)
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  readSessionList,
  readDayList,
  writeDayList,
} from "../loglist/storage";
import type { LocalDayLogItem } from "../loglist/types";
import { getSessionServerId } from "./sessionServerIdMap";

const BACKUP_KEY = "SESSION_BACKUP_V1";

type Discipline = "boulder" | "toprope" | "lead";

export type BackupMeta = {
  sessionKey: string;
  date: string;
  gymName: string;
  discipline: Discipline;
  startTime: number;
};

export type RecoveredSession = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: string;
  gymName: string;
  discipline: Discipline;
  sessionKey: string;
  sends: number;
  best: string;
  attempts: number;
  serverId: string | null;
  isPublic: boolean;
  synced: boolean;
};

export type RecoveredLogEntry = {
  id: string;
  date: string;
  type: Discipline;
  grade: string;
  count: number;
};

export type RecoveryResult = {
  sessions: RecoveredSession[];
  logEntries: RecoveredLogEntry[];
  affectedDates: string[];
};

// --- Backup CRUD ---

export async function writeBackupSnapshot(meta: BackupMeta): Promise<void> {
  try {
    await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(meta));
  } catch {
    // best-effort
  }
}

export async function readBackupSnapshot(): Promise<BackupMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as BackupMeta;
  } catch {
    return null;
  }
}

export async function clearBackupSnapshot(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BACKUP_KEY);
  } catch {
    // best-effort
  }
}

// --- Helpers (duplicated from useLogsStore to avoid circular imports) ---

function mergeById(base: LocalDayLogItem[], add: LocalDayLogItem[]): LocalDayLogItem[] {
  const seen = new Set((base || []).map((x) => x.id));
  const out = [...(base || [])];
  for (const it of add || []) {
    if (!it?.id || seen.has(it.id)) continue;
    seen.add(it.id);
    out.push(it);
  }
  return out;
}

function inferSendCount(item: any): number {
  if (typeof item?.sendCount === "number") return item.sendCount;
  const style = item?.style;
  if (style === "redpoint" || style === "flash" || style === "onsight") return 1;
  if (item?.isSent === true) return 1;
  return 0;
}

function vNumber(g?: string): number {
  if (!g) return -1;
  const m = String(g).trim().match(/^V(\d+)/i);
  return m ? parseInt(m[1], 10) : -1;
}

function ydsRank(g?: string): number {
  if (!g) return -1;
  const m = String(g).trim().match(/^5\.(\d+)([abcd+-])?$/i);
  if (!m) return -1;
  const major = parseInt(m[1], 10);
  const suf = (m[2] || "").toLowerCase();
  const sufMap: Record<string, number> = { "": 0, a: 1, b: 2, c: 3, d: 4, "+": 5, "-": -1 };
  return major * 10 + (sufMap[suf] ?? 0);
}

function aggregateSends(date: string, type: Discipline, items: LocalDayLogItem[]): RecoveredLogEntry[] {
  const map = new Map<string, number>();
  for (const it of items || []) {
    const grade = String(it?.grade || "—").trim() || "—";
    const delta = inferSendCount(it);
    if (delta <= 0) continue;
    map.set(grade, (map.get(grade) || 0) + delta);
  }
  return Array.from(map.entries()).map(([grade, count]) => ({
    id: `${date}_${type}_${grade}`,
    date,
    type,
    grade,
    count,
  }));
}

// --- Recovery ---

export async function recoverOrphanedSessions(): Promise<RecoveryResult> {
  const backup = await readBackupSnapshot();
  if (!backup) return { sessions: [], logEntries: [], affectedDates: [] };

  const { sessionKey, date, gymName, discipline, startTime } = backup;

  // Read session lists for all 3 types
  const [sb, str, sl] = await Promise.all([
    readSessionList(sessionKey, "boulder"),
    readSessionList(sessionKey, "toprope"),
    readSessionList(sessionKey, "lead"),
  ]);

  const allItems = [...(sb || []), ...(str || []), ...(sl || [])];

  // No items → nothing to recover, just clear stale backup
  if (allItems.length === 0) {
    await clearBackupSnapshot();
    return { sessions: [], logEntries: [], affectedDates: [] };
  }

  // Merge session items into day lists (idempotent via mergeById)
  const [db, dtr, dl] = await Promise.all([
    readDayList(date, "boulder"),
    readDayList(date, "toprope"),
    readDayList(date, "lead"),
  ]);

  const nextDb = mergeById(db, sb || []);
  const nextDtr = mergeById(dtr, str || []);
  const nextDl = mergeById(dl, sl || []);

  await Promise.all([
    writeDayList(date, "boulder", nextDb),
    writeDayList(date, "toprope", nextDtr),
    writeDayList(date, "lead", nextDl),
  ]);

  // Rebuild aggregated logs for this date
  const logEntries = [
    ...aggregateSends(date, "boulder", nextDb),
    ...aggregateSends(date, "toprope", nextDtr),
    ...aggregateSends(date, "lead", nextDl),
  ];

  // Compute session summary
  const sends = allItems.reduce((s, it) => s + inferSendCount(it), 0);

  let best = "V?";
  const bBest = allItems
    .map((it) => String(it?.grade || "").trim())
    .filter((g) => /^V\d+/i.test(g))
    .sort((a, b) => vNumber(b) - vNumber(a))[0];
  if (bBest) {
    best = bBest;
  } else {
    const rBest = allItems
      .map((it) => String(it?.grade || "").trim())
      .filter((g) => /^5\./.test(g))
      .sort((a, b) => ydsRank(b) - ydsRank(a))[0];
    best = rBest || "V?";
  }

  // End time = last item's createdAt, or now if unavailable
  const lastCreatedAt = allItems.reduce(
    (max, it) => Math.max(max, it.createdAt || 0),
    0
  );
  const endTime = lastCreatedAt > startTime ? lastCreatedAt : Date.now();
  const durationMs = endTime - startTime;
  const h = Math.floor(durationMs / 3600000);
  const m = Math.floor((durationMs % 3600000) / 60000);
  const durationStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

  // If startSession's POST /sessions completed before the crash/reload, the
  // serverId was persisted to sessionServerIdMap. Pick it up so deleteSession
  // can call backend DELETE on the recovered session without waiting for sync.
  const recoveredServerId = await getSessionServerId(sessionKey);

  const session: RecoveredSession = {
    id: recoveredServerId || `recovered_${Date.now()}`,
    date,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    duration: durationStr,
    gymName,
    discipline,
    sessionKey,
    sends,
    best,
    attempts: allItems.length,
    serverId: recoveredServerId,
    isPublic: false,
    synced: false,
  };

  await clearBackupSnapshot();

  if (__DEV__) {
    console.log("[localBackup] Recovered orphaned session:", sessionKey, "items:", allItems.length);
  }

  return {
    sessions: [session],
    logEntries,
    affectedDates: [date],
  };
}
