// app/(tabs)/_layout.tsx

import { Tabs } from "expo-router";
import FloatingTabBar from "../../components/FloatingTabBar"; // 确保路径正确
import TopBar from "../../components/TopBar"; // 确保路径正确
import React from "react";
import { useColorScheme, View } from "react-native";
import { useUserStore } from "../../src/store/useUserStore";

export default function TabsLayout() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const { user } = useUserStore();
  const username = user?.username ?? "Profile";

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? "#0B1220" : "#FFFFFF" }}>
      <Tabs
        tabBar={(props) => <FloatingTabBar {...props} />}
        screenOptions={{
          headerShown: true, 
          // 统一控制 TopBar 的显示逻辑
          header: ({ route }) => {
             // 1. Profile 页显示用户名
             const title = route.name === 'profile' ? username : undefined;
             
             // 2. 不需要原生 Header 的页面列表
             // 'index' (即 Home), 'community', 'calendar', 'action', 'plan_generator'
             const hideHeaderRoutes = ['index', 'home', 'community', 'calendar', 'action', 'plan_generator', 'gyms', 'journal'];
             
             if (hideHeaderRoutes.includes(route.name)) {
                 return null;
             }
             
             // 3. 其他页面显示默认 TopBar
             return <TopBar routeName={route.name} title={title} />;
          }
        }}
      >
        {/* --- 主 Tab 页面 --- */}
        
        {/* 1. 首页 (原 home.tsx 现为 index.tsx) */}
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        
        {/* 2. 日历 */}
        <Tabs.Screen name="calendar" options={{ title: "Calendar" }} />
        
        {/* 3. Action (+) 占位 */}
        <Tabs.Screen name="action" options={{ title: "Post" }} />
        
        {/* 4. 社区 */}
        <Tabs.Screen name="community" options={{ title: "Community" }} />
        
        {/* 5. 个人资料 */}
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />

        {/* --- 隐藏/辅助路由 --- */}
        
        {/* 计划生成器 (原 index.tsx) */}
        <Tabs.Screen name="plan_generator" options={{ href: null }} />
        
        <Tabs.Screen name="journal" options={{ href: null }} />
        <Tabs.Screen name="gyms" options={{ href: null }} />
        {/* 如果不再有 home.tsx，可以不写 name="home" 的 Screen，或者保留以防缓存 */}
      </Tabs>
    </View>
  );
}