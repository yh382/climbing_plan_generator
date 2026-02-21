import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocalDayLogItem } from "./types";

export const NOTE_BY_ROUTE_KEY = (routeName: string) => `logsend_note_by_route_${routeName}`;
export const DAY_LIST_KEY = (date: string, type: "boulder" | "yds") => `journal_day_list_${date}_${type}`;

// ✅ Session-scoped list: one list per active climbing session
// Use a stable sessionKey (recommended: String(activeSession.startTime))
export const SESSION_LIST_KEY = (sessionKey: string, type: "boulder" | "yds") =>
  `journal_session_list_${sessionKey}_${type}`;

/** ---------- Day list ---------- */
export async function readDayList(date: string, type: "boulder" | "yds"): Promise<LocalDayLogItem[]> {
  try {
    const raw = await AsyncStorage.getItem(DAY_LIST_KEY(date, type));
    const arr = raw ? (JSON.parse(raw) as LocalDayLogItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function writeDayList(date: string, type: "boulder" | "yds", items: LocalDayLogItem[]) {
  try {
    await AsyncStorage.setItem(DAY_LIST_KEY(date, type), JSON.stringify(items));
  } catch {
    // ignore
  }
}

/** ✅ NEW: update a single item in day list */
export async function updateDayItem(
  date: string,
  type: "boulder" | "yds",
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
  type: "boulder" | "yds",
  itemId: string
): Promise<LocalDayLogItem[] | null> {
  const list = await readDayList(date, type);
  const next = list.filter((x) => x.id !== itemId);
  if (next.length === list.length) return null;
  await writeDayList(date, type, next);
  return next;
}

/** ---------- Session list (方案A) ---------- */
export async function readSessionList(sessionKey: string, type: "boulder" | "yds"): Promise<LocalDayLogItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_LIST_KEY(sessionKey, type));
    const arr = raw ? (JSON.parse(raw) as LocalDayLogItem[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function writeSessionList(sessionKey: string, type: "boulder" | "yds", items: LocalDayLogItem[]) {
  try {
    await AsyncStorage.setItem(SESSION_LIST_KEY(sessionKey, type), JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function clearSessionList(sessionKey: string, type: "boulder" | "yds") {
  try {
    await AsyncStorage.removeItem(SESSION_LIST_KEY(sessionKey, type));
  } catch {
    // ignore
  }
}

/** ✅ NEW: update a single item in session list */
export async function updateSessionItem(
  sessionKey: string,
  type: "boulder" | "yds",
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
  type: "boulder" | "yds",
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
