// src/services/authSession.ts
// Cross-store composition point: non-auth stores (e.g. useLogsStore's outbox
// flush gate) need the current access token without importing useAuthStore
// directly — stores must not import each other.
import { useAuthStore } from "../store/useAuthStore";

export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken;
}
