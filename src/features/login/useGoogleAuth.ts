/**
 * Google Sign In via expo-auth-session.
 *
 * Why `useIdTokenAuthRequest` (implicit flow with id_token):
 * - Mobile public clients (no client_secret) can't safely do code exchange.
 * - Our backend `/auth/google` only needs the id_token to authenticate the
 *   user; we don't call any Google API on their behalf, so no access_token
 *   or refresh_token is required.
 * - `iosClientId` causes the lib to auto-derive the redirect URI from the
 *   reverse client id (e.g. `com.googleusercontent.apps.<id>:/oauthredirect`).
 *   The matching CFBundleURLScheme is registered in `app.config.ts`.
 *
 * Returns `[request, response, promptAsync]`. The screen is responsible for
 * gating button enablement on `request != null` and reacting to `response`
 * via useEffect — see LoginScreen / SignupScreen.
 */
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";

// Required by expo-auth-session on iOS so the redirect from Safari closes the
// in-app browser and dispatches the response. Idempotent — safe to call once
// at module scope.
WebBrowser.maybeCompleteAuthSession();

const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_OAUTH_CLIENT_ID ?? "";

export function useGoogleAuth() {
  return Google.useIdTokenAuthRequest({
    iosClientId: IOS_CLIENT_ID,
    scopes: ["openid", "email", "profile"],
  });
}
