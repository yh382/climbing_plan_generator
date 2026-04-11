import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import { notifyAuthExpired } from "src/lib/authEvents";


const API_BASE =
  Constants.expoConfig?.extra?.API_BASE || process.env.EXPO_PUBLIC_API_BASE;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

let authToken: string | null = null;

export function setApiAuthToken(token: string | null) {
  authToken = token;
}

export class ApiError extends Error {
  status: number;
  detail: string | null;
  body: string;

  constructor(status: number, detail: string | null, body: string) {
    // Preserve legacy message shape so existing `err?.message` / string-match code keeps working.
    super(body || `HTTP ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.body = body;
  }
}

const ACCESS_TOKEN_KEY = "climmate_access_token";
const REFRESH_TOKEN_KEY = "climmate_refresh_token";

// ✅ 避免并发触发多次 refresh
let refreshPromise: Promise<string | null> | null = null;

function safeJsonParse(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  const url = `${API_BASE}/auth/refresh`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) return null;

  const data = await res.json().catch(() => null);
  const newAccess = data?.access_token as string | undefined;
  const newRefresh = (data?.refresh_token as string | undefined) ?? null;

  if (!newAccess) return null;

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, newAccess);
  if (newRefresh) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefresh);
  }

  setApiAuthToken(newAccess);
  return newAccess;
}

async function request<T>(
  path: string,
  options: {
    method?: HttpMethod;
    body?: any;
    headers?: Record<string, string>;
    // ✅ 内部用：防止无限重试
    _retried?: boolean;
  } = {}
): Promise<T> {
  if (!API_BASE) {
    throw new Error(
      "API_BASE is not set. Please configure Constants.expoConfig.extra.API_BASE or EXPO_PUBLIC_API_BASE."
    );
  }

  const url = `${API_BASE}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  // ✅ 处理 token 过期：尝试 refresh 一次后重试原请求
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const json = safeJsonParse(text);
    const detail = json?.detail;

    const maybeExpired =
      res.status === 401 || (typeof detail === "string" && detail.toLowerCase().includes("token"));

    if (maybeExpired && !options._retried) {
      // 统一走 refresh 锁
      refreshPromise = refreshPromise ?? refreshAccessToken().finally(() => {
        refreshPromise = null;
      });

      const newToken = await refreshPromise;

      if (newToken) {
        return request<T>(path, { ...options, _retried: true });
      }
      notifyAuthExpired();
    }

    throw new ApiError(
      res.status,
      typeof detail === "string" ? detail : null,
      text
    );
  }

  // Handle empty-body success responses (e.g. 204 No Content from DELETE
  // endpoints). Without this, res.json() throws "JSON Parse error: Unexpected
  // end of input" and callers mistakenly treat a successful backend mutation
  // as a failure, triggering unnecessary retries and tombstone handling.
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return (await res.text()) as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, headers?: Record<string, string>) =>
    request<T>(path, { headers }),
  post: <T>(path: string, body?: any) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: any) =>
    request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body?: any) =>
    request<T>(path, { method: "PATCH", body }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
