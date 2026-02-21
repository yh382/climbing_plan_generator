// src/lib/authEvents.ts
type AuthExpiredHandler = () => void;

let handler: AuthExpiredHandler | null = null;

export function setOnAuthExpired(fn: AuthExpiredHandler) {
  handler = fn;
}

export function notifyAuthExpired() {
  try {
    handler?.();
  } catch {}
}
