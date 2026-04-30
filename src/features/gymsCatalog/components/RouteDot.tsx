import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import type { GymRoute, WallSection } from '../types';

const COLOR_HEX: Record<string, string> = {
  blue: '#2D6EE6',
  yellow: '#F1C232',
  red: '#E04E4E',
  green: '#2EAE5A',
  black: '#1F1F22',
  white: '#FFFFFF',
  pink: '#EE5BB7',
  purple: '#8E5BD9',
  orange: '#F08A3C',
};

interface Props {
  route: GymRoute;
  /** 0..1 of the floor plan render rect. */
  position: { x: number; y: number };
  size?: number;
  onPress?: () => void;
  containerW: number;
  containerH: number;
  rectX: number;
  rectY: number;
  rectW: number;
  rectH: number;
  scale: SharedValue<number>;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
}

const DEFAULT_SIZE = 16;

export function RouteDot({
  route,
  position,
  size = DEFAULT_SIZE,
  onPress,
  containerW,
  containerH,
  rectX,
  rectY,
  rectW,
  rectH,
  scale,
  translateX,
  translateY,
}: Props) {
  const styles = useMemo(() => createStyles(size), [size]);
  const fill = COLOR_HEX[route.color ?? ''] ?? '#9AA3B2';
  const isLight = route.color === 'white' || route.color === 'yellow';

  const dotX = rectX + position.x * rectW;
  const dotY = rectY + position.y * rectH;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    const cx = containerW / 2;
    const cy = containerH / 2;
    const dx = dotX - cx;
    const dy = dotY - cy;
    const screenX = cx + dx * scale.value + translateX.value;
    const screenY = cy + dy * scale.value + translateY.value;
    return {
      transform: [
        { translateX: screenX - size / 2 },
        { translateY: screenY - size / 2 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable onPress={onPress} hitSlop={6}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: fill,
              borderColor: isLight ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.7)',
            },
          ]}
        />
      </Pressable>
    </Animated.View>
  );
}

/**
 * Compute a deterministic position for a route on the floor plan,
 * scattered around its wall section in a wider radius than before so
 * dots don't clump in the center of each wall.
 */
export function deriveRoutePosition(
  route: GymRoute,
  wall: WallSection,
): { x: number; y: number } {
  let hash = 0;
  for (const ch of route.id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  const angle = ((hash & 0xff) / 255) * Math.PI * 2;
  // Wider spread (0.07 .. 0.20) so 15+ routes per wall don't collapse
  // into a single colored blob.
  const radius = 0.07 + (((hash >> 8) & 0xff) / 255) * 0.13;
  // Slight elliptical bias — gym walls tend to be wider than tall, so
  // we squish the y axis to make rows feel more horizontal.
  return {
    x: Math.max(0.02, Math.min(0.98, wall.floor_plan_x + Math.cos(angle) * radius)),
    y: Math.max(0.02, Math.min(0.98, wall.floor_plan_y + Math.sin(angle) * radius * 0.7)),
  };
}

const createStyles = (size: number) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      top: 0,
    },
    dot: {
      width: size,
      height: size,
      borderRadius: size / 2,
      borderWidth: 1.5,
    },
  });
