// Indoor gym map screen (Window AR). Push-route, sits outside the
// (drawer)/(tabs) shell so the floor plan's pinch gesture doesn't fight
// the drawer's edge swipe.

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Host, Button, VStack, GlassEffectContainer } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  frame,
  labelStyle,
  font,
  glassEffect,
} from '@expo/ui/swift-ui/modifiers';
import {
  GlassUnionGroup,
  glassEffectUnion,
} from '../../modules/glass-effect-union/src';
import {
  rightPillCountButtonModifiers,
  rightPillCountLabel,
} from '../../src/features/mapscreen/components/MapTopBar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { TopFadeMaskView } from '../../src/components/shared/TopFadeMaskView';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { useSettings } from '../../src/contexts/SettingsContext';
import { theme } from '../../src/lib/theme';
import { useThemeColors } from '../../src/lib/useThemeColors';
import { HeaderButton } from '../../src/components/ui/HeaderButton';
import { gymsCatalogApi } from '../../src/features/gymsCatalog/api';
import { GymFloorPlanView } from '../../src/features/gymsCatalog/components/GymFloorPlanView';
import { GymRoutesSegment } from '../../src/features/gymsCatalog/components/GymRoutesSegment';
import {
  useGymWithSections,
  useRoutesInGym,
} from '../../src/features/gymsCatalog/hooks';
import GymMenuSheet, {
  type GymMenuSheetHandle,
} from '../../src/features/mapscreen/components/GymMenuSheet';
import MapSessionPill from '../../src/features/journal/MapSessionPill';
import { useTodaySendsButton } from '../../src/features/dailysummary/useTodaySendsButton';

// Mock-only floor plan asset. The screen layer wires this into
// GymFloorPlanView when USE_MOCK is set so the bundled PNG is used
// instead of the placeholder asset:/// URL in mockGym.
const MOCK_FLOOR_PLAN_SOURCE = gymsCatalogApi.isMock
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../../assets/mock-gyms/test-gym-floor.png') as number)
  : undefined;

