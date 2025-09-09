// app/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import type { NotificationBehavior } from "expo-notifications";
import * as Notifications from "expo-notifications";
import { Tabs } from "expo-router";
import { SettingsProvider, useSettings } from "../contexts/SettingsContext";

// 全局通知处理器
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// 封装一个内部组件，才能用 hook
function TabScreens() {
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: tr("生成器", "Generator"),
          tabBarLabel: tr("生成器", "Generator"),
          tabBarIcon: ({ color, size }) => <Ionicons name="create-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: tr("训练日历", "Calendar"),
          tabBarLabel: tr("训练日历", "Calendar"),
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: tr("记录中心", "Journal"),
          tabBarLabel: tr("记录中心", "Journal"),
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: tr("设置", "Settings"),
          tabBarLabel: tr("设置", "Settings"),
          tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}

export default function Layout() {
  return (
    <SettingsProvider>
      <TabScreens />
    </SettingsProvider>
  );
}
