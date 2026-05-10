// app/(drawer)/(tabs)/_layout.tsx

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useUserStore } from "../../../src/store/useUserStore";
import { setOnAuthExpired } from "@/lib/authEvents";
import { useAuthStore } from "@/store/useAuthStore";

const isIOS = Platform.OS === "ios";
// iOS<26: NativeTabs default goes transparent when content scrolls to the
// tab bar edge — looks washed out / unreadable on iOS 17. Force opaque
// (system blur material stays on, just not transparent). iOS 26 keeps
// its native floating-pill behavior unchanged.
const iosVersion = isIOS ? parseInt(String(Platform.Version), 10) : 0;
const tabBarNeedsOpaque = isIOS && iosVersion < 26;

export default function TabsLayout() {
  const { user, fetchMe } = useUserStore();
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);
  const logout = useAuthStore((s) => s.logout);
  const handledRef = useRef(false);

  useEffect(() => {
    if (accessToken && !user) fetchMe();
  }, [accessToken, user, fetchMe]);

  useEffect(() => {
    setOnAuthExpired(() => {
      if (handledRef.current) return;
      handledRef.current = true;
      logout().finally(() => {
        router.replace("/login");
      });
    });
  }, [logout, router]);

  return (
    <NativeTabs
      tintColor="#306E6F"
      minimizeBehavior="never"
      disableTransparentOnScrollEdge={tabBarNeedsOpaque}
    >
      {/* 1. Home */}
      <NativeTabs.Trigger name="index" contentStyle={{ backgroundColor: "transparent" }}>
        {isIOS ? (
          <NativeTabs.Trigger.Icon sf={{ default: "house", selected: "house.fill" }} />
        ) : (
          <NativeTabs.Trigger.Icon src={{
            default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name="home-outline" />,
            selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name="home" />,
          }} />
        )}
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* 2. Activity */}
      <NativeTabs.Trigger name="activity" contentStyle={{ backgroundColor: "transparent" }}>
        {isIOS ? (
          <NativeTabs.Trigger.Icon sf="calendar" />
        ) : (
          <NativeTabs.Trigger.Icon src={{
            default: <NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name="calendar-outline" />,
            selected: <NativeTabs.Trigger.VectorIcon family={MaterialCommunityIcons} name="calendar" />,
          }} />
        )}
        <NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* 3. Map */}
      <NativeTabs.Trigger name="map">
        {isIOS ? (
          <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} />
        ) : (
          <NativeTabs.Trigger.Icon src={{
            default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name="map-outline" />,
            selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name="map" />,
          }} />
        )}
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* 4. Community */}
      <NativeTabs.Trigger name="community">
        {isIOS ? (
          <NativeTabs.Trigger.Icon sf={{ default: "person.2", selected: "person.2.fill" }} />
        ) : (
          <NativeTabs.Trigger.Icon src={{
            default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name="people-outline" />,
            selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name="people" />,
          }} />
        )}
        <NativeTabs.Trigger.Label>Community</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      {/* 5. Profile */}
      <NativeTabs.Trigger name="profile">
        {isIOS ? (
          <NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} />
        ) : (
          <NativeTabs.Trigger.Icon src={{
            default: <NativeTabs.Trigger.VectorIcon family={Ionicons} name="person-outline" />,
            selected: <NativeTabs.Trigger.VectorIcon family={Ionicons} name="person" />,
          }} />
        )}
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
