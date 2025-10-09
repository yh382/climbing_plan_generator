import { Tabs } from "expo-router";
import FloatingTabBar from "../../components/FloatingTabBar";
import TopBar from "../../components/TopBar";
import { useColorScheme, View } from "react-native";


// ✅ 片段1：保持上面的 import 不变

export default function TabsLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  return (
  <View style={{ flex: 1, backgroundColor: isDark ? "#0B1220" : "#FFFFFF" }}>
    <Tabs
      screenOptions={{
        // 全局默认：有 TopBar
        header: ({ route }) => <TopBar routeName={route.name} />,
      }}
      tabBar={(props) => <FloatingTabBar {...props} />}
    >
      {/* 中区三项 */}
      <Tabs.Screen
        name="calendar"
        options={{
          title: "日历",
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "日志",
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "个人资料",
        }}
      />

      {/* 生成器对应 index.tsx */}
      <Tabs.Screen
        name="index"
        options={{
          title: "生成器",
        }}
      />

      <Tabs.Screen
        name="gyms"
        options={{
          title: "Gyms",
          headerShown: false,
        }}
      />
    </Tabs>
  </View>
  );
}

