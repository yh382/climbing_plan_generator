import { Redirect } from "expo-router";

// Deeplink fallback: /climmate → /coach (route renamed when Coach degraded
// from tab to push route in Window α).
export default function ClimmateRedirect() {
  return <Redirect href="/coach" />;
}
