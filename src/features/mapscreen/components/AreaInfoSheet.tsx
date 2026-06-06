/**
 * AreaInfoSheet — Area (L4) detail sheet. NEW file in BR Track D Day 4.
 *
 * The PREVIOUS file at this path (Track A naming drift — actually
 * rendered Region) was renamed to `RegionInfoSheet.tsx` in Day 4.
 * This is a fresh component for the L4 Area level (e.g. "Central
 * Wasatch") per PLAN_OUTDOOR_MAP_UX_V2 §4.2.
 *
 * Key design choices:
 *  - Caller passes a hydrated `Area` via props instead of fetching by
 *    id — Track C didn't ship a `GET /outdoor/areas/{id}` detail
 *    endpoint and Area data is always available in the parent context
 *    (RegionInfoSheet child list, or CragInfoSheet's parent reference).
 *  - Fetches only the child Crag list via `outdoorApi.getCrags(areaId)`.
 *  - **No native community** per PLAN §4.2 — Area is a weak entity;
 *    community lives at Crag level. We surface a "Crag communities"
 *    link group instead.
 *  - Polymorphic save (D-4) — `savedSpotsApi.save/unsave('area', id)`.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';

import { useSettings } from '../../../contexts/SettingsContext';
import { useThemeColors } from '../../../lib/useThemeColors';
import { theme } from '../../../lib/theme';
import { TopFadeMaskView } from '../../../components/shared/TopFadeMaskView';
import { outdoorApi } from '../../outdoor/api';
import { savedSpotsApi } from '../../outdoor/savedSpotsApi';
import type { Area, Crag } from '../../outdoor/types';
import {
  PlaceSheetActions,
  PlaceSheetFooter,
  PlaceSheetHero,
  PlaceSheetIdentity,
  PlaceSheetStats,
  type PlaceSheetAction,
  type PlaceSheetFooterAction,
} from '../../../components/shared/placeSheet';

export type AreaInfoContext = 'fromRegion' | 'fromCragMenu' | 'pinTap';

export interface AreaInfoSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface AreaInfoSheetProps {
  /** Caller passes the hydrated Area record — no BE detail endpoint for L4. */
  area: Area | null;
  /** Display string for the parent Region — surfaced as subtitle. */
  regionName?: string | null;
  context: AreaInfoContext;
  /** Drilling into a child Crag from the list — Day 5 wires this to
   *  the CragInfoSheet stack. */
  onPressCrag?: (crag: Crag) => void;
  onDismiss?: () => void;
  onPresented?: () => void;
}

