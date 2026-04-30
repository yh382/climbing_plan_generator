// Indoor route list (Window AR). Shared between the GymMapScreen
// peek-sheet (filtered to a wall section) and GymRoutesLibrarySheet
// (whole gym, all filters). Mirrors outdoor's RoutesSegment shape.

import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import FilterChip from '../../../components/ui/FilterChip';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { useThemeColors } from '../../../lib/useThemeColors';
import RouteListCard from '../../outdoor/components/RouteListCard';
import type { OutdoorRoute } from '../../outdoor/types';
import { useRoutesInGym } from '../hooks';
import type { GymRoute, WallSection } from '../types';

const NEW_ROUTE_DAYS = 14;
const CLASSIC_MIN_STARS = 4.0;
const CLASSIC_MIN_SENDS = 10;

interface Props {
  gymId: string;
  wallSections: WallSection[];
  /** When set, hides filter chips and pre-filters to the section. The
   *  GymMapScreen peek-sheet uses this so tapping a wall pin scopes
   *  the list. */
  pinSectionId?: string | null;
  onSelectRoute?: (routeId: string) => void;
  /** Hide the wall-section header rows (used when the parent already
   *  shows the section context elsewhere). */
  hideSectionHeaders?: boolean;
}

type ToggleState = {
  newOnly: boolean;
  classicsOnly: boolean;
  colors: Set<string>;
  setters: Set<string>;
};

const initialToggle: ToggleState = {
  newOnly: false,
  classicsOnly: false,
  colors: new Set(),
  setters: new Set(),
};

function isNew(r: GymRoute): boolean {
  if (!r.set_date) return false;
  const set = new Date(r.set_date);
  const now = new Date();
  const diffDays = (now.getTime() - set.getTime()) / 86_400_000;
  return diffDays >= 0 && diffDays < NEW_ROUTE_DAYS;
}

function isClassic(r: GymRoute): boolean {
  return (
    (r.stars ?? 0) >= CLASSIC_MIN_STARS &&
    r.send_count >= CLASSIC_MIN_SENDS
  );
}

/** Adapt our GymRoute shape to the OutdoorRoute fields RouteListCard
 *  reads. We don't fill the fields it ignores (e.g. submitted_by) — a
 *  cast-through-unknown is safe because RouteListCard only touches
 *  the fields named here.
 */
function adaptToCardShape(r: GymRoute, wallName: string): OutdoorRoute {
  const fallbackName = `${r.color ?? ''} ${r.grade_text}`.trim();
  return {
    id: r.id,
    name: r.name ?? fallbackName,
    name_en: undefined,
    grade_text: r.grade_text,
    grade_system: r.grade_system,
    grade_score: r.grade_score ?? undefined,
    style: r.style,
    photos: (r.photos ?? undefined) as OutdoorRoute['photos'],
    stars: r.stars ?? undefined,
    rating_count: r.rating_count,
    send_count: r.send_count,
    status: r.status,
    sector_name: undefined,
    wall_name: wallName,
    pitches: 1,
  } as unknown as OutdoorRoute;
}

