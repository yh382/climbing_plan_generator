// app/(tabs)/_layout.tsx
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform } from "react-native";
import { SettingsProvider, useSettings } from "../contexts/SettingsContext";
import { HapticTab } from "@components/HapticTab";
import BlurTabBarBackground from "@components/ui/TabBarBackground.ios";

function TabInner() {
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  return (
    <Tabs
      screenOptions={{
        tabBarButton: (props) => <HapticTab {...props} />,
        tabBarBackground: () =>
          Platform.OS === "ios" ? <BlurTabBarBackground /> : null,
        tabBarActiveTintColor: "#3B82F6",
        tabBarInactiveTintColor: "#94A3B8",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: tr("生成器", "Generator"),
          tabBarLabel: tr("生成器", "Generator"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="create-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: tr("训练日历", "Calendar"),
          tabBarLabel: tr("训练日历", "Calendar"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: tr("记录中心", "Journal"),
          tabBarLabel: tr("记录中心", "Journal"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="book-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: tr("设置", "Settings"),
          tabBarLabel: tr("设置", "Settings"),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  // 在 (tabs) 层包裹 Provider，所有子页都能读到设置
  return (
    <SettingsProvider>
      <TabInner />
    </SettingsProvider>
  );
}

