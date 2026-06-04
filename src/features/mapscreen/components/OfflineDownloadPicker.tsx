// src/features/mapscreen/components/OfflineDownloadPicker.tsx
// Second-level sheet launched from OfflineMapsSheet's "Download new map"
// pill. Lists all areas and lets the user kick off a pack download for
// the currently-active map style. Single-task queue — only one download
// runs at a time to avoid native concurrency issues in Mapbox's offline
// manager.

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { outdoorApi } from '../../outdoor/api';
// BR Track A: top-level outdoor entity is now Region. Alias kept.
import type { Region as Area } from '../../outdoor/types';
import {
  createPack,
  deletePack,
  deriveBboxFromCrags,
  estimatePackSizeMB,
  listPacks,
  packName,
  type StyleId,
} from '../offlineManager';

export interface OfflineDownloadPickerHandle {
  present: () => void;
  dismiss: () => void;
}

interface OfflineDownloadPickerProps {
  currentStyleId: StyleId;
  /** Called after a pack download completes (success) so the parent sheet
   *  can refresh its list. Not called on failure. */
  onPackDownloaded?: () => void;
}

type RowState = 'idle' | 'downloading' | 'done';

const OfflineDownloadPicker = forwardRef<
  OfflineDownloadPickerHandle,
  OfflineDownloadPickerProps
>((props, ref) => {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const sheetRef = useRef<TrueSheet>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [activeDownload, setActiveDownload] = useState<{
    areaId: string;
    pct: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedAreas, packs] = await Promise.all([
        outdoorApi.listRegions(),
        listPacks(),
      ]);
      setAreas(fetchedAreas);
      const ids = new Set(
        packs
          .filter((p) => p.styleId === props.currentStyleId)
          .map((p) => p.areaId),
      );
      setDownloadedIds(ids);
    } finally {
      setLoading(false);
    }
  }, [props.currentStyleId]);

  useImperativeHandle(ref, () => ({
    present: () => {
      sheetRef.current?.present().catch(() => {});
      refresh();
    },
    dismiss: () => {
      sheetRef.current?.dismiss().catch(() => {});
    },
  }));

  const confirm = useCallback(
    (title: string, message?: string) =>
      new Promise<boolean>((resolve) => {
        Alert.alert(title, message, [
          {
            text: tr('取消', 'Cancel'),
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: tr('确认', 'Confirm'),
            onPress: () => resolve(true),
          },
        ]);
      }),
    [tr],
  );

  const handleSelectArea = useCallback(
    async (area: Area) => {
      if (activeDownload) {
        Alert.alert(
          tr('请等待当前下载完成', 'Please wait for the current download'),
        );
        return;
      }

      // Fetch crags for bbox derivation.
      const crags = await outdoorApi.getCrags(area.id);
      const bbox = deriveBboxFromCrags(crags);
      if (!bbox) {
        Alert.alert(
          tr('无法下载', 'Cannot download'),
          tr('该地区暂无岩点坐标', 'This area has no crag coordinates'),
        );
        return;
      }

      // Overwrite path.
      if (downloadedIds.has(area.id)) {
        const ok = await confirm(
          tr('已下载', 'Already downloaded'),
          tr('覆盖现有离线包?', 'Overwrite the existing offline pack?'),
        );
        if (!ok) return;
        try {
          await deletePack(packName(area.id, props.currentStyleId));
        } catch {
          /* noop */
        }
      }

      const estMB = estimatePackSizeMB(bbox);
      const ok = await confirm(
        tr('确认下载', 'Confirm download'),
        tr(
          `${area.name} (~${estMB} MB)`,
          `${area.name_en ?? area.name} (~${estMB} MB)`,
        ),
      );
      if (!ok) return;

      setActiveDownload({ areaId: area.id, pct: 0 });
      // Minimum visible window so the ring is perceptible even when Mapbox's
      // ambient cache serves tiles instantly (post-delete re-download path).
      const startedAt = Date.now();
      const MIN_VISIBLE_MS = 800;
      try {
        await createPack({
          areaId: area.id,
          styleId: props.currentStyleId,
          bbox,
          onProgress: (pct) =>
            setActiveDownload({ areaId: area.id, pct }),
        });
        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_VISIBLE_MS) {
          await new Promise((r) => setTimeout(r, MIN_VISIBLE_MS - elapsed));
        }
        setActiveDownload(null);
        setDownloadedIds((prev) => new Set(prev).add(area.id));
        props.onPackDownloaded?.();
      } catch (e: any) {
        setActiveDownload(null);
        await deletePack(packName(area.id, props.currentStyleId)).catch(
          () => {},
        );
        Alert.alert(
          tr('下载失败', 'Download failed'),
          e?.message ?? tr('未知错误', 'Unknown error'),
        );
      }
    },
    [activeDownload, confirm, downloadedIds, props, tr],
  );

  const renderRow = useCallback(
    ({ item }: { item: Area }) => {
      const isDownloading = activeDownload?.areaId === item.id;
      const isDone = downloadedIds.has(item.id);
      const state: RowState = isDownloading
        ? 'downloading'
        : isDone
          ? 'done'
          : 'idle';

      const routeCountText = item.route_count
        ? tr(`${item.route_count} 条线路`, `${item.route_count} routes`)
        : '';
      const displayName = item.name_en ?? item.name;

      return (
        <TouchableOpacity
          style={[styles.row, isDone && styles.rowDone]}
          onPress={() => handleSelectArea(item)}
          activeOpacity={0.7}
          disabled={isDownloading}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {displayName}
            </Text>
            {routeCountText ? (
              <Text style={styles.rowSubtitle} numberOfLines={1}>
                {routeCountText}
              </Text>
            ) : null}
          </View>
          <RowIcon
            state={state}
            pct={isDownloading ? activeDownload!.pct : 0}
            colors={colors}
          />
        </TouchableOpacity>
      );
    },
    [activeDownload, colors, downloadedIds, handleSelectArea, styles, tr],
  );

  return (
    <TrueSheet
      ref={sheetRef}
      name="offline-download-picker"
      detents={[0.5, 0.9]}
      dimmed
      dismissible
      grabber
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      backgroundColor={colors.background}
    >
      <View style={styles.header}>
        <Text style={styles.title}>
          {tr('选择区域下载', 'Choose area to download')}
        </Text>
        <Text style={styles.subtitle}>
          {tr(
            `当前样式: ${styleLabel(props.currentStyleId, 'zh')}`,
            `Current style: ${styleLabel(props.currentStyleId, 'en')}`,
          )}
        </Text>
      </View>
      <FlatList
        data={areas}
        keyExtractor={(item) => item.id}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          loading ? (
            <View style={styles.empty}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {tr('暂无区域', 'No areas available')}
              </Text>
            </View>
          )
        }
      />
    </TrueSheet>
  );
});