export function GymRoutesSegment({
  gymId,
  wallSections,
  pinSectionId,
  onSelectRoute,
  hideSectionHeaders,
}: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { routes, loading } = useRoutesInGym(gymId, { status: 'active' });
  const [toggle, setToggle] = useState<ToggleState>(initialToggle);

  // Distinct colors / setters from currently visible (active) routes.
  const distinctColors = useMemo(() => {
    const s = new Set<string>();
    routes.forEach((r) => r.color && s.add(r.color));
    return [...s].sort();
  }, [routes]);

  const distinctSetters = useMemo(() => {
    const s = new Set<string>();
    routes.forEach((r) => r.setter_name && s.add(r.setter_name));
    return [...s].sort();
  }, [routes]);

  const filtered = useMemo(() => {
    return routes.filter((r) => {
      if (pinSectionId && r.wall_section_id !== pinSectionId) return false;
      if (toggle.newOnly && !isNew(r)) return false;
      if (toggle.classicsOnly && !isClassic(r)) return false;
      if (toggle.colors.size > 0 && (!r.color || !toggle.colors.has(r.color)))
        return false;
      if (
        toggle.setters.size > 0 &&
        (!r.setter_name || !toggle.setters.has(r.setter_name))
      )
        return false;
      return true;
    });
  }, [routes, toggle, pinSectionId]);

  // Group by wall section for sticky headers.
  const sections = useMemo(() => {
    const order = wallSections.map((w) => w.id);
    const byId: Record<string, GymRoute[]> = {};
    filtered.forEach((r) => {
      (byId[r.wall_section_id] ??= []).push(r);
    });
    // Sort each group by grade_score asc so the strongest crusher's eye
    // lands on the easy stuff first; matches KAYA convention.
    Object.values(byId).forEach((arr) =>
      arr.sort(
        (a, b) => (a.grade_score ?? 0) - (b.grade_score ?? 0),
      ),
    );
    return order
      .map((id) => {
        const wall = wallSections.find((w) => w.id === id);
        return {
          title: wall?.name ?? '',
          data: byId[id] ?? [],
        };
      })
      .filter((s) => s.data.length > 0);
  }, [filtered, wallSections]);

  const showFilters = !pinSectionId;

  function toggleSetMember<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  // Note: this component runs `scrollEnabled={false}` on the inner
  // SectionList (mirrors outdoor's RoutesSegment). Mount it inside an
  // outer ScrollView so the list has a scroll driver + measurable
  // height — otherwise the SectionList collapses to 0px inside any
  // non-flex parent (e.g. a TrueSheet body) and silently renders zero
  // rows.
  return (
    <View>
      {showFilters ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          <FilterChip
            label={tr('NEW', 'NEW')}
            onPress={() =>
              setToggle((t) => ({ ...t, newOnly: !t.newOnly }))
            }
            active={toggle.newOnly}
          />
          <FilterChip
            label={tr('CLASSICS', 'CLASSICS')}
            onPress={() =>
              setToggle((t) => ({
                ...t,
                classicsOnly: !t.classicsOnly,
              }))
            }
            active={toggle.classicsOnly}
          />
          {distinctColors.map((c) => (
            <FilterChip
              key={`color-${c}`}
              label={c}
              onPress={() =>
                setToggle((t) => ({
                  ...t,
                  colors: toggleSetMember(t.colors, c),
                }))
              }
              active={toggle.colors.has(c)}
            />
          ))}
          {distinctSetters.map((s) => (
            <FilterChip
              key={`setter-${s}`}
              label={s}
              onPress={() =>
                setToggle((t) => ({
                  ...t,
                  setters: toggleSetMember(t.setters, s),
                }))
              }
              active={toggle.setters.has(s)}
            />
          ))}
        </ScrollView>
      ) : null}

      {loading && routes.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>
            {tr('暂无符合条件的路线', 'No routes match the filters.')}
          </Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.id}
          // Outer ScrollView (TrueSheet body) drives scrolling — keep
          // the inner list non-scrollable so we don't get the nested
          // VirtualizedList warning and the rows actually render at
          // their natural heights.
          scrollEnabled={false}
          stickySectionHeadersEnabled={!hideSectionHeaders}
          renderSectionHeader={({ section }) =>
            hideSectionHeaders ? null : (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>
                  {section.data.length}
                </Text>
              </View>
            )
          }
          renderItem={({ item, section }) => (
            <RouteListCard
              route={adaptToCardShape(item, section.title)}
              onPress={() => onSelectRoute?.(item.id)}
              hideLocation={!!pinSectionId}
            />
          )}
          contentContainerStyle={styles.listBody}
        />
      )}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    filterScroll: {
      maxHeight: 48,
    },
    filterRow: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: c.background,
    },
    sectionTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 14,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    sectionCount: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textTertiary,
    },
    listBody: {
      paddingBottom: 24,
    },
    loadingWrap: {
      paddingVertical: 32,
      alignItems: 'center',
    },
    emptyWrap: {
      paddingVertical: 40,
      alignItems: 'center',
    },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
    },
  });
