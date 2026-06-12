// src/features/outdoor/components/RoutePinDonut.tsx
// CB Phase F (F3) — the SELECTED pin's ratio donut. Four style arcs
// (boulder/sport/trad/other) proportional to the area's composition, the total
// route count in the center hole, a soft drop shadow, and a spring scale-in.
//
// Rendered as the child of a Mapbox MarkerView — only the selected pin mounts
// one, so the (otherwise perf-heavy) RN-view-on-map cost is a single instance.
// Replaces the old translucent-teal highlight halo as the selected treatment.

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { theme } from '../../../lib/theme';
import type { AreaComposition } from '../types';

const SIZE = 54;
const STROKE = 9;
const R = (SIZE - STROKE) / 2;
const CX = SIZE / 2;
const CIRC = 2 * Math.PI * R;

// 4-bucket palette: boulder/sport reuse the pin colors; trad gets a muted green
// (distinct from sandstone-orange + teal-blue); other is neutral grey. trad
// color is device-tunable.
const BUCKET_COLORS: Record<string, string> = {
  boulder: theme.colors.outdoorMarkerFill, // sandstone
  sport: theme.colors.routesMarkerFill, // teal-blue
  trad: '#5E8C61', // muted green
  other: '#9AA0A6', // grey
};

export default function RoutePinDonut({
  composition,
}: {
  composition: AreaComposition;
}) {
  const scale = useSharedValue(0.7);
  useEffect(() => {
    scale.value = withSpring(1, { damping: 13, stiffness: 190 });
  }, [scale]);
  const animStyle = useAnimatedStyle(() => ({
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
    <Animated.View style={[styles.wrap, animStyle]}>
      <Svg width={SIZE} height={SIZE}>
        {/* White base disc so the hole reads as a clean center for the count. */}
        <Circle cx={CX} cy={CX} r={R} fill="#FFFFFF" />
        {total > 0 && segments.length > 0 ? (
          segments.map(([key, v]) => {
            const len = (v / total) * CIRC;
            const el = (
              <Circle
                key={key}
                cx={CX}
                cy={CX}
                r={R}
                fill="none"
                stroke={BUCKET_COLORS[key]}
                strokeWidth={STROKE}
                strokeDasharray={[len, CIRC - len]}
                strokeDashoffset={-offset}
                rotation={-90}
                originX={CX}
                originY={CX}
              />
            );
            offset += len;
            return el;
          })
        ) : (
          <Circle
            cx={CX}
            cy={CX}
            r={R}
            fill="none"
            stroke={BUCKET_COLORS.other}
            strokeWidth={STROKE}
          />
        )}
      </Svg>
      <View style={styles.center} pointerEvents="none">
        <Text style={styles.count}>{total}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
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
    fontSize: 14,
    color: theme.colors.textPrimary,
  },
});
