import * as Sentry from "@sentry/react-native";
import * as Application from "expo-application";

// Field names that may carry user prose / credentials. Match case-insensitive
// after stripping `_` / `-` so `displayName` and `display_name` both hit.
const PII_KEYS = new Set([
  "note",
  "comment",
  "displayname",
  "bio",
  "password",
  "passwordhash",
  "refreshtoken",
  "accesstoken",
  "authorization",
  "appleidtoken",
  "idtoken",
  "email",
  "phone",
]);

function normKey(k: string): string {
  return k.replace(/[_-]/g, "").toLowerCase();
}

function scrubInPlace(value: unknown, seen: WeakSet<object> = new WeakSet(), depth = 0): void {
  if (depth > 12 || value === null || value === undefined) return;
  if (typeof value !== "object") return;
  if (seen.has(value as object)) return;
  seen.add(value as object);
  if (Array.isArray(value)) {
    for (const item of value) scrubInPlace(item, seen, depth + 1);
    return;
  }
  const obj = value as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    if (PII_KEYS.has(normKey(k))) {
      obj[k] = "[scrubbed]";
    } else {
      scrubInPlace(obj[k], seen, depth + 1);
    }
  }
}

const QS_PII_RE = /\b(token|password|code|id_token|access_token|refresh_token)=[^&\s]*/gi;
function scrubQueryString(qs: unknown): unknown {
  return typeof qs === "string" ? qs.replace(QS_PII_RE, "$1=[scrubbed]") : qs;
}

function scrubExceptionValues(event: { exception?: { values?: Array<{ value?: string }> } }): void {
  const values = event.exception?.values;
  if (!Array.isArray(values)) return;
  for (const v of values) {
    // Truncate exception messages — backend 5xx body becomes ApiError.message
    // and could echo back request payloads.
    if (typeof v.value === "string" && v.value.length > 500) {
      v.value = v.value.slice(0, 500) + "…[truncated]";
    }
  }
}

function scrubBreadcrumbs(event: { breadcrumbs?: Array<{ message?: string; data?: unknown }> }): void {
  if (!Array.isArray(event.breadcrumbs)) return;
  for (const bc of event.breadcrumbs) {
    scrubInPlace(bc.data);
    if (typeof bc.message === "string") {
      // Strip query string PII from breadcrumb messages (apiClient breadcrumbs
      // include URL paths which may carry sensitive query params).
      bc.message = bc.message.replace(QS_PII_RE, "$1=[scrubbed]");
    }
  }
}

function decodeJwtSub(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
    const json = JSON.parse(
      typeof atob === "function"
        ? atob(padded)
        : Buffer.from(padded, "base64").toString("utf8")
    ) as { sub?: string };
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

let initialized = false;

export function initSentry(): boolean {
  if (initialized) return true;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN || "";
  if (!dsn) return false;

  const environment = process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT || (__DEV__ ? "development" : "production");
  const version = Application.nativeApplicationVersion || "0.0.0";
  const build = Application.nativeBuildVersion || "0";
  const release = `${version}+${build}`;
  const tracesSampleRate = environment === "production" ? 0.1 : 1.0;

  Sentry.init({
    dsn,
    environment,
    release,
    tracesSampleRate,
    enableNativeCrashHandling: true,
    debug: false,
    sendDefaultPii: false,
    beforeSend: (event) => {
      try {
        scrubInPlace(event.extra);
        scrubInPlace(event.contexts);
        scrubInPlace((event as { request?: unknown }).request);
        const req = (event as { request?: { query_string?: unknown } }).request;
        if (req) req.query_string = scrubQueryString(req.query_string);
        scrubBreadcrumbs(event as { breadcrumbs?: Array<{ message?: string; data?: unknown }> });
        scrubExceptionValues(event as { exception?: { values?: Array<{ value?: string }> } });
      } catch {
        // On scrub failure drop the event rather than ship un-scrubbed.
        return null;
      }
      return event;
    },
  });
  initialized = true;
  return true;
}

export function setSentryUserFromToken(accessToken: string | null): void {
  if (!initialized) return;
  const userId = decodeJwtSub(accessToken);
  if (userId) {
    Sentry.setUser({ id: userId });
  } else {
    Sentry.setUser(null);
  }
}

export function clearSentryUser(): void {
  if (!initialized) return;
  Sentry.setUser(null);
}

export function addAuthBreadcrumb(event: "login" | "logout" | "delete_account"): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({ category: "auth", message: event, level: "info" });
}

export function addApiBreadcrumb(method: string, url: string, status: number): void {
  if (!initialized) return;
  Sentry.addBreadcrumb({
    category: "api",
    message: `${method} ${url} → ${status}`,
    level: status >= 500 ? "error" : status >= 400 ? "warning" : "info",
    data: { method, url, status },
  });
}

export function captureApiError(err: unknown, ctx: { method: string; url: string; status: number }): void {
  if (!initialized) return;
  // Strip any free-form server response body off the error before capture so
  // it doesn't ride out as exception.value or originalException.body. Keep the
  // structured ctx + a typed-message replacement.
  const safeErr = (() => {
    if (err && typeof err === "object" && "name" in err && (err as { name?: unknown }).name === "ApiError") {
      const e = err as { status?: number; detail?: string | null; message?: string };
      const replacement = new Error(`HTTP ${e.status ?? ctx.status}${e.detail ? `: ${e.detail}` : ""}`);
      replacement.name = "ApiError";
      return replacement;
    }
    return err;
  })();
  Sentry.captureException(safeErr, { extra: ctx });
}

export { Sentry };
