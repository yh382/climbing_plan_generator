import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '@/lib/useThemeColors';
import { useFavoriteGyms } from '../../gyms/hooks';

interface GymTagSheetProps {
  visible: boolean;
  onClose: () => void;
  selectedGymId: string | null;
  onSelect: (gym: { id: string; name: string } | null) => void;
}

type GymListItem = {
  gym_id: string;
  name: string;
  isNoGym?: boolean;
};

const NO_GYM_ITEM: GymListItem = { gym_id: '__none__', name: 'No gym', isNoGym: true };

export default function GymTagSheet({ visible, onClose, selectedGymId, onSelect }: GymTagSheetProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { favorites: favoriteGyms, loading, refresh } = useFavoriteGyms();

  const sheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);

  const listData: GymListItem[] = useMemo(() => {
    if (favoriteGyms.length === 0) return [];
    const gyms = favoriteGyms.map((g) => ({ gym_id: g.gym_id, name: g.name }));
    return [NO_GYM_ITEM, ...gyms];
  }, [favoriteGyms]);

  // Present/dismiss based on visible prop
  useEffect(() => {
    if (visible && !isPresented.current) {
      sheetRef.current?.present();
      isPresented.current = true;
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  // Re-fetch favorites when sheet opens
  useEffect(() => {
    if (visible) {
      refresh();
    }
  }, [visible, refresh]);

  const handleDismiss = useCallback(() => {
    isPresented.current = false;
    onClose();
  }, [onClose]);

  const handleItemPress = useCallback((item: GymListItem) => {
    if (item.isNoGym) {
      onSelect(null);
    } else {
      onSelect({ id: item.gym_id, name: item.name });
    }
    sheetRef.current?.dismiss();
  }, [onSelect]);

  const renderRow = useCallback((item: GymListItem) => {
    const isSelected = item.isNoGym ? !selectedGymId : selectedGymId === item.gym_id;
    return (
      <TouchableOpacity
        key={item.gym_id}
        style={[styles.row, isSelected && styles.rowSelected]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrap, isSelected && styles.iconWrapSelected]}>
          <Ionicons
            name={item.isNoGym ? 'close-circle-outline' : 'business-outline'}
            size={18}
            color={isSelected ? '#FFF' : colors.textSecondary}
          />
        </View>
        <Text
          style={[styles.itemText, isSelected && styles.itemTextSelected]}
          numberOfLines={1}
        >
          {item.name}
        </Text>
        {isSelected && (
          <Ionicons name="checkmark" size={18} color="#306E6F" style={{ marginLeft: 'auto' }} />
        )}
      </TouchableOpacity>
    );
  }, [styles, colors, selectedGymId, handleItemPress]);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.4, 0.9]}
      backgroundColor={colors.sheetBackground}
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      dimmed
      dimmedDetentIndex={0}
      onDidDismiss={handleDismiss}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Select Gym</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : listData.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No favorite gyms yet</Text>
            <Text style={styles.hintText}>Favorite a gym to tag it here.</Text>
          </View>
        ) : (
          listData.map((item) => renderRow(item))
        )}
      </ScrollView>
    </TrueSheet>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.cardBorder,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 22,
    gap: 12,
  },
  rowSelected: {
    backgroundColor: colors.backgroundSecondary,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapSelected: {
    backgroundColor: '#1C1C1E',
  },
  itemText: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  itemTextSelected: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontFamily: theme.fonts.bold,
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
  },
  hintText: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: 6,
  },
});
