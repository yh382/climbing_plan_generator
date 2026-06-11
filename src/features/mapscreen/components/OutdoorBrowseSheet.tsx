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

import { useMemo } from 'react';
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
import type { DisplayKind, OutdoorAreaListItem, OutdoorRoute } from '../../outdoor/types';
import { AreaChildrenList } from './outdoor-area-sheet/AreaChildrenList';
import { AreaRoutesPreview } from './outdoor-area-sheet/AreaRoutesPreview';
import { AreaRoutesBrowser } from './outdoor-area-sheet/AreaRoutesBrowser';
import { displayKindLabel, type ThemeColors } from './outdoor-area-sheet/shared';

export type OutdoorBrowseSheetProps = {
  /** null = no browse target (empty placeholder). */
  areaId: string | null;
  /** CB 点6 — camera-tracked viewport region label. Overrides the area
   *  name + display_kind as the sheet title when present. */
  title?: string;
  titleKind?: DisplayKind;
  insets: EdgeInsets;
  onPressRoute: (route: OutdoorRoute) => void;
  onPressChildArea: (child: OutdoorAreaListItem) => void;
  /** Header hamburger → caller presents CragMenuSheet / Info (stacked). */
  onPressHamburger: () => void;
};

export function OutdoorBrowseSheet({
  areaId,
  title,
  titleKind,
  insets,
  onPressRoute,
  onPressChildArea,
  onPressHamburger,
}: OutdoorBrowseSheetProps) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { data: detail, loading: detailLoading } = useAreaDetail(areaId);
  const { data: children, loading: childrenLoading } = useAreaChildren(areaId);
  const { data: routes, loading: routesLoading } = useAreaRoutes(areaId);

  // CB 点6 — when the camera-tracked region label is present, the subtitle
  // shows ITS kind (e.g. "Area"), not the tapped crag's kind.
  const headerKind = title ? titleKind : detail?.display_kind;

  // CB 点7 — title left-aligned (gives the dynamic 点6 region label room to
  // breathe), search demoted into BrowseFilterBar, so the header is just
  // title + hamburger. (点6 will later swap detail.name → the viewport
  // region label from /outdoor/region-label.)
  const header = (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.title} numberOfLines={1}>
          {title ?? detail?.name ?? tr('加载中…', 'Loading…')}
        </Text>
        {headerKind ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {displayKindLabel(headerKind, tr)}
          </Text>
        ) : null}
      </View>
      <HeaderButton
        icon="line.3.horizontal"
        variant="glass"
        size={44}
        onPress={onPressHamburger}
      />
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

  // Crag (leaf-with-routes): routes are primary. Title header is PINNED above
  // the browser, which pins its own filter bar above the scrolling FlatList.
  if (hasRoutes && !hasSubareas) {
    return (
      <View style={styles.fill}>
        {header}
        <AreaRoutesBrowser
          key={areaId}
          routes={routes}
          loading={routesLoading}
          onRouteTap={onPressRoute}
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
  headerText: { flex: 1, minWidth: 0, alignItems: 'flex-start' },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'left',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textSecondary,
    marginTop: 1,
  },
});
