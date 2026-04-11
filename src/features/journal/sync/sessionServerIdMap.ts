import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "SESSIONS_SERVER_ID_MAP_V1";

type MapObj = Record<string, string>;

async function readMap(): Promise<MapObj> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function readAllSessionServerIds(): Promise<MapObj> {
  return readMap();
}

export async function getSessionServerId(localKey: string): Promise<string | null> {
  const m = await readMap();
  return m[localKey] || null;
}

export async function setSessionServerId(localKey: string, serverId: string) {
  const m = await readMap();
  m[localKey] = serverId;
  await AsyncStorage.setItem(KEY, JSON.stringify(m));
}

export async function removeSessionServerId(localKey: string) {
  const m = await readMap();
  if (localKey in m) {
    delete m[localKey];
    await AsyncStorage.setItem(KEY, JSON.stringify(m));
  }
}
