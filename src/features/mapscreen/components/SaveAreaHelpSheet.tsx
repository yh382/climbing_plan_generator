// src/features/mapscreen/components/SaveAreaHelpSheet.tsx
// Lightweight onboarding sheet shown when a user taps the "+" placeholder
// in the empty saved-areas strip. Explains how to save an area (tap the
// orange outdoor pin → AreaInfoSheet → heart button) with a small mock of
// the relevant UI fragment so users can recognize the target.

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Ionicons } from '@expo/vector-icons';

import { useSettings } from '../../../contexts/SettingsContext';
import { useThemeColors } from '../../../lib/useThemeColors';
import { theme } from '../../../lib/theme';

export interface SaveAreaHelpSheetHandle {
  present: () => void;
  dismiss: () => void;
}

const SaveAreaHelpSheet = forwardRef<SaveAreaHelpSheetHandle, {}>(
  (_props, ref) => {
    const colors = useThemeColors();
    const { tr } = useSettings();
    const sheetRef = useRef<TrueSheet>(null);
    const styles = useMemo(() => createStyles(colors), [colors]);

    useImperativeHandle(ref, () => ({
      present: () => {
        sheetRef.current?.present().catch(() => {});
      },
      dismiss: () => {
        sheetRef.current?.dismiss().catch(() => {});
      },
    }));

    return (
      <TrueSheet
        ref={sheetRef}
        name="save-area-help-sheet"
        detents={[0.45]}
        dimmed
        dismissible
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      >
        <View style={styles.container}>
          {/* Mini area-info-sheet mock illustration */}
          <View style={styles.mockSheet}>
            <View style={styles.mockHero} />
            <View style={styles.mockIdentity}>
              <View style={[styles.mockBar, { width: '60%' }]} />
              <View style={[styles.mockBar, { width: '35%', height: 6, marginTop: 6 }]} />
            </View>
            <View style={styles.mockStatsRow}>
              <View style={styles.mockStat} />
              <View style={styles.mockStat} />
              <View style={styles.mockStat} />
            </View>
            {/* Bottom toolbar with three buttons; heart is highlighted */}
            <View style={styles.mockToolbar}>
              <View style={styles.mockToolbarBtn}>
                <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
              </View>
              <View style={styles.mockToolbarBtn}>
                <Ionicons name="share-outline" size={16} color={colors.textSecondary} />
              </View>
              <View style={[styles.mockToolbarBtn, styles.mockToolbarBtnHighlight]}>
                <Ionicons name="heart" size={18} color="#FF3B30" />
              </View>
            </View>
            <View style={styles.arrow}>
              <Ionicons name="arrow-down" size={20} color={colors.accent} />
            </View>
          </View>

          <Text style={styles.title}>
            {tr('收藏你常去的攀岩区', 'Save Your Climbing Areas')}
          </Text>
          <Text style={styles.body}>
            {tr(
              '点击地图上的橙色攀岩区图钉打开介绍页，按下右下角的♡按钮即可加入收藏。收藏的区域会出现在这里方便快速跳转。',
              'Tap an orange area pin on the map to open its info sheet, then tap the ♡ at the bottom-right to save it. Saved areas appear here for quick access.',
            )}
          </Text>
        </View>
      </TrueSheet>
    );
  },
);

SaveAreaHelpSheet.displayName = 'SaveAreaHelpSheet';

export default SaveAreaHelpSheet;

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 32,
      alignItems: 'center',
    },
    mockSheet: {
      width: 200,
      borderRadius: 18,
      backgroundColor: c.sheetBackground,
      borderWidth: 1,
      borderColor: c.border,
      paddingTop: 8,
      paddingBottom: 12,
      paddingHorizontal: 12,
      marginBottom: 18,
      position: 'relative',
    },
    mockHero: {
      height: 56,
      borderRadius: 10,
      backgroundColor: c.backgroundSecondary,
      marginBottom: 10,
    },
    mockIdentity: {
      marginBottom: 8,
    },
    mockBar: {
      height: 8,
      borderRadius: 4,
      backgroundColor: c.backgroundSecondary,
    },
    mockStatsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    mockStat: {
      width: 40,
      height: 16,
      borderRadius: 4,
      backgroundColor: c.backgroundSecondary,
    },
    mockToolbar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
    },
    mockToolbarBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: c.backgroundSecondary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mockToolbarBtnHighlight: {
      backgroundColor: '#FFD9D6',
      shadowColor: '#FF3B30',
      shadowOpacity: 0.4,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 0 },
    },
    arrow: {
      position: 'absolute',
      bottom: -14,
      right: 18,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: c.textPrimary,
      textAlign: 'center',
      marginBottom: 10,
      letterSpacing: -0.2,
    },
    body: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      lineHeight: 20,
      color: c.textSecondary,
      textAlign: 'center',
    },
  });
