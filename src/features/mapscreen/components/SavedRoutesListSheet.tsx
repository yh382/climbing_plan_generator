// src/features/mapscreen/components/SavedRoutesListSheet.tsx
// CA-FU Phase D — the list-only sheet body, extracted from RoutesListSheet
// (whose area-mode half + WallGroup were retired by OutdoorBrowseSheet).
//
// Renders a user's saved outdoor route list (OutdoorList) on the map: the
// map fits to the list's route pins; this sheet shows each route as a
// RouteListCard. Mounted as the primary TrueSheet content in list mode.

import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { TopFadeMaskView } from '../../../components/shared/TopFadeMaskView';
import { getMapSheetBottomInset } from '../../../lib/sheetInsets';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '../../../lib/useThemeColors';
import type { OutdoorListDetail } from '../../outdoor/types';
import RouteListCard from '../../outdoor/components/RouteListCard';

type TR = (zh: string, en: string) => string;

export type SavedRoutesListSheetProps = {
  /** The opened list's hydrated detail (name + items). Null while loading. */
  listDetail: OutdoorListDetail | null;
  scrollRef: React.RefObject<ScrollView | null>;
  /** Per-item y offsets, mutated via onLayout so the caller can scroll-to. */
  itemOffsets: React.MutableRefObject<Record<string, number>>;
  insets: EdgeInsets;
  tr: TR;
  loading: boolean;
  /** Currently focused item id → background highlight on that row. */
  focusedItemId?: string | null;
  onPressRoute: (routeId: string) => void;
};

export default function SavedRoutesListSheet({
  listDetail,
  scrollRef,
  itemOffsets,
  insets,
  tr,
  loading,
  focusedItemId,
  onPressRoute,
}: SavedRoutesListSheetProps) {
  const colors = useThemeColors();
  const s = createStyles(colors);

  return (
    <TopFadeMaskView topFadeRatio={0.15}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          s.sheetBody,
          { paddingTop: 4, paddingBottom: getMapSheetBottomInset(insets) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {listDetail ? (
          <View style={s.titleRow}>
            <Text style={s.sheetTitleText} numberOfLines={1}>
              {`${listDetail.item_count} ${tr(
                '条路线',
                listDetail.item_count === 1 ? 'route' : 'routes',
              )}`}
            </Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.accent}
            style={{ marginTop: 40 }}
          />
        ) : listDetail && listDetail.items.length > 0 ? (
          listDetail.items.map((it) => {
            if (!it.route) return null;
            const routeId = it.route.id;
            const highlighted = focusedItemId === it.id;
            return (
              <View
                key={it.id}
                onLayout={(e) => {
                  itemOffsets.current[it.id] = e.nativeEvent.layout.y;
                }}
                style={
                  highlighted
                    ? { borderRadius: 14, backgroundColor: colors.backgroundSecondary }
                    : undefined
                }
              >
                <RouteListCard
                  route={{ ...it.route, crag_name: it.crag_name, wall_name: it.wall_name }}
                  onPress={() => onPressRoute(routeId)}
                />
              </View>
            );
          })
        ) : (
          <Text style={s.emptyText}>
            {tr('清单暂无路线', 'No routes in this list yet')}
          </Text>
        )}
      </ScrollView>
    </TopFadeMaskView>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    sheetBody: { paddingHorizontal: 8, paddingTop: 4 },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 8,
    },
    sheetTitleText: {
      flex: 1,
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: c.textPrimary,
    },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textTertiary,
      textAlign: 'center',
      marginTop: 40,
    },
  });
