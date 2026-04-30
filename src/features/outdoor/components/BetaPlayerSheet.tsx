// src/features/outdoor/components/BetaPlayerSheet.tsx
// Near-fullscreen TrueSheet for playing a single beta video. Opens from a
// BetaCard tap; closes via the X button or swipe-down. The VideoPlayer is
// torn down when the sheet dismisses so audio doesn't leak.

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { VideoView, useVideoPlayer } from 'expo-video';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import type { BetaOut } from '../betaApi';

export interface BetaPlayerSheetHandle {
  present: (beta: BetaOut) => void;
  dismiss: () => void;
}

const BetaPlayerSheet = forwardRef<BetaPlayerSheetHandle, object>((_props, ref) => {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const sheetRef = useRef<TrueSheet>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [beta, setBeta] = useState<BetaOut | null>(null);

  useImperativeHandle(ref, () => ({
    present: (b: BetaOut) => {
      setBeta(b);
      sheetRef.current?.present().catch(() => {});
    },
    dismiss: () => {
      sheetRef.current?.dismiss().catch(() => {});
    },
  }));

  const handleDismiss = useCallback(() => {
    // Clear the beta so the player unmounts and stops audio.
    setBeta(null);
  }, []);

  return (
    <TrueSheet
      ref={sheetRef}
      name="beta-player-sheet"
      detents={[1]}
      dimmed
      dismissible
      grabber
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      backgroundColor={'#000'}
      onDidDismiss={handleDismiss}
    >
      <View style={styles.container}>
        {beta ? <PlayerBody beta={beta} styles={styles} tr={tr} /> : null}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => sheetRef.current?.dismiss().catch(() => {})}
          hitSlop={12}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </TrueSheet>
  );
});

BetaPlayerSheet.displayName = 'BetaPlayerSheet';
export default BetaPlayerSheet;

// ── Player body ────────────────────────────────────────────────────

function PlayerBody({
  beta,
  styles,
  tr,
}: {
  beta: BetaOut;
  styles: ReturnType<typeof createStyles>;
  tr: (zh: string, en: string) => string;
}) {
  const player = useVideoPlayer({ uri: beta.media_url }, (p) => {
    p.loop = true;
    p.play();
  });

  return (
    <>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
      />
      <View style={styles.metaOverlay} pointerEvents="box-none">
        <Text style={styles.routeName} numberOfLines={1}>
          {beta.route.name}
          <Text style={styles.grade}>  {beta.route.grade_text}</Text>
        </Text>
        <Text style={styles.author} numberOfLines={1}>
          @{beta.author.username ?? tr('用户', 'climber')}
        </Text>
        {beta.description ? (
          <Text style={styles.description} numberOfLines={3}>
            {beta.description}
          </Text>
        ) : null}
      </View>
    </>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const createStyles = (_c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#000',
    },
    video: {
      flex: 1,
      width: '100%',
      backgroundColor: '#000',
    },
    closeBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: 'rgba(0,0,0,0.45)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    metaOverlay: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 32,
      padding: 12,
      backgroundColor: 'rgba(0,0,0,0.45)',
      borderRadius: 12,
    },
    routeName: {
      fontFamily: theme.fonts.bold,
      fontSize: 17,
      color: '#fff',
    },
    grade: {
      fontFamily: theme.fonts.medium,
      fontSize: 14,
      color: '#fff',
    },
    author: {
      marginTop: 2,
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: 'rgba(255,255,255,0.85)',
    },
    description: {
      marginTop: 6,
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      lineHeight: 18,
      color: 'rgba(255,255,255,0.9)',
    },
  });
