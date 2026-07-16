// src/features/account/api.ts
// GDPR account utilities — data export download + account deletion.
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { api, ApiError } from "src/lib/apiClient";

const API_BASE =
  Constants.expoConfig?.extra?.API_BASE || process.env.EXPO_PUBLIC_API_BASE;
const ACCESS_TOKEN_KEY = "climmate_access_token";

export type ExportResult = { uri: string; filename: string };

/**
 * Stream the GDPR data export zip from BE to a temp file and return its URI.
 * Caller (UI) hands the URI to expo-sharing for the system share sheet.
 *
 * Uses FileSystem.downloadAsync rather than fetch+base64 — the legacy file
 * system API streams directly to disk so we don't load the whole archive
 * into JS memory.
 */
export async function downloadAccountExport(): Promise<ExportResult> {
  if (!API_BASE) throw new Error("API_BASE not configured");

  const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  if (!token) throw new Error("Not signed in");

  const today = new Date().toISOString().slice(0, 10);
  const filename = `climmate-export-${today}.zip`;
  const uri = `${FileSystem.cacheDirectory}${filename}`;

  const res = await FileSystem.downloadAsync(`${API_BASE}/users/me/export`, uri, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status !== 200) {
    throw new Error(`Export failed (${res.status})`);
  }
  return { uri: res.uri, filename };
}

/**
 * Re-issue a verify-email token + send via Resend.
 *
 * BE returns `{ ok: true }` on success or `{ ok: false, retry_after_seconds }`
 * when the 60-second cooldown is in effect (so the FE can show "wait Ns"
 * without retrying). 4xx is reserved for "already verified".
 */
export type ResendVerificationResult = {
  ok: boolean;
  retry_after_seconds: number;
};

export async function resendVerification(): Promise<ResendVerificationResult> {
  try {
    return await api.post<ResendVerificationResult>(
      "/users/me/resend-verification",
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) {
      throw new Error("Email already verified");
    }
    throw e;
  }
}

/**
 * Best-effort native authentication challenge before destructive actions.
 * Returns true on success, false on user-cancel / failed match.
 *
 * Falls open (returns true) when the device hasn't enrolled biometrics or
 * a passcode — Apple guideline asks for "additional confirmation" before
 * destructive auth changes; the username-typing gate already covers that
 * floor, so we don't lock users out who can't enroll.
 *
 * Errors are swallowed but logged via Sentry breadcrumb so we can spot a
 * silent fall-open if it ever becomes a pattern.
 */
export async function confirmDeviceAuth(reason: string): Promise<boolean> {
  if (Platform.OS !== "ios") return true;
  try {
    const LocalAuthentication = await import("expo-local-authentication");
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!hasHardware || !isEnrolled) return true;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    return result.success;
  } catch (err) {
    if (typeof console !== "undefined") {
      console.warn("[account] confirmDeviceAuth fell open due to error:", err);
    }
    return true;
  }
}

/** DELETE /users/me — permanent account deletion (GDPR). Token teardown and
 *  local-state reset stay in useAuthStore.deleteAccount, which calls this. */
export function deleteAccountRequest(): Promise<void> {
  return api.del<void>("/users/me");
}
