// app/(drawer)/_layout.tsx
import React from "react";
import { Dimensions, useColorScheme } from "react-native";
import { Drawer } from "expo-router/drawer";
import { useSegments } from "expo-router";
import { AppDrawerContent } from "@/components/drawer/AppDrawerContent";

const { width: SCREEN_W } = Dimensions.get("window");
const DRAWER_W = Math.min(300, SCREEN_W * 0.72);
const SWIPE_TABS = new Set(["index", "activity"]);

const DRAWER_BG_LIGHT = "#F7F8F5";
const DRAWER_BG_DARK = "#1A1F17";

export default function DrawerLayout() {
  const segments = useSegments();
  const scheme = useColorScheme();
  const tabsIdx = segments.indexOf("(tabs)" as never);
  const currentTab = tabsIdx >= 0 ? (segments[tabsIdx + 1] as string | undefined) : undefined;
  // Only enable drawer edge-swipe on tabs that opted in. When the user has
  // pushed a root-Stack route on top of the drawer (e.g. /coach), there is
  // no `(tabs)` in segments → currentTab is undefined → swipe must be off so
  // iOS native swipe-back pops the screen instead of revealing the drawer.
  const swipeEnabled = !!currentTab && SWIPE_TABS.has(currentTab);
  const drawerBg = scheme === "dark" ? DRAWER_BG_DARK : DRAWER_BG_LIGHT;

  return (
    <Drawer
      drawerContent={(props) => <AppDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: "back",
        drawerStyle: {
          backgroundColor: drawerBg,
          width: DRAWER_W,
        },
        overlayColor: "transparent",
        swipeEnabled,
        swipeEdgeWidth: 40,
      }}
    >
      <Drawer.Screen
        name="(tabs)"
        options={{
          drawerItemStyle: { display: "none" },
          // Override @react-navigation/drawer's internal <Background> which
          // defaults to `colors.background` (#F2F2F2 light gray). Without
          // this, the rounded-corner cutout on main content shows that
          // gray instead of the drawer. See node_modules/@react-navigation/
          // elements/src/Background.tsx.
          sceneStyle: { backgroundColor: drawerBg },
        }}
      />
    </Drawer>
  );
}
