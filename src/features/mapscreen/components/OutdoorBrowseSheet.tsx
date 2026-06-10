// src/features/mapscreen/components/OutdoorBrowseSheet.tsx
// CA-FU Phase C.3 — primary browse surface for the post-CA map.
//
// Replaces RoutesListSheet's mode='area' + browsingCrag + focusedWall
// sub-states. Mounted as content inside MapScreenMapbox's primary TrueSheet
// (sibling pattern to RoutesListSheet — not its own sheet host).
//
// Renders by the (has_routes, has_subareas) matrix of the target area:
//   - crag (routes, no children) → AreaRoutesBrowser (FlatList, primary)
//   - has children               → children-first ScrollView (+ direct-route
//                                   preview when the intermediate also has
//                                   direct routes)
//   - empty                      → empty state
//
// Note: lives under mapscreen/components (next to RoutesListSheet, mounted by
// MapScreenMapbox) rather than the plan's outdoor/components, to keep the
// outdoor→mapscreen import direction one-way (it reuses mapscreen's
// outdoor-area-sheet/* subcomponents).

import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { EdgeInsets } from 'react-native-safe-area-context';

import { HeaderButton } from '../../../components/ui/HeaderButton';
import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import {
  useAreaChildren,
  useAreaDetail,
  useAreaRoutes,
} from '../../outdoor/hooks';
import type { OutdoorAreaListItem, OutdoorRoute } from '../../outdoor/types';
import { AreaChildrenList } from './outdoor-area-sheet/AreaChildrenList';
import { AreaRoutesPreview } from './outdoor-area-sheet/AreaRoutesPreview';
import { AreaRoutesBrowser } from './outdoor-area-sheet/AreaRoutesBrowser';
import { displayKindLabel, type ThemeColors } from './outdoor-area-sheet/shared';

export type OutdoorBrowseSheetProps = {
  /** null = no browse target (empty placeholder). */
  areaId: string | null;
  insets: EdgeInsets;
  onPressRoute: (route: OutdoorRoute) => void;
  onPressChildArea: (child: OutdoorAreaListItem) => void;
  /** Header hamburger → caller presents CragMenuSheet / Info (stacked). */
  onPressHamburger: () => void;
};

export function OutdoorBrowseSheet({
  areaId,
  insets,
  onPressRoute,
  onPressChildArea,
  onPressHamburger,
}: OutdoorBrowseSheetProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: detail, loading: detailLoading } = useAreaDetail(areaId);
  const { data: children, loading: childrenLoading } = useAreaChildren(areaId);
  const { data: routes, loading: routesLoading } = useAreaRoutes(areaId);

  // Header mirrors RoutesListSheet: native glass search button (left),
  // title (center), native glass hamburger (right). Search toggles the
  // in-list search box + discipline filter (AreaRoutesBrowser showControls).
  const isCrag = (detail?.has_routes ?? false) && !(detail?.has_subareas ?? false);
  const header = (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {isCrag ? (
          <HeaderButton
            icon="magnifyingglass"
            variant="glass"
            size={44}
            onPress={() => setSearchOpen((v) => !v)}
          />
        ) : null}
      </View>
      <View style={styles.headerText}>
        <Text style={styles.title} numberOfLines={1}>
          {detail?.name ?? tr('加载中…', 'Loading…')}
        </Text>
        {detail ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {displayKindLabel(detail.display_kind, tr)}
          </Text>
        ) : null}
      </View>
      <View style={styles.headerSide}>
        <HeaderButton
          icon="line.3.horizontal"
          variant="glass"
          size={44}
          onPress={onPressHamburger}
        />
      </View>
    </View>
  );

  if (!areaId) {
    return (
      <View style={[styles.fill, styles.centerFill]}>
        <Text style={styles.placeholder}>
          {tr('点击地图上的岩点查看路线', 'Tap a crag on the map to view routes')}
        </Text>
      </View>
    );
  }

  if (detailLoading && !detail) {
    return (
      <View style={styles.fill}>
        {header}
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </View>
    );
  }

  const hasSubareas = detail?.has_subareas ?? false;
  const hasRoutes = detail?.has_routes ?? false;

  // Crag (leaf-with-routes): routes are primary → FlatList browser.
  if (hasRoutes && !hasSubareas) {
    return (
      <View style={styles.fill}>
        <AreaRoutesBrowser
          routes={routes}
          loading={routesLoading}
          onRouteTap={onPressRoute}
          ListHeaderComponent={header}
          showControls={searchOpen}
        />
      </View>
    );
  }

  // Intermediate (has children): children-first scroll, with a direct-route
  // preview when the node also carries direct routes.
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      {header}
      {hasSubareas ? (
        <AreaChildrenList
          children={children}
          loading={childrenLoading}
          onChildTap={onPressChildArea}
          maxRows={500}
        />
      ) : null}
      {hasRoutes ? (
        <AreaRoutesPreview
          routes={routes}
          loading={routesLoading}
          onRouteTap={onPressRoute}
          maxRows={50}
        />
      ) : null}
      {!hasSubareas && !hasRoutes ? (
        <View style={styles.centerFill}>
          <Text style={styles.placeholder}>
            {tr('该区域暂无内容', 'Nothing here yet')}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

export default OutdoorBrowseSheet;

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  fill: { flex: 1 },
  centerFill: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  placeholder: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  headerSide: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0, alignItems: 'center' },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
});
