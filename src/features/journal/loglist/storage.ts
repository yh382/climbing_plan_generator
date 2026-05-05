import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalDayLogItem } from "./types";
import { localDateStringFromMs } from "../../../lib/localDate";

type StorageType = "boulder" | "toprope" | "lead";

export const NOTE_BY_ROUTE_KEY = (routeName: string) => `logsend_note_by_route_${routeName}`;
export const DAY_LIST_KEY = (date: string, type: StorageType) => `journal_day_list_${date}_${type}`;

// ✅ Session-scoped list: one list per active climbing session
// Use a stable sessionKey (recommended: String(activeSession.startTime))
export const SESSION_LIST_KEY = (sessionKey: string, type: StorageType) =>
  `journal_session_list_${sessionKey}_${type}`;

/** ---------- Day list ---------- */
export async function readDayList(date: string, type: StorageType): Promise<LocalDayLogItem[]> {
  try {
    const raw = await AsyncStorage.getItem(DAY_LIST_KEY(date, type));
    const arr = raw ? (JSON.parse(raw) as LocalDayLogItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function writeDayList(date: string, type: StorageType, items: LocalDayLogItem[]) {
  try {
    await AsyncStorage.setItem(DAY_LIST_KEY(date, type), JSON.stringify(items));
  } catch {
    // ignore
  }
}

/** ✅ NEW: update a single item in day list */
export async function updateDayItem(
  date: string,
  type: StorageType,
  itemId: string,
  updater: (old: LocalDayLogItem) => LocalDayLogItem
): Promise<LocalDayLogItem[] | null> {
  const list = await readDayList(date, type);
  const idx = list.findIndex((x) => x.id === itemId);
  if (idx < 0) return null;

  const next = [...list];
  next[idx] = updater(next[idx]);
  await writeDayList(date, type, next);
  return next;
}

/** ✅ NEW: delete a single item in day list */
export async function deleteDayItem(
  date: string,
  type: StorageType,
  itemId: string
): Promise<LocalDayLogItem[] | null> {
  const list = await readDayList(date, type);
  const next = list.filter((x) => x.id !== itemId);
  if (next.length === list.length) return null;
  await writeDayList(date, type, next);
  return next;
}

/** ---------- Session list (方案A) ---------- */
export async function readSessionList(sessionKey: string, type: StorageType): Promise<LocalDayLogItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_LIST_KEY(sessionKey, type));
    const arr = raw ? (JSON.parse(raw) as LocalDayLogItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function writeSessionList(sessionKey: string, type: StorageType, items: LocalDayLogItem[]) {
  try {
    await AsyncStorage.setItem(SESSION_LIST_KEY(sessionKey, type), JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function clearSessionList(sessionKey: string, type: StorageType) {
  try {
    await AsyncStorage.removeItem(SESSION_LIST_KEY(sessionKey, type));
  } catch {
    // ignore
  }
}

/** ✅ NEW: update a single item in session list */
export async function updateSessionItem(
  sessionKey: string,
  type: StorageType,
  itemId: string,
  updater: (old: LocalDayLogItem) => LocalDayLogItem
): Promise<LocalDayLogItem[] | null> {
  const list = await readSessionList(sessionKey, type);
  const idx = list.findIndex((x) => x.id === itemId);
  if (idx < 0) return null;

  const next = [...list];
  next[idx] = updater(next[idx]);
  await writeSessionList(sessionKey, type, next);
  return next;
}

/** ✅ NEW: delete a single item in session list */
export async function deleteSessionItem(
  sessionKey: string,
  type: StorageType,
  itemId: string
): Promise<LocalDayLogItem[] | null> {
  const list = await readSessionList(sessionKey, type);
  const next = list.filter((x) => x.id !== itemId);
  if (next.length === list.length) return null;
  await writeSessionList(sessionKey, type, next);
  return next;
}

/** ---------- Notes ---------- */
export async function readNoteByRoute(routeName: string): Promise<string> {
  try {
    const v = await AsyncStorage.getItem(NOTE_BY_ROUTE_KEY(routeName));
    return (v || "").trim();
  } catch {
    return "";
  }
}

export async function readNotesByRoutes(routeNames: string[]): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(routeNames.map((x) => x.trim()).filter(Boolean)));
  if (uniq.length === 0) return {};

  const pairs = await Promise.all(
    uniq.map(async (name) => {
      const note = await readNoteByRoute(name);
      return [name, note] as const;
    })
  );

  const out: Record<string, string> = {};
  for (const [name, note] of pairs) {
    if (note) out[name] = note;
  }
  return out;
}

/** ---------- Migration: dayList UTC → LOCAL date bucketing (B2 follow-up) ----------
 *
 * Pre-B2-fix the catalog Send/Attempt path bucketed dayList items by UTC
 * date (`new Date().toISOString().slice(0,10)`). For users west of UTC
 * (e.g. UTC-6 MT), local evening was already next-UTC-day, so items
 * logged in the evening landed in tomorrow's bucket. This migration
 * scans every `journal_day_list_<date>_<type>` key and re-buckets each
 * item by its `createdAt` LOCAL date. Idempotent (move only when bucket
 * key ≠ derived local date). */
async function migrateDayListUtcToLocal() {
  const allKeys = await AsyncStorage.getAllKeys();
  const dayKeys = allKeys.filter((k) => k.startsWith(DAY_LIST_PREFIX));
  if (dayKeys.length === 0) return;

  // type: "boulder" | "toprope" | "lead" → list of items to add to that
  // type's `<correctDate>` bucket. Keyed by `${date}_${type}`.
  const additions = new Map<string, LocalDayLogItem[]>();
  // Items to keep in their current bucket (already correct OR no createdAt).
  const survivors = new Map<string, LocalDayLogItem[]>();

  for (const key of dayKeys) {
    const trail = key.slice(DAY_LIST_PREFIX.length); // YYYY-MM-DD_<type>
    const m = trail.match(/^(\d{4}-\d{2}-\d{2})_(boulder|toprope|lead)$/);
    if (!m) continue;
    const [, bucketDate, type] = m;
    const raw = await AsyncStorage.getItem(key);
    if (!raw) continue;
    let items: LocalDayLogItem[] = [];
    try {
      const parsed = JSON.parse(raw);
      items = Array.isArray(parsed) ? parsed : [];
    } catch {
      continue;
    }

    for (const it of items) {
      const correctDate =
        typeof it.createdAt === "number"
          ? localDateStringFromMs(it.createdAt)
          : bucketDate; // legacy items without createdAt — leave in place

      const targetKey = `${correctDate}_${type}`;
      const map = correctDate === bucketDate ? survivors : additions;
      if (!map.has(targetKey)) map.set(targetKey, []);
      // De-dup by id within the target bucket.
      const list = map.get(targetKey)!;
      if (!list.some((x) => x.id === it.id)) {
        // Update item.date too so future readers see consistent value.
        list.push({ ...it, date: correctDate });
      }
    }
  }

  // Write survivors back to their original buckets (overwrite to drop misplaced).
  // Then merge additions into target buckets (preserve any survivors that
  // belong there + dedup by id).
  const allTargets = new Set<string>([...survivors.keys(), ...additions.keys()]);
  for (const targetKey of allTargets) {
    const surviving = survivors.get(targetKey) ?? [];
    const incoming = additions.get(targetKey) ?? [];
    const seen = new Set<string>();
    const merged: LocalDayLogItem[] = [];
    for (const list of [surviving, incoming]) {
      for (const it of list) {
        if (!it.id || seen.has(it.id)) continue;
        seen.add(it.id);
        merged.push(it);
      }
    }
    const m2 = targetKey.match(/^(\d{4}-\d{2}-\d{2})_(boulder|toprope|lead)$/);
    if (!m2) continue;
    const [, date, type] = m2;
    await AsyncStorage.setItem(
      DAY_LIST_KEY(date, type as StorageType),
      JSON.stringify(merged),
    );
  }

  // Wipe any source bucket that no longer has any survivors AND wasn't
  // re-targeted as a destination (e.g. a stale empty bucket left behind).
  // We accomplish this implicitly above by overwriting only allTargets.
  // For source keys absent from allTargets (because all items moved away
  // and nothing landed back), explicitly clear them.
  for (const key of dayKeys) {
    const trail = key.slice(DAY_LIST_PREFIX.length);
    if (!allTargets.has(trail)) {
      await AsyncStorage.setItem(key, JSON.stringify([]));
    }
  }
}

const DAY_LIST_PREFIX = "journal_day_list_";

/** ---------- Migration: "yds" → "lead" ---------- */
const MIGRATION_KEY = "migration_yds_to_rope_v1";
// v2: bumped so users on v1 (which raced syncFromBackend's UTC-date
// grouping and got re-poisoned) re-run the migration after the
// syncFromBackend grouping fix lands.
const MIGRATION_LOCAL_DATE_KEY = "migration_daylist_local_date_v2";

async function migrateYdsToRopeTypes() {
  const allKeys = await AsyncStorage.getAllKeys();
  const ydsKeys = allKeys.filter((k) => k.includes("_yds"));

  for (const oldKey of ydsKeys) {
    const data = await AsyncStorage.getItem(oldKey);
    if (!data) continue;

    try {
      const items = JSON.parse(data);
      const migrated = (Array.isArray(items) ? items : []).map((item: any) => ({
        ...item,
        type: "lead",
      }));

      const newKey = oldKey.replace("_yds", "_lead");
      await AsyncStorage.setItem(newKey, JSON.stringify(migrated));
      await AsyncStorage.removeItem(oldKey);
    } catch {
      // skip corrupt data
    }
  }
}

export async function runMigrationsIfNeeded() {
  try {
    const done = await AsyncStorage.getItem(MIGRATION_KEY);
    if (!done) {
      await migrateYdsToRopeTypes();
      await AsyncStorage.setItem(MIGRATION_KEY, "1");
    }

    const localDateMigrationDone = await AsyncStorage.getItem(
      MIGRATION_LOCAL_DATE_KEY,
    );
    if (!localDateMigrationDone) {
      await migrateDayListUtcToLocal();
      await AsyncStorage.setItem(MIGRATION_LOCAL_DATE_KEY, "1");
    }
  } catch {
    // best-effort
  }
}
