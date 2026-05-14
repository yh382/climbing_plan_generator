// src/components/shared/StickyProfileTabBar.tsx
// Window BG fix v5 — absolute-overlay sticky tab bar (Fallback B).
//
// Background. v4 rendered the bar INSIDE the parent's ScrollView as a
// translateY-clamped child. On real device we hit a regression: when
// scrolling past the pin moment, the first ~46pt of additional scroll
// showed PagerView media thumbnails bleeding THROUGH the bar's
// background. Cause: PagerView is `react-native-pager-view`, which
// renders a native `UIPageViewController` on iOS. Its CALayer sits
// above RN JS-level `zIndex` in the native stacking order — sibling
// `zIndex` on the bar wrapper does not push the bar above the
// PagerView native layer, so the PagerView's first content (MEDIA
// section grid) draws on top of the bar during the 46pt overlap
// window.
//
// v5 — render the bar as an ABSOLUTE OVERLAY at the same DOM level
// as the ScrollView (sibling), not inside the scroll content. The bar
// is now a sibling of the screen root <View>, completely outside the
// PagerView's native parent, so PagerView cannot draw above it.
//
// Position tracking: the parent keeps a 46pt SPACER inside the
// ScrollView at the bar's natural flex position. The spacer holds an
// `useAnimatedRef`; this component calls `measure(spacerRef)` inside a
// reanimated worklet to read the spacer's current absolute screen
// `pageY` every frame. The bar's `top` mirrors the spacer's screen Y,
// clamped against `headerHeight` so it pins to the nav bar bottom.
//
// Side benefit: a `pinFadeProgress` shared value is published from the
// same worklet. Goes from 0 (far below pin) → 1 (at pin), driven by
// the spacer's distance to `headerHeight`. CollapsingHeaderBg/Title
// consume it directly — no scroll arithmetic in those components.

import React from "react";
import { StyleSheet } from "react-native";
import Animated, {
  measure,
  useAnimatedStyle,
  type AnimatedRef,
  type SharedValue,
} from "react-native-reanimated";
import { useHeaderHeight } from "@react-navigation/elements";

import ProfileTabBar from "./ProfileTabBar";

// Pixels of approach distance to pin over which the fade ramps 0 → 1.
const FADE_RANGE = 80;

// Bar top corner radius at rest. Animates to 0 as the bar approaches
// pin so the bar's top "carves" into the cover image when scrolled
// little (matches the original profile mockup intent — the prior
// contentShell carve never rendered because its 4pt height clipped the
// radius to ~2pt). 35 mirrors the contentShell's borderTopLeftRadius
// from the original design.
const REST_RADIUS = 35;

type Props = {
  scrollY: SharedValue<number>;
  activeTab: string;
  onTabPress: (key: string) => void;
  scrollPosition?: SharedValue<number>;
  /**
   * AnimatedRef on a spacer View rendered inside the parent's
   * ScrollView at the bar's natural flex position. The spacer should
   * be `PROFILE_TAB_BAR_HEIGHT` tall so the PagerView lands beneath
   * the bar visually.
   */
  spacerRef: AnimatedRef<Animated.View>;
  /**
   * Shared value bumped by the spacer's onLayout (parent-owned). The
   * worklet reads this as a dependency so it re-runs after the spacer
   * is first laid out — without this, `measure(spacerRef)` keeps
   * returning null on the first paint (worklet only re-runs when
   * shared values change; scrollY doesn't change on mount), leaving
   * the bar stuck at the off-screen sentinel until the user scrolls.
   */
  layoutVersion: SharedValue<number>;
  /**
   * Reanimated sink — written from this component's animated style
   * worklet every frame. 0 = bar at rest position, 1 = bar fully
   * pinned. Consumed by CollapsingHeaderBg/Title.
   */
  pinFadeProgress?: SharedValue<number>;
};

export default function StickyProfileTabBar({
  scrollY,
  activeTab,
  onTabPress,
  scrollPosition,
  spacerRef,
  layoutVersion,
  pinFadeProgress,
}: Props) {
  const headerHeight = useHeaderHeight();

  const animatedStyle = useAnimatedStyle(() => {
    // Read scrollY + layoutVersion so the worklet re-runs each frame
    // the user scrolls AND on layout changes (notably first paint —
    // see `layoutVersion` prop doc for why). The shared values
    // themselves aren't used in the math — measure() supplies the
    // live screen Y of the spacer, which already accounts for scroll
    // offset, contentInset, parallax, everything.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    scrollY.value;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    layoutVersion.value;

    const m = measure(spacerRef);
    if (m === null) {
      // Spacer not laid out yet — keep the bar hidden off-screen so
      // there's no flash at the wrong Y on first paint.
      return {
        top: -9999,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      };
    }

    const naturalTop = m.pageY;
    const distanceToPin = naturalTop - headerHeight;

    const progress =
      distanceToPin >= FADE_RANGE
        ? 0
        : distanceToPin <= 0
          ? 1
          : 1 - distanceToPin / FADE_RANGE;

    if (pinFadeProgress) {
      pinFadeProgress.value = progress;
    }

    const rawTop = naturalTop < headerHeight ? headerHeight : naturalTop;
    // Floor + 1pt overdraw upward to mask sub-pixel gaps between the
    // bar's top and the spacer's top. The 1pt overlap into the area
    // above is harmless: at rest the spacer is transparent and the
    // overlap renders over the cover (or its corner-cutaway when the
    // radius is non-zero); at pin the overlap sits 1pt into the nav
    // bar zone, where CollapsingHeaderBg's opaque background covers
    // any visible artifact.
    const top = Math.floor(rawTop) - 1;

    // Radius animates from REST_RADIUS → 0 as the bar approaches pin.
    // At rest the rounded corners reveal the cover image beneath the
    // (transparent) spacer's corners — that's the "carve" effect.
    // At pin the radius is 0 so the bar joins the nav bar flush.
    const radius = REST_RADIUS * (1 - progress);

    return {
      top,
      borderTopLeftRadius: radius,
      borderTopRightRadius: radius,
    };
  });

  return (
    <Animated.View style={[styles.wrap, animatedStyle]}>
      <ProfileTabBar
        activeTab={activeTab}
        onTabPress={onTabPress}
        scrollPosition={scrollPosition}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    // Sit above any sibling content; outside the ScrollView, so this is
    // root-level and not subject to PagerView's native layer stacking.
    zIndex: 30,
    // Clip ProfileTabBar's stickyWrap (which has its own backgroundColor)
    // to the animated borderTopLeftRadius / borderTopRightRadius so the
    // carve effect at rest actually cuts the bar's top corners.
    overflow: "hidden",
  },
});
