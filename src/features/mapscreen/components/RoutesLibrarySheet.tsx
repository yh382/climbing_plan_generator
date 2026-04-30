// src/features/mapscreen/components/RoutesLibrarySheet.tsx
// Stacked sheet launched from AreaMenuSheet's "Routes Library" menu row.
// Mounts the existing RoutesSegment (SectionList-backed, with search +
// grade filter) directly — no new UI, just relocates it from crag-community
// into the hamburger-driven menu surface.
//
// Note: RoutesSegment's internal SectionList runs with scrollEnabled=false
// — it was designed to be mounted inside an outer ScrollView (crag-community
// did exactly this). We mirror that: wrap in ScrollView so the list has a
// scroll driver + measurable height. scrollEnabled=false on the inner list
// suppresses the nested-VirtualizedList warning.

import { forwardRef, useImperativeHandle, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
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
          <RoutesSegment areaId={props.areaId} />
        </ScrollView>
      </TrueSheet>
    );
  },
);

RoutesLibrarySheet.displayName = 'RoutesLibrarySheet';
export default RoutesLibrarySheet;

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
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 32,
    },
  });
