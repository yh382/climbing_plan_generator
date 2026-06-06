// src/components/MiniWorkoutPlayer.tsx
//
// Floating "active workout" pill — appears bottom-right while a session
// is in progress and minimized. Tapping it re-opens the PlanView so the
// user can resume their timer.
//
// TR4: dark-mode pass + title from store.
// - Read `sessionTitle` from useActiveWorkoutStore so template flows
//   show the template name (was hardcoded "Active Workout").
// - Moved StyleSheet behind `createStyles(colors)` so dark theme stops
//   forcing a white pill on a dark background.

import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useActiveWorkoutStore from '../store/useActiveWorkoutStore';
import { theme } from '../lib/theme';
import { useThemeColors } from '../lib/useThemeColors';

export default function MiniWorkoutPlayer() {
  const router = useRouter();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { isActive, isMinimized, isPaused, seconds, sessionTitle, tick, maximizeWorkout } = useActiveWorkoutStore();

  // Heartbeat while the mini-player owns the timer (avoids dueling
  // intervals with PlanView, which only renders when not minimized).
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isActive && isMinimized && !isPaused) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, isMinimized, isPaused, tick]);

  if (!isActive || !isMinimized) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handlePress = () => {
    maximizeWorkout();
    router.push('/library/plan-view');
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.9}>
      <View style={styles.iconBox}>
        <Ionicons name="barbell" size={20} color="#FFF" />
      </View>
      <View style={styles.content}>
        <Text style={styles.label} numberOfLines={1}>
          {sessionTitle || 'Active Workout'}
        </Text>
        <Text style={styles.timer}>{formatTime(seconds)}</Text>
      </View>
      <View style={styles.arrow}>
        <Ionicons name="chevron-up" size={20} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 30,
      padding: 8,
      paddingRight: 16,
    },
    iconBox: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.cardDark,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
    },
    content: {
      marginRight: 10,
      maxWidth: 160, // keeps long template titles from pushing chevron off
    },
    label: {
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: theme.fonts.medium,
      fontWeight: '600',
    },
    timer: {
      fontSize: 16,
      color: colors.textPrimary,
      fontWeight: '800',
      fontVariant: ['tabular-nums'],
    },
    arrow: { opacity: 0.7 },
  });
