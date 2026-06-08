// src/features/profile/components/ProfileChromeRoot.tsx
// Window BX — Profile Fixed Chrome. Shared chrome wrapper for BOTH the
// self profile (app/(drawer)/(tabs)/profile/index.tsx) and the other-user
// profile (app/community/u/[id].tsx).
//
// ──────────────────────────────────────────────────────────────────────
// Architecture: fixed chrome + per-tab scroll (Twitter / Instagram model)
// ──────────────────────────────────────────────────────────────────────
// Replaces the old "chase sticky" approach (StickyProfileTabBar measuring a
// spacer's screen Y every frame). Root causes of the BG-era 拖影:
//   1. bar tracked via measure(spacer) on a 60Hz worklet vs 120Hz native
//      scroll → the two pipelines desynced → spacer top leaked above the bar
//   2. PagerView's native CALayer drew over JS-zIndex siblings inside the
//      scroll content
//
// This component fixes both:
//   • Every tab is its OWN <Animated.ScrollView>. There is no outer
//     scroll view, so nothing to chase.
//   • The hero (cover) + tab bar are root-level absolute siblings of the
//     PagerView (outside it), so PagerView's native layer can never draw
//     over the tab bar.
//   • The hero translate + tab-bar translate are driven by the *active
//     tab's* scrollY shared value through useAnimatedStyle — same value,
//     same UI thread, same frame as the scroll itself. No cross-thread
//     measure(), so no desync / no 拖影.
//
// ⚠️ Deviation from the plan's literal "tabbar 永不动" coordinate rule
// (flagged for on-device sign-off): a tab bar pinned at headerHeight from
// rest would float over the *middle* of the 335pt cover image, which is not
// the intended rest state. Instead the tab bar travels from rest (bottom of
// the cover, y = heroHeight) up to the pin (y = headerHeight) — but driven
// by the synchronized scrollY shared value, NOT measure(). This keeps the
// Twitter rest→pin UX while still killing the 拖影 root cause. The constants
// below (heroHeight via prop, COLLAPSE, FADE_RANGE) are the on-device tuning
// surface.

