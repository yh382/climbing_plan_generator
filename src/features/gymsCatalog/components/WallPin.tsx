import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { theme } from '../../../lib/theme';
import { useThemeColors } from '../../../lib/useThemeColors';
import type { WallSection } from '../types';

interface Props {
  section: WallSection;
  selected: boolean;
  onPress: () => void;
  /** Container size — pins live as a sibling layer to the transformed
   *  image so the gesture transforms apply to position only, not size.
   *  We compute on-screen position from these values + the gesture
   *  shared values. */
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

const PIN_SIZE = 44;

export function WallPin({
  section,
  selected,
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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, selected), [colors, selected]);

  const pinX = rectX + section.floor_plan_x * rectW;
  const pinY = rectY + section.floor_plan_y * rectH;

  const animatedStyle = useAnimatedStyle(() => {
    'worklet';
    // Apply parent transform around container center (RN scale origin
    // defaults to the View's center). screenX/Y is the pin's pixel
    // position after the transform; we then offset by half pin size
    // so the bubble centers on it.
    const cx = containerW / 2;
    const cy = containerH / 2;
    const dx = pinX - cx;
    const dy = pinY - cy;
    const screenX = cx + dx * scale.value + translateX.value;
    const screenY = cy + dy * scale.value + translateY.value;
    return {
      transform: [
        { translateX: screenX - PIN_SIZE / 2 },
        { translateY: screenY - PIN_SIZE / 2 },
      ],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable onPress={onPress} hitSlop={12} style={styles.center}>
        <View style={styles.bubble}>
          <Text style={styles.count}>{section.route_count}</Text>
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {section.name}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const createStyles = (
  c: ReturnType<typeof useThemeColors>,
  selected: boolean,
) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      left: 0,
      top: 0,
    },
    center: { alignItems: 'center' },
    bubble: {
      width: PIN_SIZE,
      height: PIN_SIZE,
      borderRadius: PIN_SIZE / 2,
      // Theme-aware inversion: unselected = bg color (white/black per
      // mode), selected = text color (the inverse). Fixed-color hex
      // strings here would invert wrongly in dark mode (white pin
      // with white text → invisible).
      backgroundColor: selected ? c.textPrimary : c.background,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.18,
      shadowRadius: 3,
      elevation: 3,
    },
    count: {
      fontFamily: theme.fonts.bold,
      fontSize: 14,
      color: selected ? c.background : c.textPrimary,
    },
    label: {
      maxWidth: 96,
      fontFamily: theme.fonts.medium,
      fontSize: 11,
      color: c.textPrimary,
      marginTop: 4,
      // Halo around the label for legibility against varied floor
      // plan colors. Use the inverse of textPrimary so the halo
      // separates light text on light floor plan, dark text on dark
      // floor plan, etc.
      textShadowColor: c.background,
      textShadowRadius: 2,
    },
  });
