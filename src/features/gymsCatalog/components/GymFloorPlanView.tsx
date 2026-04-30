import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '../../../lib/useThemeColors';
import type { GymRoute, WallSection } from '../types';
import { RouteDot, deriveRoutePosition } from './RouteDot';
import { WallPin } from './WallPin';

interface Props {
  floorPlanUrl: string | null | undefined;
  floorPlanSource?: ImageSourcePropType;
  wallSections: WallSection[];
  routes?: GymRoute[];
  selectedSectionId: string | null;
  onSelectSection: (id: string | null) => void;
  onSelectRoute?: (routeId: string) => void;
  cacheKey?: string;
  /** Fraction of the container that's covered by an overlapping bottom
   *  sheet (e.g. 0.25 = bottom 25% hidden). The image is centered
   *  vertically within the visible area instead of the full container,
   *  so the user can still see the whole floor plan when the sheet
   *  sits at its smallest detent. */
  bottomInsetFraction?: number;
  /** Bump this number to imperatively reset zoom + pan back to the
   *  default (full-overview) state. Used by the "back to gym" wall
   *  title chevron on the sheet. */
  resetSignal?: number;
  onError?: () => void;
}

type ViewState = {
  scale: number;
  translateX: number;
  translateY: number;
};

const viewStateCache = new Map<string, ViewState>();
const DEFAULT_VIEW: ViewState = { scale: 1, translateX: 0, translateY: 0 };

const ROUTE_DOTS_THRESHOLD = 1.5;

