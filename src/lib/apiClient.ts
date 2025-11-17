import Constants from "expo-constants";

const API_BASE = Constants.expoConfig?.extra?.API_BASE || process.env.EXPO_PUBLIC_API_BASE;

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(
  path: string,
  options: { method?: HttpMethod; body?: any; headers?: Record<string, string> } = {}
): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, headers?: Record<string, string>) => request<T>(path, { headers }),
  post: <T>(path: string, body?: any) => request<T>(path, { method: "POST", body }),
  put:  <T>(path: string, body?: any) => request<T>(path, { method: "PUT", body }),
  patch:<T>(path: string, body?: any) => request<T>(path, { method: "PATCH", body }),
  del:  <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
