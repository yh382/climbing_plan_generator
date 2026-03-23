// app/(tabs)/_layout.tsx

import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { useRouter } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Icon, Label, VectorIcon } from "expo-router/unstable-native-tabs";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useUserStore } from "../../src/store/useUserStore";
import { setOnAuthExpired } from "@/lib/authEvents";
import { useAuthStore } from "@/store/useAuthStore";

const isIOS = Platform.OS === "ios";

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
    <NativeTabs tintColor="#306E6F" minimizeBehavior="automatic">
      {/* 1. Home */}
      <NativeTabs.Trigger name="index">
        {isIOS ? (
          <Icon sf={{ default: "house", selected: "house.fill" } as any} />
        ) : (
          <Icon src={{
            default: <VectorIcon family={Ionicons} name="home-outline" />,
            selected: <VectorIcon family={Ionicons} name="home" />,
          }} />
        )}
        <Label>Home</Label>
      </NativeTabs.Trigger>

      {/* 2. Calendar */}
      <NativeTabs.Trigger name="calendar">
        {isIOS ? (
          <Icon sf={"calendar" as any} />
        ) : (
          <Icon src={{
            default: <VectorIcon family={MaterialCommunityIcons} name="calendar-outline" />,
            selected: <VectorIcon family={MaterialCommunityIcons} name="calendar" />,
          }} />
        )}
        <Label>Calendar</Label>
      </NativeTabs.Trigger>

      {/* 3. Community */}
      <NativeTabs.Trigger name="community">
        {isIOS ? (
          <Icon sf={{ default: "person.2", selected: "person.2.fill" } as any} />
        ) : (
          <Icon src={{
            default: <VectorIcon family={Ionicons} name="people-outline" />,
            selected: <VectorIcon family={Ionicons} name="people" />,
          }} />
        )}
        <Label>Community</Label>
      </NativeTabs.Trigger>

      {/* 4. Profile */}
      <NativeTabs.Trigger name="profile">
        {isIOS ? (
          <Icon sf={{ default: "person", selected: "person.fill" } as any} />
        ) : (
          <Icon src={{
            default: <VectorIcon family={Ionicons} name="person-outline" />,
            selected: <VectorIcon family={Ionicons} name="person" />,
          }} />
        )}
        <Label>Profile</Label>
      </NativeTabs.Trigger>

      {/* 5. Climmate — separated (role="search" triggers iOS 26 floating pill) */}
      <NativeTabs.Trigger name="climmate" role="search">
        <Icon src={require("../../assets/images/tab_climmate.png")} />
        <Label>Climmate</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
