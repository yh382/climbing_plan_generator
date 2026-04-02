// src/lib/logsApi.ts
// Sync API calls for climb logs — maps frontend format to backend ClimbLogCreateIn.

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE;

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

// Frontend payload format (stored in outbox)
export type CreateLogPayload = {
  session_id?: string | null;
  date: string; // YYYY-MM-DD
  log_type: "boulder" | "toprope" | "lead";
  grade_text: string;
  route_name?: string | null;
  style: "redpoint" | "flash" | "onsight";
  feel?: "soft" | "solid" | "hard" | null;
  attempts_total: number;
  send_count: number;
  note?: string | null;
  media?: Array<{ type: "image" | "video"; url: string; thumbUrl?: string }>;
};

// Convert frontend payload → backend ClimbLogCreateIn
function toBackendPayload(p: CreateLogPayload) {
  // log_type → wall_type + grade_system
  const wall_type = p.log_type; // "boulder" | "toprope" | "lead" maps directly to backend wall_type
  const grade_system = p.log_type === "boulder" ? "vscale" : "yds";

  // style → result
  const STYLE_TO_RESULT: Record<string, string> = {
    redpoint: "send",
    flash: "flash",
    onsight: "onsight",
  };
  const result = STYLE_TO_RESULT[p.style] || "send";

  return {
    session_id: p.session_id || null,
    date: p.date,
    wall_type,
    grade_system,
    grade_text: p.grade_text,
    result,
    feel: p.feel || null,
    attempts: p.attempts_total || 1,
    route_name: p.route_name || null,
    note: p.note || null,
    media: p.media?.map((m: any) => ({
      type: m.type,
      url: m.url || m.uri,             // frontend LogMedia uses `uri`; normalise to backend `url`
      thumbUrl: m.thumbUrl || m.coverUri,
    })) || null,
  };
}

export async function apiCreateLog(token: string, payload: CreateLogPayload) {
  const body = toBackendPayload(payload);
  return authedFetch("/climb-logs", token, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function apiRepeatLog(token: string, serverId: string) {
  return authedFetch(`/climb-logs/${serverId}/repeat`, token, { method: "POST" });
}

export async function apiDeleteLog(token: string, serverId: string) {
  try {
    return await authedFetch(`/climb-logs/${serverId}`, token, { method: "DELETE" });
  } catch (e: any) {
    // 404 = already deleted or never existed → goal achieved
    if (e?.message?.includes("404")) return { ok: true };
    throw e;
  }
}

export async function apiUpdateLog(token: string, serverId: string, patch: any) {
  return authedFetch(`/climb-logs/${serverId}`, token, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

export async function apiShareLog(token: string, serverId: string, isPublic: boolean) {
  return authedFetch(`/climb-logs/${serverId}/share`, token, {
    method: "POST",
    body: JSON.stringify({ public: isPublic }),
  });
}
