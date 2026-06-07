// src/features/profile/components/ProfileChromeRoot.types.ts
// Window BX — Profile Fixed Chrome.
//
// Unified "page handle" contract handed to every tab's content component
// (ActivityFeedSection / StatsAndBadgesSection / ProfileListsWrapper) so
// each tab owns its own scroller. ProfileChromeRoot creates one handle per
// tab and threads it down; the section component wires the four reanimated
// handles onto a single <Animated.ScrollView>.
//
// Phase 0 finding (2026-06-07): all three Profile tabs render fixed-length
// preview content (Media cap 6 / Sessions cap 3 / Climbs cap 3, Stats = 4
// static cards, Lists = .map() of a short list). There is no top-level
// FlatList and no cursor pagination anywhere in the content layer, so the
// scroller is uniformly Animated.ScrollView — NOT the union
// (Animated.FlatList<any> | Animated.ScrollView) the original plan assumed.

import type { ReactNode } from "react";
import type Animated from "react-native-reanimated";
import type {
  AnimatedRef,
  SharedValue,
  useAnimatedScrollHandler,
} from "react-native-reanimated";

export type ProfileTabKey = "activity" | "stats" | "lists";

export type ProfileChromeViewMode = "self" | "other";

/**
 * One per tab. ProfileChromeRoot owns the lifecycle of every field; the
 * section component is a pure consumer — it spreads these onto its
 * <Animated.ScrollView> and never creates its own scroll plumbing.
 */
export type ProfileChromePageHandle = {
  key: ProfileTabKey;
  /** This tab's vertical scroll offset (px). Drives hero collapse when active. */
  scrollY: SharedValue<number>;
  /** Spread onto Animated.ScrollView `onScroll` (scrollEventThrottle={1}). */
  scrollHandler: ReturnType<typeof useAnimatedScrollHandler>;
  /** Imperative scroll handle (scrollTo for future cross-tab sync — BX-FU-A1). */
  scrollRef: AnimatedRef<Animated.ScrollView>;
  /** = heroHeight + tabBarHeight. Reserve as contentContainerStyle.paddingTop. */
  contentInsetTop: number;
  /** Bottom safe padding (native tab bar for self / safe-area for other). */
  contentInsetBottom: number;
};

export type ProfileChromeTab = {
  key: ProfileTabKey;
  label: string;
};

export type ProfileChromeRootProps = {
  viewMode: ProfileChromeViewMode;
  /** Self = 3 tabs (activity/stats/lists); other-user also 3 (public stats). */
  tabs: readonly ProfileChromeTab[];
  /** Expanded cover/hero height in px (visible cover). On-device tunable. */
  heroHeight: number;
  /**
   * Caller-owned sink. ProfileChromeRoot writes 0→1 as the active tab's
   * scroll approaches pin; the caller feeds it to CollapsingHeaderBg /
   * CollapsingHeaderTitle via navigation.setOptions (native nav bar).
   */
  pinFadeProgress: SharedValue<number>;
  /**
   * Hero (cover + identity) renderer. Receives the *active* tab's scrollY
   * so the cover can keep its overscroll parallax. The hero View itself is
   * translated/faded by ProfileChromeRoot — the renderer only supplies content.
   */
  renderHero: (activeScrollY: SharedValue<number>) => ReactNode;
  /** Per-tab content renderer. Called once per tab with that tab's handle. */
  renderPage: (handle: ProfileChromePageHandle) => ReactNode;
  initialTabKey?: ProfileTabKey;
  onActiveTabChange?: (key: ProfileTabKey) => void;
};