export default function GymMapScreen() {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ gymId: string }>();
  const gymId = params.gymId ?? gymsCatalogApi.mockGymId;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { gym, wallSections, loading, error } = useGymWithSections(gymId);
  const { routes: allActiveRoutes } = useRoutesInGym(gymId, { status: 'active' });
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(
    null,
  );
  const menuSheetRef = useRef<GymMenuSheetHandle>(null);
  // B1 — peek-sheet ref + dismiss / re-present mirrors MapScreenMapbox.
  // Tracks whether the sheet is currently presented natively, so
  // useFocusEffect doesn't fire a redundant present() on an
  // already-visible sheet (which iOS sometimes reacts to by leaving the
  // sheet hidden + the floating top bar invisible — observed when
  // returning from /gym/route/[routeId] after a successful Send).
  const peekSheetRef = useRef<TrueSheet | null>(null);
  const sheetPresentedRef = useRef<boolean>(false);
  const onSheetDidPresent = useCallback(() => {
    sheetPresentedRef.current = true;
  }, []);
  const onSheetDidDismiss = useCallback(() => {
    sheetPresentedRef.current = false;
  }, []);
  const dismissPeekSheet = useCallback(() => {
    peekSheetRef.current?.dismiss().catch(() => {});
  }, []);
  // B1_FU_SWIFTUI — count badge fuses into the right-pill SwiftUI
  // glass-union as a 3rd member; null when count<=0 (pill stays
  // 2-button).
  const todaySendsBtn = useTodaySendsButton(dismissPeekSheet);

  // Bumped to imperatively reset the floor plan zoom + pan back to the
  // default state when the user taps the back-chevron next to the wall
  // title in the sheet header.
  const [floorPlanResetSignal, setFloorPlanResetSignal] = useState(0);
  const handleClearWall = useCallback(() => {
    setSelectedSectionId(null);
    setFloorPlanResetSignal((n) => n + 1);
  }, []);

  // Detent tracking. Index 2 = full (0.8) → mirrors outdoor MapScreenMapbox
  // by hiding the floating top bar so the user sees just the list.
  const SHEET_DETENTS = [0.25, 0.45, 0.8] as const;
  const DETENT_LARGE = 2;
  const [currentDetent, setCurrentDetent] = useState(1);
  const onDetentChange = useCallback(
    (e: { nativeEvent: { index: number } }) => {
      setCurrentDetent(e.nativeEvent.index);
    },
    [],
  );
  const isFullDetent = currentDetent === DETENT_LARGE;

  // Top-bar fade — mirrors MapTopBar.tsx's opacity animation. Apple-spec
  // 200ms ease-in-out matches the system sheet expansion timing closely.
  const topBarOpacity = useSharedValue(1);
  useEffect(() => {
    topBarOpacity.value = withTiming(isFullDetent ? 0 : 1, { duration: 220 });
  }, [isFullDetent, topBarOpacity]);
  const topBarStyle = useAnimatedStyle(() => ({
    opacity: topBarOpacity.value,
  }));

  // On focus regain — happens both on first mount and when popping back
  // from a pushed screen (e.g. /gym/route/[routeId] after a Send).
  // Defensive resets:
  //   1. Force currentDetent → 1 so the top bar isn't stuck at the
  //      faded-out value if the sheet was at DETENT_LARGE before the
  //      push.
  //   2. Snap topBarOpacity → 1 (no animation) so a stuck shared value
  //      from before the push doesn't leave the buttons invisible.
  //   3. Re-present the sheet ONLY if it's currently dismissed.
  //      Calling present() on an already-presented sheet has been seen
  //      to leave it hidden — `dismissible={false}` keeps it presented
  //      across pushes, so the iOS auto-restore handles visibility.
  useFocusEffect(
    useCallback(() => {
      setCurrentDetent(1);
      topBarOpacity.value = 1;
      const id = requestAnimationFrame(() => {
        if (!sheetPresentedRef.current) {
          peekSheetRef.current?.present(1).catch(() => {});
        }
      });
      return () => cancelAnimationFrame(id);
    }, [topBarOpacity]),
  );


  /** Tapping a route dot on the floor plan scopes the sheet list to
   *  that route's wall instead of opening the detail page. The detail
   *  page is reachable only from the list cards — pins are an
   *  in-sheet anchoring affordance, matching KAYA's interaction
   *  model. */
  const handleSelectRouteFromMap = useCallback(
    (routeId: string) => {
      const route = allActiveRoutes.find((r) => r.id === routeId);
      if (!route) return;
      setSelectedSectionId(route.wall_section_id);
    },
    [allActiveRoutes],
  );

  /** Tapping a list card opens the detail page (AS window route). */
  const handleOpenRouteDetail = useCallback(
    (routeId: string) => {
      router.push(`/gym/route/${routeId}` as any);
    },
    [router],
  );

  return (
    <View style={styles.root}>
      {/* B2 #1: top-center "session active" pill — visible whenever a
          climbing session is running while user explores the floor plan. */}
      <MapSessionPill />

      {/* Floor plan ~60% of screen */}
      <View style={styles.floorPlanWrap}>
        {loading && !gym ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={colors.textSecondary} />
          </View>
        ) : error && !gym ? (
          <View style={styles.errorWrap}>
            <Text style={styles.errorText}>
              {tr('加载失败', 'Failed to load gym')}
            </Text>
          </View>
        ) : (
          <GymFloorPlanView
            floorPlanUrl={gym?.floor_plan_url ?? null}
            floorPlanSource={MOCK_FLOOR_PLAN_SOURCE}
            wallSections={wallSections}
            routes={allActiveRoutes}
            selectedSectionId={selectedSectionId}
            onSelectSection={setSelectedSectionId}
            onSelectRoute={handleSelectRouteFromMap}
            cacheKey={gymId}
            // Smallest sheet detent always covers this fraction of the
            // screen. Pass it so the floor plan centers in the upper
            // (visible) area instead of the geometric middle.
            bottomInsetFraction={SHEET_DETENTS[0]}
            resetSignal={floorPlanResetSignal}
          />
        )}

        {/* Top bar — left: back glass circle. Right: vertical fused
            glass pill stacking [share][bookmark]. Sizes (44pt) and
            icon spec (19pt light) match outdoor MapTopBar exactly so
            the floating top bar reads visually identical across modes.
            Fades to 0 when the sheet is fully expanded so the list
            isn't crowded. */}
        <Animated.View
          style={[styles.topBar, { paddingTop: insets.top }, topBarStyle]}
          pointerEvents={isFullDetent ? 'none' : 'box-none'}
        >
          <View>
            <HeaderButton
              icon="chevron.left"
              variant="glass"
              size={44}
              iconSize={19}
              iconWeight="light"
              onPress={() => router.back()}
            />
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ width: 44 }}>
            <Host matchContents>
              <GlassEffectContainer spacing={20}>
                <GlassUnionGroup>
                  <VStack spacing={0}>
                    <Button
                      systemImage={'square.and.arrow.up' as any}
                      label=""
                      onPress={() => {
                        /* TODO AS: share gym */
                      }}
                      modifiers={
                        [
                          buttonStyle('plain'),
                          labelStyle('iconOnly'),
                          font({ size: 19, weight: 'light' }),
                          frame({ width: 44, height: 44, alignment: 'center' }),
                          glassEffect({
                            glass: { variant: 'regular', interactive: true },
                            shape: 'capsule',
                          }),
                          glassEffectUnion('gym-floor-right-pill'),
                        ] as any
                      }
                    />
                    <Button
                      systemImage={'bookmark' as any}
                      label=""
                      onPress={() => {
                        /* TODO AS: bookmark gym */
                      }}
                      modifiers={
                        [
                          buttonStyle('plain'),
                          labelStyle('iconOnly'),
                          font({ size: 19, weight: 'light' }),
                          frame({ width: 44, height: 44, alignment: 'center' }),
                          glassEffect({
                            glass: { variant: 'regular', interactive: true },
                            shape: 'capsule',
                          }),
                          glassEffectUnion('gym-floor-right-pill'),
                        ] as any
                      }
                    />
                    {/* B1_FU_SWIFTUI — today's-sends count fuses into
                        the same glass-union as a 3rd member when count
                        > 0; pill auto-morphs 2↔3. Living inside the
                        SwiftUI subtree avoids the prior RN-sibling
                        @Namespace conflict. */}
                    {todaySendsBtn?.count != null ? (
                      <Button
                        label={rightPillCountLabel(todaySendsBtn.count)}
                        onPress={todaySendsBtn.onPress ?? (() => {})}
                        modifiers={
                          rightPillCountButtonModifiers('gym-floor-right-pill') as any
                        }
                      />
                    ) : null}
                  </VStack>
                </GlassUnionGroup>
              </GlassEffectContainer>
            </Host>
          </View>
        </Animated.View>
      </View>

      {/* Bottom peek sheet. iOS 26 system edge effects don't compose
          with MaskedView's CALayer mask — the system attaches its
          fade rendering as auxiliary layers on the scroll view that
          get clipped/conflicted by the mask. So both edges are handled
          by MaskedView alpha gradients (RN-controlled, predictable):
          - TOP: 80px alpha 0→1 ramp (Apple Maps style soft fade)
          - BOTTOM: 60px alpha 1→0 ramp (mirror)
          No `header` / `footer` props needed — pure RN solution. */}
      <TrueSheet
        ref={peekSheetRef}
        name="gym-routes-peek-sheet"
        detents={[...SHEET_DETENTS]}
        initialDetentIndex={1}
        initialDetentAnimated
        dimmed={false}
        dismissible={false}
        scrollable
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        onDetentChange={onDetentChange}
        onDidPresent={onSheetDidPresent}
        onDidDismiss={onSheetDidDismiss}
      >
        <TopFadeMaskView topFadeRatio={0.15}>
          <ScrollView
            contentContainerStyle={styles.peekScrollBody}
            showsVerticalScrollIndicator={false}
          >
            <GymRoutesSegment
              gymId={gymId}
              wallSections={wallSections}
              pinSectionId={selectedSectionId}
              onSelectRoute={handleOpenRouteDetail}
              hideSectionHeaders={true}
            />
          </ScrollView>
        </TopFadeMaskView>

        {/* Floating title + buttons overlay — sibling of MaskedView at
            level 1, absolutely positioned on top. Title is masked from
            the alpha gradient (separate from ScrollView) so it stays
            fully visible. */}
        <View style={styles.peekHeaderOverlay} pointerEvents="box-none">
          <View style={{ width: 44, height: 44 }}>
            <HeaderButton
              icon="person.2"
              variant="glass"
              size={44}
              iconSize={19}
              iconWeight="light"
              onPress={() => router.push('/gym-community' as any)}
            />
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ width: 44, height: 44 }}>
            <HeaderButton
              icon="line.3.horizontal"
              variant="glass"
              size={44}
              iconSize={19}
              iconWeight="light"
              onPress={() => menuSheetRef.current?.present()}
            />
          </View>
          <View
            style={styles.peekHeaderTitleAbsolute}
            pointerEvents="box-none"
          >
            <View style={styles.peekHeaderTitleRow}>
              {selectedSectionId ? (
                <TouchableOpacity
                  onPress={handleClearWall}
                  hitSlop={10}
                  activeOpacity={0.6}
                  style={styles.peekHeaderBack}
                >
                  <Ionicons
                    name="chevron-back"
                    size={18}
                    color={colors.textPrimary}
                  />
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                onPress={() => menuSheetRef.current?.present()}
                activeOpacity={0.6}
                hitSlop={8}
                style={styles.peekHeaderTitleHit}
              >
                <Text style={styles.peekHeaderTitle} numberOfLines={1}>
                  {(selectedSectionId
                    ? wallSections.find((w) => w.id === selectedSectionId)
                        ?.name
                    : gym?.name) ?? tr('岩馆', 'Gym')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TrueSheet>

      <GymMenuSheet
        ref={menuSheetRef}
        gym={gym}
        wallSections={wallSections}
        floorPlanSource={MOCK_FLOOR_PLAN_SOURCE}
        onSelectRoute={handleOpenRouteDetail}
      />
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.background,
    },
    floorPlanWrap: {
      // Fill the entire screen — the TrueSheet renders as an iOS
      // system modal that floats on top, so the floor plan stays the
      // backdrop. The peek sheet's 0.4 detent visually carves out the
      // bottom 40% but the underlying View still extends behind it.
      flex: 1,
      overflow: 'hidden',
    },
    topBar: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      // flex-start so the back button stays glued to the top while
      // the right vertical pill (which is taller) grows downward —
      // mirrors MapTopBar.overlay's alignment.
      alignItems: 'flex-start',
      // 16pt + paddingTop:insets.top aligns the back button with the
      // system nav-bar button (left edge 16pt, center Y at insets.top+22).
      paddingHorizontal: 16,
      gap: 8,
    },
    peekContentRoot: {
      flex: 1,
    },
    peekScrollBody: {
      // Match overlay header height (76) so initial content sits below
      // the floating overlay. Content still scrolls UNDER the overlay
      // — the iOS 26 system softStyle scrollEdgeEffect creates the
      // gradient fade at scroll top.
      paddingTop: 76,
      paddingBottom: 32,
    },
    peekHeaderOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
      gap: 10,
      zIndex: 10,
    },
    peekHeaderTitleAbsolute: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    peekHeaderTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    peekHeaderBack: {
      paddingHorizontal: 4,
      paddingVertical: 4,
      marginRight: 2,
    },
    peekHeaderTitleHit: {
      maxWidth: '60%',
    },
    peekHeaderTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 20,
      textTransform: 'uppercase',
      color: c.textPrimary,
      flexShrink: 1,
    },
    loadingWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    errorText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
      textAlign: 'center',
    },
  });
