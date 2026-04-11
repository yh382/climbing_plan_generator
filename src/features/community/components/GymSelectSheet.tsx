import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '@/lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import type { GymSummary } from '../../gyms/api';

interface GymSelectSheetProps {
  sheetRef: React.RefObject<TrueSheet>;
  gyms: GymSummary[];
  selectedGymId: string | null;
  onSelect: (gymId: string) => void;
}

export default function GymSelectSheet({ sheetRef, gyms, selectedGymId, onSelect }: GymSelectSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const handleSelect = (gymId: string) => {
    onSelect(gymId);
    sheetRef.current?.dismiss();
  };

  return (
    <TrueSheet
      ref={sheetRef}
      detents={['auto']}
      dimmed
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      backgroundColor={colors.sheetBackground}
    >
      <SafeAreaView edges={['bottom']}>
        <Text style={styles.title}>Your Gyms</Text>
        {gyms.map((g) => {
          const selected = g.gym_id === selectedGymId;
          return (
            <TouchableOpacity
              key={g.gym_id}
              style={[styles.row, selected && styles.rowSelected]}
              onPress={() => handleSelect(g.gym_id)}
              activeOpacity={0.6}
            >
              <Text style={styles.gymName} numberOfLines={1}>{g.name}</Text>
              {selected && (
                <Ionicons name="checkmark" size={20} color={colors.accent} />
              )}
            </TouchableOpacity>
          );
        })}
      </SafeAreaView>
    </TrueSheet>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  title: {
    fontSize: 17,
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  row: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  rowSelected: {
    backgroundColor: colors.backgroundSecondary,
  },
  gymName: {
    flex: 1,
    fontSize: 15,
    fontFamily: theme.fonts.regular,
    color: colors.textPrimary,
    marginRight: 12,
  },
});
