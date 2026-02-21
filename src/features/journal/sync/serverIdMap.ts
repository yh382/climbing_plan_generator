// src/features/journal/sync/serverIdMap.ts
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocalLogId } from "./logsOutbox";

const KEY = "LOGS_SERVER_ID_MAP_V1";

type MapObj = Record<string, string>;

export async function readAllServerIds(): Promise<MapObj> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function readMap(): Promise<MapObj> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function getServerId(localId: LocalLogId): Promise<string | null> {
  const m = await readMap();
  return m[localId] || null;
}

export async function setServerId(localId: LocalLogId, serverId: string) {
  const m = await readMap();
  m[localId] = serverId;
  await AsyncStorage.setItem(KEY, JSON.stringify(m));
}
