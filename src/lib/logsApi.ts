// src/lib/logsApi.ts
const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL; // 你自己的后端地址
// 或者你现在已有的 apiClient.baseUrl

async function authedFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers || {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export type CreateLogPayload = {
  date: string; // YYYY-MM-DD
  log_type: "boulder" | "yds";
  grade_text: string;
  route_name?: string | null;
  style: "redpoint" | "flash" | "onsight";
  feel?: "soft" | "solid" | "hard" | null;
  attempts_total: number;
  send_count: number;
  note?: string | null;
  media?: Array<{ type: "image" | "video"; url: string; thumbUrl?: string }>;
};

export async function apiCreateLog(token: string, payload: CreateLogPayload) {
  return authedFetch("/logs", token, { method: "POST", body: JSON.stringify(payload) });
}

export async function apiRepeatLog(token: string, serverId: string) {
  return authedFetch(`/logs/${serverId}/repeat`, token, { method: "POST" });
}

export async function apiDeleteLog(token: string, serverId: string) {
  return authedFetch(`/logs/${serverId}`, token, { method: "DELETE" });
}

export async function apiUpdateLog(token: string, serverId: string, patch: any) {
  return authedFetch(`/logs/${serverId}`, token, { method: "PATCH", body: JSON.stringify(patch) });
}

export async function apiShareLog(token: string, serverId: string, isPublic: boolean) {
  return authedFetch(`/logs/${serverId}/share`, token, {
    method: "POST",
    body: JSON.stringify({ public: isPublic }),
  });
}