OfflineDownloadPicker.displayName = 'OfflineDownloadPicker';

export default OfflineDownloadPicker;

function styleLabel(styleId: StyleId, lang: 'zh' | 'en'): string {
  if (styleId === 'satellite') return lang === 'zh' ? '卫星' : 'Satellite';
  return lang === 'zh' ? '户外' : 'Outdoors';
}

function RowIcon({
  state,
  pct,
  colors,
}: {
  state: RowState;
  pct: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  if (state === 'done') {
    return (
      <Ionicons name="checkmark-circle" size={24} color={colors.textTertiary} />
    );
  }
  if (state === 'downloading') {
    return <ProgressRing pct={pct} colors={colors} />;
  }
  return (
    <Ionicons name="arrow-down-circle-outline" size={26} color={colors.accent} />
  );
}

// Small SVG progress ring sized to match the 26pt download icon so the
// row's right-side anchor doesn't shift when state flips to downloading.
function ProgressRing({
  pct,
  colors,
}: {
  pct: number;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const SIZE = 26;
  const STROKE = 2.5;
  const RADIUS = (SIZE - STROKE) / 2;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const clamped = Math.max(0, Math.min(100, pct));
  const offset = CIRCUMFERENCE * (1 - clamped / 100);
  return (
    <Svg width={SIZE} height={SIZE}>
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke={colors.border}
        strokeWidth={STROKE}
        fill="none"
      />
      <Circle
        cx={SIZE / 2}
        cy={SIZE / 2}
        r={RADIUS}
        stroke={colors.accent}
        strokeWidth={STROKE}
        fill="none"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation={-90}
        origin={`${SIZE / 2}, ${SIZE / 2}`}
      />
    </Svg>
  );
}

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
    subtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 4,
    },
    listContent: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingBottom: 24,
      flexGrow: 1,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.border,
      gap: 12,
    },
    rowDone: {
      opacity: 0.55,
    },
    rowText: {
      flex: 1,
    },
    rowTitle: {
      fontFamily: theme.fonts.medium,
      fontSize: 15,
      color: c.textPrimary,
    },
    rowSubtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textSecondary,
      marginTop: 2,
    },
    empty: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    emptyText: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
    },
  });
