import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
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
  // Skip on simulators (Device.isDevice is reliable across Expo SDK versions)
  if (!Device.isDevice) {
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

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: "d4b98925-c856-48a8-9c93-e2bfa0cc4e24",
    });

    // Send token to backend
    await api.post("/users/me/push-token", {
      push_token: token.data,
      platform: Platform.OS,
    });

    return token.data;
  } catch (e) {
    if (__DEV__) console.warn("Failed to register push token:", e);
    return null;
  }
}