export function GymFloorPlanView({
  floorPlanUrl,
  floorPlanSource,
  wallSections,
  routes = [],
  selectedSectionId,
  onSelectSection,
  onSelectRoute,
  cacheKey,
  bottomInsetFraction = 0,
  resetSignal,
  onError,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initial = (cacheKey && viewStateCache.get(cacheKey)) || DEFAULT_VIEW;

  const scale = useSharedValue(initial.scale);
  const savedScale = useSharedValue(initial.scale);
  const translateX = useSharedValue(initial.translateX);
  const translateY = useSharedValue(initial.translateY);
  const savedTranslateX = useSharedValue(initial.translateX);
  const savedTranslateY = useSharedValue(initial.translateY);

  // Container size mirrored into shared values so gesture worklets
  // (UI thread) can read it without a JS bridge.
  const containerW_sv = useSharedValue(0);
  const containerH_sv = useSharedValue(0);

  // Image-point under the pinch focal at gesture start (offset from
  // container center, in image-pre-transform coords). Used to keep
  // that exact point under the user's fingers while they pinch —
  // i.e., zoom anchored at the fingers, not the view center.
  const pinchAnchorX = useSharedValue(0);
  const pinchAnchorY = useSharedValue(0);
  // Pinch + pan run via Gesture.Simultaneous(...) so they fire on the
  // same frames. Without this gate, pan's onChange keeps writing
  // translateX/Y based on the centroid of all touch points, which
  // would (a) blow away pinch's focal-point math during a pinch, and
  // (b) jolt the image when the user releases one finger from a pinch
  // — the centroid jumps from "midpoint of two fingers" to "the one
  // remaining finger", and pan would interpret that jump as user
  // motion. We block pan from pinch.onStart all the way through to
  // pan.onEnd (fully released), not just pinch.onEnd, so the lingering
  // single-finger pan after a pinch doesn't fire either. Pattern from
  // kesha-antonov/react-native-zoom-reanimated.
  const isPinching = useSharedValue(false);
  const panBlocked = useSharedValue(false);

  const persistTo = (s: number, tx: number, ty: number) => {
    if (!cacheKey) return;
    viewStateCache.set(cacheKey, {
      scale: s,
      translateX: tx,
      translateY: ty,
    });
  };

  // Render rect mirrored as shared values so the gesture worklets can
  // use them for boundary clamping and focal-point math without
  // reaching back to the JS thread.
  const rectW_sv = useSharedValue(0);
  const rectH_sv = useSharedValue(0);
  // Bottom-inset fraction mirrored into shared values too — we clamp
  // against the *visible* area (containerH minus sheet overlap), not
  // the full container, so the image can move freely within whatever
  // the user can actually see.
  const bottomInset_sv = useSharedValue(0);

  const pinch = Gesture.Pinch()
    // The moment touch count drops below two, end the pinch immediately.
    // Without this the gesture stays "alive" for a frame after the first
    // finger lifts, and the next onUpdate fires with focalX/Y reporting
    // the *single remaining finger's* position. Our focal-point math
    // would then translate the image to keep the original anchor under
    // that finger — visually "the image follows the remaining finger".
    // Ending in onTouchesUp guarantees onEnd runs before any such
    // single-finger onUpdate.
    .onTouchesUp((e, manager) => {
      'worklet';
      if (e.numberOfTouches < 2) {
        manager.end();
      }
    })
    .onStart((e) => {
      'worklet';
      isPinching.value = true;
      panBlocked.value = true;
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      // Image-point under the focal at gesture start — kept stable on
      // screen during the pinch (focal-point zoom). e.focalX/Y is
      // reported in the gesture-attached view's *layout* coordinate
      // system; because we attach the gesture to an UN-transformed
      // outer View it stays in container coords for the whole gesture.
      const cx = containerW_sv.value / 2;
      const cy = containerH_sv.value / 2;
      pinchAnchorX.value =
        (e.focalX - cx - savedTranslateX.value) / savedScale.value;
      pinchAnchorY.value =
        (e.focalY - cy - savedTranslateY.value) / savedScale.value;
    })
    .onUpdate((e) => {
      'worklet';
      const newScale = Math.min(4, Math.max(1, savedScale.value * e.scale));
      const cx = containerW_sv.value / 2;
      const cy = containerH_sv.value / 2;
      // Pure focal-point math — NO clamp during the gesture. Any
      // boundary check here would fight the math and jerk the image
      // away from the user's fingers (this is the "顶住了" symptom).
      // Pan-end's spring brings things back into bounds afterwards.
      scale.value = newScale;
      translateX.value = e.focalX - cx - pinchAnchorX.value * newScale;
      translateY.value = e.focalY - cy - pinchAnchorY.value * newScale;
    })
    .onEnd(() => {
      'worklet';
      isPinching.value = false;
      // No spring-back, no auto-reset. The image stays exactly where
      // the focal-point math put it, period. Earlier versions had an
      // "if scale ~ 1 then snap to default" branch that doubled as a
      // recovery hook, but it false-fired on stray two-finger touches
      // (scale barely changed, reset still ran, translate jumped to
      // 0 — the "弹一下" the user kept reporting). Recovery now
      // lives only on the explicit wall-back-chevron in the sheet
      // header, not implicit gestures.
      savedScale.value = scale.value;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(persistTo)(scale.value, translateX.value, translateY.value);
    });

  const pan = Gesture.Pan()
    .onChange((e) => {
      'worklet';
      // Skip while pinch owns the transform OR while we're still in
      // the residual pan tail of a just-ended pinch. panBlocked stays
      // true from pinch.onStart through pan.onEnd (full release), so
      // the centroid-jump that happens when one finger lifts from a
      // pinch never gets applied as a translate.
      if (isPinching.value || panBlocked.value) return;
      translateX.value = translateX.value + e.changeX;
      translateY.value = translateY.value + e.changeY;
    })
    .onEnd(() => {
      'worklet';
      // Always clear panBlocked here — this is the only way it gets
      // unset, ensuring fresh single-finger pans after a pinch are
      // unaffected. Persist only if we actually owned the transform
      // (i.e. wasn't a blocked-pan pass-through after a pinch).
      const wasOwning = !panBlocked.value && !isPinching.value;
      panBlocked.value = false;
      if (!wasOwning) return;
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
      runOnJS(persistTo)(scale.value, translateX.value, translateY.value);
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Binary toggle (no cross-fade): below threshold = cluster pins,
  // at/above = route dots. Both layers stay mounted at all times so
  // React doesn't have to mount/unmount 60 RouteDot subtrees when the
  // user crosses the threshold mid-pinch — that mount work was causing
  // a one-frame jitter of the whole floor plan. Visibility is driven
  // entirely by animated opacity (instant 0/1 step), and pointerEvents
  // is flipped via a JS state mirrored from the worklet — that state
  // only changes once per threshold crossing, so re-render cost is
  // negligible compared to mount/unmount.
  const clusterOpacityStyle = useAnimatedStyle(() => ({
    opacity: scale.value < ROUTE_DOTS_THRESHOLD ? 1 : 0,
  }));
  const dotsOpacityStyle = useAnimatedStyle(() => ({
    opacity: scale.value >= ROUTE_DOTS_THRESHOLD ? 1 : 0,
  }));
  const [showRouteDots, setShowRouteDots] = useState(
    initial.scale >= ROUTE_DOTS_THRESHOLD,
  );
  useAnimatedReaction(
    () => scale.value >= ROUTE_DOTS_THRESHOLD,
    (curr, prev) => {
      if (curr !== prev) runOnJS(setShowRouteDots)(curr);
    },
  );

  const [imageSize, setImageSize] = useState<{ w: number; h: number } | null>(
    null,
  );
  const [containerSize, setContainerSize] = useState<{
    w: number;
    h: number;
  } | null>(null);

  useEffect(() => {
    if (containerSize) {
      containerW_sv.value = containerSize.w;
      containerH_sv.value = containerSize.h;
    }
  }, [containerSize, containerW_sv, containerH_sv]);

  useEffect(() => {
    bottomInset_sv.value = bottomInsetFraction;
  }, [bottomInsetFraction, bottomInset_sv]);

  // Reset to default view (scale=1, translate=0) when the parent
  // bumps `resetSignal`. Skips the very first run so the view doesn't
  // animate away from a cached state on mount. Also clears the
  // persistent cache for this gym so a subsequent remount also starts
  // fresh.
  const isFirstResetRun = useRef(true);
  useEffect(() => {
    if (isFirstResetRun.current) {
      isFirstResetRun.current = false;
      return;
    }
    scale.value = withTiming(1);
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
    if (cacheKey) viewStateCache.delete(cacheKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  useEffect(() => {
    if (floorPlanSource) {
      const resolved = Image.resolveAssetSource(
        floorPlanSource as Parameters<typeof Image.resolveAssetSource>[0],
      );
      if (resolved?.width && resolved?.height) {
        setImageSize({ w: resolved.width, h: resolved.height });
      }
      return;
    }
    if (floorPlanUrl) {
      Image.getSize(
        floorPlanUrl,
        (w, h) => setImageSize({ w, h }),
        () => setImageSize(null),
      );
    }
  }, [floorPlanSource, floorPlanUrl]);

  const renderRect = useMemo(() => {
    if (!imageSize || !containerSize) return null;
    const { w: W, h: H } = containerSize;
    // Effective height = the area that's NOT covered by an
    // overlapping bottom sheet. Centering the image against this
    // smaller area shifts it up so the bottom of the floor plan
    // doesn't disappear behind the sheet's smallest detent.
    const visibleH = H * (1 - bottomInsetFraction);
    const cAspect = W / visibleH;
    const iAspect = imageSize.w / imageSize.h;
    if (cAspect < iAspect) {
      const renderH = W / iAspect;
      return { x: 0, y: (visibleH - renderH) / 2, w: W, h: renderH };
    } else {
      const renderW = visibleH * iAspect;
      return { x: (W - renderW) / 2, y: 0, w: renderW, h: visibleH };
    }
  }, [imageSize, containerSize, bottomInsetFraction]);

  // Mirror render rect dims into shared values so gesture worklets can
  // clamp pan/zoom to image bounds.
  useEffect(() => {
    if (renderRect) {
      rectW_sv.value = renderRect.w;
      rectH_sv.value = renderRect.h;
    }
  }, [renderRect, rectW_sv, rectH_sv]);

  const [imageFailed, setImageFailed] = useState(false);
  const showFallback = imageFailed || (!floorPlanSource && !floorPlanUrl);

  if (showFallback) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>
          {tr('Floor plan 暂未上传', 'Floor plan unavailable')}
        </Text>
      </View>
    );
  }

  return (
    <GestureDetector gesture={composed}>
      <View
        style={styles.outer}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          setContainerSize({ w: width, h: height });
        }}
      >
        {/* The image lives in a transformed Animated.View. Crucially
            the gesture detector is on the OUTER (untransformed) view —
            otherwise focalX from pinch is reported in coords that
            shift while the gesture is in progress, which produces a
            feedback loop where the zoom drifts toward the view
            center instead of staying anchored at the user's fingers. */}
        <Animated.View style={[StyleSheet.absoluteFill, imageAnimatedStyle]}>
          {renderRect ? (
            <View
              style={{
                position: 'absolute',
                left: renderRect.x,
                top: renderRect.y,
                width: renderRect.w,
                height: renderRect.h,
              }}
            >
              <Image
                source={floorPlanSource ?? { uri: floorPlanUrl as string }}
                style={styles.imageInRect}
                resizeMode="stretch"
                onLoadEnd={() =>
                  persistTo(scale.value, translateX.value, translateY.value)
                }
                onError={() => {
                  setImageFailed(true);
                  onError?.();
                }}
              />
            </View>
          ) : (
            <Image
              source={floorPlanSource ?? { uri: floorPlanUrl as string }}
              style={styles.image}
              resizeMode="contain"
              onError={() => {
                setImageFailed(true);
                onError?.();
              }}
            />
          )}
        </Animated.View>

      {/* Pin layers — siblings of the transformed image, NOT inside
          the transform. Each pin's animated style projects its
          image-relative position into screen-space using the gesture
          shared values, so pins stay at constant native pixel size
          (no scale on the pin layer = no resampling = sharp). */}
      {renderRect && containerSize ? (
        <>
          {/* Cluster (wall count pins). Always mounted; opacity
              snaps to 0 instantly when scale crosses the threshold. */}
          <Animated.View
            style={[StyleSheet.absoluteFill, clusterOpacityStyle]}
            pointerEvents={showRouteDots ? 'none' : 'box-none'}
          >
            {wallSections.map((section) => (
              <WallPin
                key={section.id}
                section={section}
                selected={selectedSectionId === section.id}
                onPress={() =>
                  onSelectSection(
                    selectedSectionId === section.id ? null : section.id,
                  )
                }
                containerW={containerSize.w}
                containerH={containerSize.h}
                rectX={renderRect.x}
                rectY={renderRect.y}
                rectW={renderRect.w}
                rectH={renderRect.h}
                scale={scale}
                translateX={translateX}
                translateY={translateY}
              />
            ))}
          </Animated.View>
          {/* Route dots — same pattern. */}
          <Animated.View
            style={[StyleSheet.absoluteFill, dotsOpacityStyle]}
            pointerEvents={showRouteDots ? 'box-none' : 'none'}
          >
            {routes.map((r) => {
              const wall = wallSections.find(
                (w) => w.id === r.wall_section_id,
              );
              if (!wall) return null;
              return (
                <RouteDot
                  key={r.id}
                  route={r}
                  position={deriveRoutePosition(r, wall)}
                  onPress={() => onSelectRoute?.(r.id)}
                  containerW={containerSize.w}
                  containerH={containerSize.h}
                  rectX={renderRect.x}
                  rectY={renderRect.y}
                  rectW={renderRect.w}
                  rectH={renderRect.h}
                  scale={scale}
                  translateX={translateX}
                  translateY={translateY}
                />
              );
            })}
          </Animated.View>
        </>
      ) : null}
      </View>
    </GestureDetector>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    outer: {
      flex: 1,
      backgroundColor: c.backgroundSecondary,
      overflow: 'hidden',
    },
    image: {
      ...StyleSheet.absoluteFillObject,
    },
    imageInRect: {
      width: '100%',
      height: '100%',
    },
    fallback: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.backgroundSecondary,
    },
    fallbackText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
    },
  });
