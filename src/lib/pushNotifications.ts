import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { api } from "src/lib/apiClient";

/**
 * Register for push notifications and send the token to the backend.
 * Returns the Expo push token string, or null if registration fails.
 *
 * Only works on physical devices with dev-client or production builds.
 * Expo Go / simulators will skip gracefully.
 */
export async function registerForPushNotifications(): Promise<string | null> {
  // Skip on Expo Go (no native push module) and simulators
  if (!Constants.isDevice) {
    if (__DEV__) console.log("Push notifications require a physical device");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    if (__DEV__) console.log("Push notification permission not granted");
    return null;
  }

  // Android needs a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: "d4b98925-c856-48a8-9c93-e2bfa0cc4e24",
  });

  // Send token to backend
  try {
    await api.post("/users/me/push-token", {
      push_token: token.data,
      platform: Platform.OS,
    });
  } catch (e) {
    if (__DEV__) console.warn("Failed to send push token to backend:", e);
  }

  return token.data;
}
