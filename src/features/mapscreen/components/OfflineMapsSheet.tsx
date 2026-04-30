// src/features/mapscreen/components/OfflineMapsSheet.tsx
// Primary offline maps sheet launched from AreaMenuSheet's "Offline Maps"
// entry. Lists downloaded packs with size/style metadata and exposes a
// "Download new map" pill that presents OfflineDownloadPicker.

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
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { Ionicons } from '@expo/vector-icons';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { outdoorApi } from '../../outdoor/api';
import type { Area } from '../../outdoor/types';
import {
  deletePack,
  formatBytes,
  listPacks,
  type OfflinePackInfo,
  type StyleId,
} from '../offlineManager';
import OfflineDownloadPicker, {
  type OfflineDownloadPickerHandle,
} from './OfflineDownloadPicker';

export interface OfflineMapsSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface OfflineMapsSheetProps {
  /** Style currently rendered by the map screen — passed through to the
   *  download picker so users can only download packs matching what
   *  they see on-screen. MVP simplification; multi-style downloads are
   *  follow-up work. */
  currentStyleId: StyleId;
}

const OfflineMapsSheet = forwardRef<
  OfflineMapsSheetHandle,
  OfflineMapsSheetProps
>((props, ref) => {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const sheetRef = useRef<TrueSheet>(null);
  const pickerRef = useRef<OfflineDownloadPickerHandle>(null);
  const [packs, setPacks] = useState<OfflinePackInfo[]>([]);
  const [areaMap, setAreaMap] = useState<Map<string, Area>>(new Map());
  const [loading, setLoading] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [fetchedPacks, areas] = await Promise.all([
        listPacks(),
        outdoorApi.listAreas(),
      ]);
      setPacks(fetchedPacks);
      setAreaMap(new Map(areas.map((a) => [a.id, a])));
    } finally {
      setLoading(false);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    present: () => {
      sheetRef.current?.present().catch(() => {});
      refresh();
    },
    dismiss: () => {
      sheetRef.current?.dismiss().catch(() => {});
    },
  }));

  useEffect(() => {
    // Initial load — so the sheet reflects current packs even if the
    // user opens it twice in quick succession without dismissing.
    refresh();
  }, [refresh]);

  const totalBytes = useMemo(
    () => packs.reduce((sum, p) => sum + p.sizeBytes, 0),
    [packs],
  );

  const handleDelete = useCallback(
    (pack: OfflinePackInfo) => {
      Alert.alert(
        tr('删除离线地图?', 'Delete offline map?'),
        tr(
          '此离线地图将无法继续使用，需重新下载。',
          'This map will no longer be available offline. You can re-download it later.',
        ),
        [
          { text: tr('取消', 'Cancel'), style: 'cancel' },
          {
            text: tr('删除', 'Delete'),
            style: 'destructive',
            onPress: async () => {
              try {
                await deletePack(pack.name);
                await refresh();
              } catch (e: any) {
                Alert.alert(
                  tr('删除失败', 'Delete failed'),
                  e?.message ?? tr('未知错误', 'Unknown error'),
                );
              }
            },
          },
        ],
      );
    },
    [refresh, tr],
  );

  const renderRow = useCallback(
    ({ item }: { item: OfflinePackInfo }) => {
      const area = areaMap.get(item.areaId);
      const displayName = area?.name_en ?? area?.name ?? item.areaId;
      const styleText =
        item.styleId === 'satellite'
          ? tr('卫星', 'Satellite')
          : tr('户外', 'Outdoors');
      const sizeText = formatBytes(item.sizeBytes);

      return (
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.rowSubtitle} numberOfLines={1}>
              {styleText} · {sizeText}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDelete(item)}
            hitSlop={12}
            activeOpacity={0.6}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        </View>
      );
    },
    [areaMap, colors.textSecondary, handleDelete, styles, tr],
  );

  return (
    <>
      <TrueSheet
        ref={sheetRef}
        name="offline-maps-sheet"
        detents={[1.0]}
        dimmed
        dismissible
        grabber
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      >
        <View style={styles.header}>
          <Text style={styles.title}>{tr('离线地图', 'Offline Maps')}</Text>
          <Text style={styles.subtitle}>
            {formatBytes(totalBytes)} {tr('已使用', 'used')}
          </Text>
        </View>
        <FlatList
          data={packs}
          keyExtractor={(item) => item.name}
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
                  {tr('暂无离线地图', 'No offline maps yet')}
                </Text>
              </View>
            )
          }
        />
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => pickerRef.current?.present()}
            activeOpacity={0.7}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>
              {tr('下载新地图', 'Download new map')}
            </Text>
          </TouchableOpacity>
        </View>
      </TrueSheet>

      <OfflineDownloadPicker
        ref={pickerRef}
        currentStyleId={props.currentStyleId}
        onPackDownloaded={refresh}
      />
    </>
  );
});

OfflineMapsSheet.displayName = 'OfflineMapsSheet';

export default OfflineMapsSheet;

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
    footer: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 12,
      paddingBottom: 24,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.border,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.cardDark,
      borderRadius: 20,
      paddingVertical: 14,
      gap: 6,
    },
    primaryBtnText: {
      fontFamily: theme.fonts.medium,
      fontSize: 15,
      color: '#FFFFFF',
    },
  });
