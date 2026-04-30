// src/features/mapscreen/components/MyListSheet.tsx
// Stacked sheet launched from AreaMenuSheet's "My List" entry. Thin shell
// around the existing ListsSection component (profile tab + /profile/lists
// page share the same source), so list UI stays consistent wherever it
// appears. inScrollView={true} avoids the nested-VirtualizedList warning.

import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import ListsSection from '../../outdoor/components/ListsSection';

export interface MyListSheetHandle {
  present: () => void;
  dismiss: () => void;
}

const MyListSheet = forwardRef<MyListSheetHandle>((_, ref) => {
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
      name="crag-mylist-sheet"
      detents={[1.0]}
      dimmed
      dismissible
      grabber
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
    >
      <View style={styles.header}>
        <Text style={styles.title}>{tr('我的清单', 'My List')}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <ListsSection showCreate inScrollView />
      </ScrollView>
    </TrueSheet>
  );
});

MyListSheet.displayName = 'MyListSheet';

export default MyListSheet;

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 16,
      paddingBottom: 8,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 20,
      color: c.textPrimary,
    },
    body: {
      paddingBottom: 32,
    },
  });
