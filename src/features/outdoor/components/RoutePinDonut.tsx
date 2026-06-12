// src/features/outdoor/components/RoutePinDonut.tsx
// CB Phase F — a ratio donut: four style arcs (boulder/sport/trad/other)
// proportional to the area's composition. Two uses, both as Mapbox MarkerView
// children:
//   - selected pin → large (54), count in the hole, gentle scale+fade-in
//   - F4 mix-pin rings → small (26), no count, static (no animation)
//
// Colors come from the shared STYLE_COLORS (RoutePinCluster) so dots, rings,
// donut and the legend all match.

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '../../../lib/theme';
import type { AreaComposition } from '../types';
import { STYLE_COLORS } from './RoutePinCluster';

type Props = {
  composition: AreaComposition;
  /** Outer diameter in px (default 54 = selected). */
  size?: number;
  /** Show the total in the center hole (default true). */
  showCount?: boolean;
  /** Scale+fade entrance (default true). Off for the static F4 rings. */
  animate?: boolean;
};

export default function RoutePinDonut({
  composition,
  size = 54,
  showCount = true,
  animate = true,
}: Props) {
  const stroke = Math.max(4, Math.round(size * 0.17));
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;

  const scale = useSharedValue(animate ? 0.85 : 1);
  const opacity = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    scale.value = withTiming(1, { duration: 160, easing: Easing.out(Easing.cubic) });
    opacity.value = withTiming(1, { duration: 140, easing: Easing.out(Easing.quad) });
  }, [animate, scale, opacity]);
  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const total = composition.total || 0;
  const segments = (
    [
      ['boulder', composition.boulder],
      ['sport', composition.sport],
      ['trad', composition.trad],
      ['other', composition.other],
    ] as const
  ).filter(([, v]) => v > 0);

  let offset = 0;
  return (
    <Animated.View
      style={[styles.wrap, { width: size, height: size }, animStyle]}
    >
      <Svg width={size} height={size}>
        <Circle cx={c} cy={c} r={r} fill="#FFFFFF" />
        {total > 0 && segments.length > 0 ? (
          segments.map(([key, v]) => {
            const len = (v / total) * circ;
            const el = (
              <Circle
                key={key}
                cx={c}
                cy={c}
                r={r}
                fill="none"
                stroke={STYLE_COLORS[key]}
                strokeWidth={stroke}
                strokeDasharray={[len, circ - len]}
                strokeDashoffset={-offset}
                rotation={-90}
                originX={c}
                originY={c}
              />
            );
            offset += len;
            return el;
          })
        ) : (
          <Circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={STYLE_COLORS.other}
            strokeWidth={stroke}
          />
        )}
      </Svg>
      {showCount ? (
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.count, { fontSize: Math.round(size * 0.26) }]}>
            {total}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontFamily: theme.fonts.bold,
    color: theme.colors.textPrimary,
  },
});
