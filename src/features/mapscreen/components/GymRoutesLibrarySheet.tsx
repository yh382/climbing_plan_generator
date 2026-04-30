// Stacked sheet that surfaces the full per-gym route catalog with all
// filter chips. Mirrors the outdoor RoutesLibrarySheet pattern: full
// detent + transparent background so iOS 26 glass shines through.

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '../../../lib/useThemeColors';
import { GymRoutesSegment } from '../../gymsCatalog/components/GymRoutesSegment';
import type { WallSection } from '../../gymsCatalog/types';

export interface GymRoutesLibrarySheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  gymId: string;
  wallSections: WallSection[];
  onSelectRoute?: (routeId: string) => void;
}

const GymRoutesLibrarySheet = forwardRef<GymRoutesLibrarySheetHandle, Props>(
  ({ gymId, wallSections, onSelectRoute }, ref) => {
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
        name="gym-routes-library-sheet"
        detents={[0.9]}
        dimmed
        dismissible
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        backgroundColor={colors.background}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{tr('路线库', 'Routes Library')}</Text>
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <GymRoutesSegment
            gymId={gymId}
            wallSections={wallSections}
            onSelectRoute={onSelectRoute}
          />
        </ScrollView>
      </TrueSheet>
    );
  },
);

GymRoutesLibrarySheet.displayName = 'GymRoutesLibrarySheet';
export default GymRoutesLibrarySheet;

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 22,
      color: c.textPrimary,
    },
    content: {
      paddingBottom: 32,
    },
  });
