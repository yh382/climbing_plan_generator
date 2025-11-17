import { Tabs } from "expo-router";
import FloatingTabBar from "../../components/FloatingTabBar";
import TopBar from "../../components/TopBar";
import React from "react";
import { useColorScheme, View } from "react-native";
import { useUserStore } from "@/store/useUserStore";

// 🔧 小组件：在 effect 里清理 params，再渲染 TopBar（避免在渲染期 setParams）
function HeaderBridge({
  route,
  navigation,
  username,
}: {
  route: any;
  navigation: any;
  username: string | undefined;
}) {
  React.useEffect(() => {
    const p = route?.params;
    // 清理旧版本可能遗留的 ReactNode，避免 “cyclical structure in JSON object”
    if (p && (p.rightAccessory || p.leftAccessory)) {
      navigation.setParams?.({
        rightAccessory: undefined,
        leftAccessory: undefined,
      });
    }
  }, [route?.key, navigation]);

  return (
    <TopBar
      routeName={route.name}
      title={route.name === "profile" ? username : undefined}
      // 只传可序列化布尔值，驱动 TopBar 的返回箭头/右侧按钮
      profileSettingsOpen={Boolean(route?.params?.profileSettingsOpen)}
    />
  );
}

export default function TabsLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const { user } = useUserStore();
  const username = user?.username ?? "个人资料";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0B1220" : "#FFFFFF" }}>
      <Tabs
        screenOptions={{
          header: ({ route, navigation }) => (
            <HeaderBridge
              route={route}
              navigation={navigation}
              username={username}
            />
          ),
        }}
        tabBar={(props) => <FloatingTabBar {...props} />}
      >
        <Tabs.Screen name="calendar" options={{ title: "日历" }} />
        <Tabs.Screen name="journal"  options={{ title: "日志" }} />
        <Tabs.Screen name="profile"  options={{ title: "个人资料" }} />
        <Tabs.Screen name="index"    options={{ title: "生成器" }} />
        <Tabs.Screen name="gyms"     options={{ title: "Gyms", headerShown: false }} />
      </Tabs>
    </View>
  );
}