const AreaInfoSheet = forwardRef<AreaInfoSheetHandle, AreaInfoSheetProps>(
  (props, ref) => {
    const colors = useThemeColors();
    const { tr } = useSettings();
    const sheetRef = useRef<TrueSheet>(null);
    const scrollRef = useRef<ScrollView>(null);
    const styles = useMemo(() => createStyles(colors), [colors]);

    const [crags, setCrags] = useState<Crag[]>([]);
    const [loading, setLoading] = useState(false);

    const [isSaved, setIsSaved] = useState(false);
    const [savedHydrated, setSavedHydrated] = useState(false);

    const loadedAreaIdRef = useRef<string | null>(null);

    const loadCrags = useCallback(async (areaId: string) => {
      if (loadedAreaIdRef.current === areaId) return;
      setLoading(true);
      try {
        const list = await outdoorApi.getCrags(areaId);
        setCrags(list);
        loadedAreaIdRef.current = areaId;
      } catch {
        // Keep prior crags; surface no error toast for now.
      } finally {
        setLoading(false);
      }
    }, []);

    const refreshSavedState = useCallback(async (areaId: string) => {
      try {
        const list = await savedSpotsApi.list();
        const saved = list.items.some(
          (it) => it.target_type === 'area' && it.target_id === areaId,
        );
        setIsSaved(saved);
      } catch {
        // Anonymous viewers see 401; treat as not-saved.
      } finally {
        setSavedHydrated(true);
      }
    }, []);

    useImperativeHandle(ref, () => ({
      present: () => {
        sheetRef.current?.present().catch(() => {});
      },
      dismiss: () => {
        sheetRef.current?.dismiss().catch(() => {});
      },
    }));

    useEffect(() => {
      const id = props.area?.id;
      if (!id) return;
      if (loadedAreaIdRef.current !== id) {
        setCrags([]);
        setSavedHydrated(false);
      }
    }, [props.area?.id]);

    const onPresent = useCallback(() => {
      const id = props.area?.id;
      if (id) {
        void loadCrags(id);
        void refreshSavedState(id);
      }
      props.onPresented?.();
    }, [loadCrags, refreshSavedState, props]);

    const onDismiss = useCallback(() => {
      props.onDismiss?.();
    }, [props]);

    const header = useMemo(() => {
      const a = props.area;
      return {
        id: a?.id ?? '',
        name: a?.name ?? '',
        cover_url: a?.cover_url ?? null,
        lat: a?.lat ?? null,
        lng: a?.lng ?? null,
        crag_count: a?.crag_count ?? 0,
        route_count: a?.route_count ?? 0,
      };
    }, [props.area]);

    const subtitle = props.regionName || tr('攀岩区', 'Area');

    const handleDirections = useCallback(() => {
      const { lat, lng, name } = header;
      if (lat == null || lng == null) return;
      const label = encodeURIComponent(name);
      if (Platform.OS === 'ios') {
        const apple = `http://maps.apple.com/?daddr=${lat},${lng}&q=${label}`;
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [tr('苹果地图', 'Apple Maps'), tr('取消', 'Cancel')],
            cancelButtonIndex: 1,
          },
          (i) => {
            if (i === 0) Linking.openURL(apple);
          },
        );
      } else {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
        );
      }
    }, [header, tr]);

    const handleInfo = useCallback(() => {
      sheetRef.current?.resize(1).catch(() => {});
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: 220, animated: true });
      }, 250);
    }, []);

    const handleSave = useCallback(async () => {
      if (!header.id || !savedHydrated) return;
      const prev = isSaved;
      setIsSaved(!prev);
      try {
        if (prev) {
          await savedSpotsApi.unsave('area', header.id);
        } else {
          await savedSpotsApi.save('area', header.id);
        }
      } catch {
        setIsSaved(prev);
      }
    }, [header.id, isSaved, savedHydrated]);

    const handleShare = useCallback(async () => {
      if (!header.name) return;
      const { lat, lng } = header;
      const url =
        lat != null && lng != null
          ? `https://maps.apple.com/?q=${encodeURIComponent(header.name)}&ll=${lat},${lng}`
          : undefined;
      try {
        await Share.share({
          title: header.name,
          message: url ? `${header.name}\n${url}` : header.name,
          ...(url ? { url } : {}),
        });
      } catch {}
    }, [header]);

    const actions: PlaceSheetAction[] = [
      {
        icon: 'navigate',
        label: tr('导航', 'Directions'),
        onPress: handleDirections,
        variant: 'tint',
        disabled: header.lat == null || header.lng == null,
      },
    ];

    const stats = [
      {
        value: header.crag_count,
        label: tr('攀岩点', header.crag_count === 1 ? 'Crag' : 'Crags'),
      },
      {
        value: header.route_count,
        label: tr('路线', header.route_count === 1 ? 'Route' : 'Routes'),
      },
    ];

    const footerActions: PlaceSheetFooterAction[] = [
      {
        key: 'info',
        icon: 'info.circle',
        onPress: handleInfo,
        disabled: !props.area?.description,
      },
      {
        key: 'share',
        icon: 'square.and.arrow.up',
        onPress: handleShare,
        disabled: !header.name,
      },
      {
        key: 'save',
        icon: isSaved ? 'bookmark.fill' : 'bookmark',
        onPress: handleSave,
        disabled: !header.id || !savedHydrated,
      },
    ];

    return (
      <TrueSheet
        ref={sheetRef}
        name="area-info-sheet"
        detents={[0.5, 0.9]}
        dimmed={false}
        dismissible
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        scrollable
        footer={<PlaceSheetFooter actions={footerActions} unionId="area-info-footer" />}
        onDidPresent={onPresent}
        onDidDismiss={onDismiss}
      >
        <TopFadeMaskView topFadeRatio={0.08}>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <PlaceSheetHero
              imageUrl={header.cover_url}
              fallbackIcon="triangle"
              placeholderSource={require('../../../../assets/images/placeholders/hero-default.jpg')}
            />
            <PlaceSheetIdentity title={header.name} subtitle={subtitle} />
            <PlaceSheetActions actions={actions} />
            <PlaceSheetStats stats={stats} />

            {props.area?.description ? (
              <View style={styles.contentCard}>
                <Text style={styles.sectionTitle}>
                  {tr('描述', 'Description')}
                </Text>
                <Text style={styles.paragraph}>{props.area.description}</Text>
              </View>
            ) : null}

            {/* Child Crag list — primary navigation surface per PLAN §4.2. */}
            <View style={styles.contentCard}>
              <Text style={styles.sectionTitle}>
                {tr('攀岩点', 'Crags')}
              </Text>
              {loading && crags.length === 0 ? (
                <ActivityIndicator color={colors.accent} style={{ marginTop: 12 }} />
              ) : crags.length === 0 ? (
                <Text style={styles.emptyText}>
                  {tr('暂无攀岩点', 'No crags yet')}
                </Text>
              ) : (
                crags.map((c) => (
                  <CragRow
                    key={c.id}
                    crag={c}
                    colors={colors}
                    onPress={() => props.onPressCrag?.(c)}
                  />
                ))
              )}
            </View>
          </ScrollView>
        </TopFadeMaskView>
      </TrueSheet>
    );
  },
);

AreaInfoSheet.displayName = 'AreaInfoSheet';

export default AreaInfoSheet;

// ---- Sub-components ----

function CragRow({
  crag,
  colors,
  onPress,
}: {
  crag: Crag;
  colors: ReturnType<typeof useThemeColors>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons
        name="location-outline"
        size={18}
        color={colors.textSecondary}
        style={{ marginRight: 10 }}
      />
      <Text
        style={{
          flex: 1,
          fontFamily: theme.fonts.medium,
          fontSize: 15,
          color: colors.textPrimary,
        }}
        numberOfLines={1}
      >
        {crag.name}
      </Text>
      {crag.route_count != null ? (
        <Text
          style={{
            fontFamily: theme.fonts.regular,
            fontSize: 13,
            color: colors.textSecondary,
            marginRight: 8,
          }}
        >
          {crag.route_count}
        </Text>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </Pressable>
  );
}

// ---- Styles ----

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: 0,
      paddingTop: 0,
      paddingBottom: 40,
    },
    contentCard: {
      backgroundColor: c.sheetBackground,
      borderRadius: 16,
      padding: 16,
      marginHorizontal: theme.spacing.screenPadding,
      marginTop: 12,
    },
    sectionTitle: {
      fontFamily: theme.fonts.bold,
      fontSize: 13,
      color: c.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    paragraph: {
      fontFamily: theme.fonts.regular,
      fontSize: 15,
      lineHeight: 22,
      color: c.textPrimary,
    },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textTertiary,
      paddingVertical: 12,
    },
  });
