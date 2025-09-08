// app/_layout.tsx
import { Ionicons } from "@expo/vector-icons";
import type { NotificationBehavior } from "expo-notifications";
import * as Notifications from "expo-notifications";
import { Tabs } from "expo-router";
import { SettingsProvider } from "../contexts/SettingsContext";

// 全局通知处理器（前台也展示；iOS 横幅/列表也显示）
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    // SDK 50/51+ 类型新增字段（iOS 横幅/列表控制）
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});


export default function Layout() {
  return (
    <SettingsProvider>
      <Tabs>
        <Tabs.Screen name="index" options={{ title: "生成器" }} />
        <Tabs.Screen name="calendar" options={{ title: "训练日历" }} />
        <Tabs.Screen name="journal" options={{ title: "记录中心" }} />
        <Tabs.Screen
          name="settings"
          options={{
            title: "设置",
            tabBarLabel: "设置",
            // 与你现有图标风格保持一致；若你已用 Ionicons：
            tabBarIcon: ({ color, size }) => <Ionicons name="settings-outline" color={color} size={size} />,
          }}
        />

      </Tabs>
    </SettingsProvider>
  );
}
