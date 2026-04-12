// app/end-session.tsx
// Deep-link handler for climMate://end-session (tapped from Live Activity
// Lock Screen "End Session" button). This file exists as a proper Expo Router
// route so the URL resolves cleanly instead of showing "This screen does not
// exist". On mount it immediately shows a confirmation Alert, then navigates
// away — the screen itself has no visible UI.

import { useEffect } from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import useLogsStore from "../src/store/useLogsStore";

export default function EndSessionScreen() {
  const router = useRouter();

  useEffect(() => {
    const activeSession = useLogsStore.getState().activeSession;

    if (!activeSession) {
      // Stale tap — session already ended elsewhere.
      router.replace("/(tabs)/calendar" as any);
      return;
    }

    Alert.alert(
      "End Session?",
      "Are you sure you want to end this climbing session?",
      [
        {
          text: "Cancel",
          style: "cancel",
          onPress: () => {
            // Go back to wherever the user was. If cold-started from LA,
            // there's nothing to go back to, so replace with tabs.
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)/calendar" as any);
            }
          },
        },
        {
          text: "Discard",
          style: "destructive",
          onPress: async () => {
            try {
              await useLogsStore.getState().discardActiveSession();
            } catch (e) {
              console.warn("[end-session] discard failed:", e);
            }
            router.replace("/(tabs)/calendar" as any);
          },
        },
        {
          text: "End",
          onPress: async () => {
            try {
              await useLogsStore.getState().endSession();
            } catch (e) {
              console.warn("[end-session] endSession failed:", e);
            }
            router.replace("/(tabs)/calendar" as any);
          },
        },
      ],
    );
  }, [router]);

  // No visible UI — the Alert is the entire UX.
  return null;
}
