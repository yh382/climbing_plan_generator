// src/features/mapscreen/components/RoutesLibrarySheet.tsx
// Stacked sheet launched from AreaMenuSheet's "Routes Library" menu row.
// Mounts the existing RoutesSegment (SectionList-backed, with search +
// grade filter) directly — no new UI, just relocates it from crag-community
// into the hamburger-driven menu surface.

import { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { TopFadeMaskView } from '../../../components/shared/TopFadeMaskView';
import RoutesSegment from '../../outdoor/components/RoutesSegment';

export interface RoutesLibrarySheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface RoutesLibrarySheetProps {
  areaId: string;
}

const RoutesLibrarySheet = forwardRef<RoutesLibrarySheetHandle, RoutesLibrarySheetProps>(
  (props, ref) => {
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
        name="routes-library-sheet"
        detents={[0.9]}
        dimmed
        dismissible
        scrollable
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        backgroundColor={colors.background}
      >
        <TopFadeMaskView topFadeRatio={0.15}>
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <RoutesSegment areaId={props.areaId} />
          </ScrollView>
        </TopFadeMaskView>

        <View style={styles.titleOverlay} pointerEvents="none">
          <Text style={styles.title}>{tr('路线库', 'Routes Library')}</Text>
        </View>
      </TrueSheet>
    );
  },
);

RoutesLibrarySheet.displayName = 'RoutesLibrarySheet';
export default RoutesLibrarySheet;

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    content: {
      paddingTop: 56,
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 32,
    },
    titleOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 22,
      color: c.textPrimary,
    },
  });