import React, {
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import PagerView from "react-native-pager-view";
import Animated, {
  useAnimatedRef,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import { useThemeColors } from "@/lib/useThemeColors";
import ProfileTabBar, {
  PROFILE_TAB_BAR_HEIGHT,
} from "@/components/shared/ProfileTabBar";
import ProfileTabBarNative from "@/components/shared/ProfileTabBarNative";

// BY-spike Item 2 — switch underline ↔ native segmented to capture on-device
// A/B screenshots. spike-only: removed by BY full plan once the user picks a
// permanent variant. grep `SUB_TAB_VARIANT` before shipping BY (risk R4).
const SUB_TAB_VARIANT: "underline" | "native" = "native";

import type {
  ProfileChromePageHandle,
  ProfileChromeRootProps,
  ProfileTabKey,
} from "./ProfileChromeRoot.types";

// Native UITabBarController default height — only relevant for the self
// profile, which lives inside the bottom tab navigator.
const NATIVE_TAB_BAR_HEIGHT = 49;
// Pixels of approach distance to pin over which the nav-bar chrome fades 0→1.
const FADE_RANGE = 80;
// Hooks must run unconditionally, so we allocate a fixed 3 scroll slots
// (max tabs: self=3 / other=3) regardless of how many the caller renders.

export default function ProfileChromeRoot({
  viewMode,
  tabs,
  heroHeight,
  pinFadeProgress,
  renderHero,
  renderPage,
  initialTabKey,
  onActiveTabChange,
}: ProfileChromeRootProps) {
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight() || insets.top + 44;

  // Distance the hero collapses before the tab bar pins under the nav bar.
  const collapse = Math.max(0, heroHeight - headerHeight);
  const contentInsetTop = heroHeight + PROFILE_TAB_BAR_HEIGHT;
  const contentInsetBottom =
    viewMode === "self"
      ? NATIVE_TAB_BAR_HEIGHT + insets.bottom + 12
      : insets.bottom + 24;

  const initialIndex = Math.max(
    0,
    tabs.findIndex((t) => t.key === (initialTabKey ?? tabs[0]?.key)),
  );

  // ── per-tab scroll plumbing (fixed MAX_TABS slots, hooks unconditional) ──
  const scrollY0 = useSharedValue(0);
  const scrollY1 = useSharedValue(0);
  const scrollY2 = useSharedValue(0);
  const scrollYSlots = useMemo(
    () => [scrollY0, scrollY1, scrollY2],
    [scrollY0, scrollY1, scrollY2],
  );

  const scrollRef0 = useAnimatedRef<Animated.ScrollView>();
  const scrollRef1 = useAnimatedRef<Animated.ScrollView>();
  const scrollRef2 = useAnimatedRef<Animated.ScrollView>();
  const scrollRefSlots = useMemo(
    () => [scrollRef0, scrollRef1, scrollRef2],
    [scrollRef0, scrollRef1, scrollRef2],
  );

  // Which tab currently drives the hero/tab-bar. A shared value so the
  // scroll handlers can branch on it inside their worklets.
  const activeIndexSV = useSharedValue(initialIndex);
  // The active tab's live scroll offset — single source the chrome reads.
  const activeScrollY = useSharedValue(0);

  const handler0 = useAnimatedScrollHandler((e) => {
    scrollY0.value = e.contentOffset.y;
    if (activeIndexSV.value === 0) activeScrollY.value = e.contentOffset.y;
  });
  const handler1 = useAnimatedScrollHandler((e) => {
    scrollY1.value = e.contentOffset.y;
    if (activeIndexSV.value === 1) activeScrollY.value = e.contentOffset.y;
  });
  const handler2 = useAnimatedScrollHandler((e) => {
    scrollY2.value = e.contentOffset.y;
    if (activeIndexSV.value === 2) activeScrollY.value = e.contentOffset.y;
  });
  const handlerSlots = useMemo(
    () => [handler0, handler1, handler2],
    [handler0, handler1, handler2],
  );

  // ── tab state + underline ──
  const [activeTab, setActiveTab] = useState<ProfileTabKey>(
    tabs[initialIndex]?.key ?? tabs[0]!.key,
  );
  const tabScrollPosition = useSharedValue(initialIndex);
  const pagerRef = useRef<PagerView>(null);
  const pendingPageRef = useRef<number | null>(null);

  const commitTab = useCallback(
    (idx: number) => {
      const key = tabs[idx]?.key;
      if (!key) return;
      activeIndexSV.value = idx;
      // Snap the chrome's scroll source to the newly-active tab's remembered
      // offset. The hero may visibly "snap" between collapse states when the
      // two tabs sit at different scroll depths — accepted per BX (A1
      // cross-tab collapse sync is deferred to BX-FU-A1).
      activeScrollY.value = scrollYSlots[idx]?.value ?? 0;
      setActiveTab(key);
      onActiveTabChange?.(key);
    },
    [tabs, activeIndexSV, activeScrollY, scrollYSlots, onActiveTabChange],
  );

  const handleTabPress = useCallback(
    (key: string) => {
      const idx = tabs.findIndex((t) => t.key === key);
      if (idx >= 0) pagerRef.current?.setPage(idx);
    },
    [tabs],
  );

  const onPageScroll = useCallback(
    (e: { nativeEvent: { position: number; offset: number } }) => {
      tabScrollPosition.value = e.nativeEvent.position + e.nativeEvent.offset;
    },
    [tabScrollPosition],
  );

  const onPageSelected = useCallback(
    (e: { nativeEvent: { position: number } }) => {
      pendingPageRef.current = e.nativeEvent.position;
    },
    [],
  );

  const onPageScrollStateChanged = useCallback(
    (e: { nativeEvent: { pageScrollState: string } }) => {
      if (
        e.nativeEvent.pageScrollState === "idle" &&
        pendingPageRef.current !== null
      ) {
        commitTab(pendingPageRef.current);
        pendingPageRef.current = null;
      }
    },
    [commitTab],
  );

  // ── chrome animated styles (all driven by the single activeScrollY) ──
  const heroStyle = useAnimatedStyle(() => {
    const sy = Math.max(0, activeScrollY.value);
    const collapsed = Math.min(sy, collapse);
    // Fade the hero out over the last FADE_RANGE before pin (same ramp as
    // pinFadeProgress below) so the cover + id-block crossfade INTO the nav
    // bar's avatar+name exactly as the tab bar pins — no id-block rows
    // peeking under the nav, and the top settles to colors.background (渐白)
    // in lockstep with CollapsingHeaderBg. translate + fade together = the
    // header "收起来" instead of just sliding up opaque.
    const distanceToPin = collapse - sy;
    const pinProgress =
      distanceToPin >= FADE_RANGE
        ? 0
        : distanceToPin <= 0
          ? 1
          : 1 - distanceToPin / FADE_RANGE;
    return {
      transform: [{ translateY: -collapsed }],
      opacity: 1 - pinProgress,
    };
  });

  const tabBarStyle = useAnimatedStyle(() => {
    const sy = Math.max(0, activeScrollY.value);
    return { transform: [{ translateY: heroHeight - Math.min(sy, collapse) }] };
  });

  // Publish 0→1 pin progress for the caller's CollapsingHeaderBg/Title.
  useAnimatedReaction(
    () => Math.max(0, activeScrollY.value),
    (sy) => {
      const distanceToPin = collapse - sy;
      pinFadeProgress.value =
        distanceToPin >= FADE_RANGE
          ? 0
          : distanceToPin <= 0
            ? 1
            : 1 - distanceToPin / FADE_RANGE;
    },
    [collapse],
  );

  // ── page handles handed to each tab's content component ──
  const pageHandles: ProfileChromePageHandle[] = useMemo(
    () =>
      tabs.map((t, i) => ({
        key: t.key,
        scrollY: scrollYSlots[i]!,
        scrollHandler: handlerSlots[i]!,
        scrollRef: scrollRefSlots[i]!,
        contentInsetTop,
        contentInsetBottom,
      })),
    [
      tabs,
      scrollYSlots,
      handlerSlots,
      scrollRefSlots,
      contentInsetTop,
      contentInsetBottom,
    ],
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* [base] Pager — each page owns its own Animated.ScrollView */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={initialIndex}
        onPageScroll={onPageScroll}
        onPageSelected={onPageSelected}
        onPageScrollStateChanged={onPageScrollStateChanged}
        overdrag
      >
        {tabs.map((t, i) => (
          <View key={t.key} style={styles.page} collapsable={false}>
            {renderPage(pageHandles[i]!)}
          </View>
        ))}
      </PagerView>

      {/* [zIndex 5] Hero visual — translates up to collapse */}
      <Animated.View
        pointerEvents="box-none"
        style={[
          styles.hero,
          { height: heroHeight },
          heroStyle,
        ]}
      >
        {renderHero(activeScrollY)}
      </Animated.View>

      {/* [zIndex 10] Tab bar — root sibling above PagerView; travels
          rest → pin via the same synchronized activeScrollY */}
      <Animated.View
        style={[
          styles.tabBar,
          { height: PROFILE_TAB_BAR_HEIGHT },
          tabBarStyle,
        ]}
      >
        {SUB_TAB_VARIANT === "native" ? (
          <ProfileTabBarNative
            tabs={tabs}
            activeTab={activeTab}
            onTabPress={handleTabPress}
            scrollPosition={tabScrollPosition}
          />
        ) : (
          <ProfileTabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabPress={handleTabPress}
            scrollPosition={tabScrollPosition}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  pager: { flex: 1, zIndex: 0 },
  page: { flex: 1 },
  hero: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 5,
    overflow: "hidden",
  },
  tabBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
