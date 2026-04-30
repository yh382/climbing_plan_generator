// src/features/outdoor/components/AddRouteSheet.tsx
// Stacked sheet launched from AreaMenuSheet's "Add a Route" entry.
// MVP field set (per AE window brief, 2026-04-22):
//   top segment: Rope | Boulder
//   sub-segment (when Rope): Sport / Trad / Multi-pitch
//   name (text)  | grade (chip scroller, V-scale or YDS per top seg)
//   coords (use-map-center OR tap-on-map-to-pin)
//   photos (reuses /community/device-media-picker route)
//
// Photo picker flow: the picker is a full-screen route, not a component.
// We dismiss this sheet, push the picker, and re-present via
// useFocusEffect after router.back() + consumePendingMedia() drains the
// bridge (same pattern as LogSendModal).
//
// Pin-pick flow: we dismiss this sheet and let the host map screen take
// over (crosshair overlay + onPress handler). Host calls ref.setCoords()
// + ref.present() when done.

import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TrueSheet } from '@lodev09/react-native-true-sheet';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Location from 'expo-location';

import { useThemeColors } from '../../../lib/useThemeColors';
import { useSettings } from '../../../contexts/SettingsContext';
import { theme } from '../../../lib/theme';
import { NativeSegmentedControl } from '../../../components/ui/NativeSegmentedControl';
import { V_SCALE_GRADES, YDS_GRADES } from '../../../lib/gradeSystem';
import { uploadPostMedia } from '../../community/api';
import { consumePendingMedia } from '../../community/pendingMedia';
import { outdoorApi } from '../api';

type RopeStyle = 'sport' | 'trad' | 'multi-pitch';
type Style = 'boulder' | RopeStyle;

const MAX_PHOTOS = 10;

export interface AddRouteSheetHandle {
  present: () => void;
  dismiss: () => void;
  /** Called by the host after a map tap returns coords. Host should call
   *  present() separately — setCoords only updates state. */
  setCoords: (coords: [number, number]) => void;
}

interface AddRouteSheetProps {
  areaId: string;
  /** Invoked when the user picks "Pick on map". Host dismisses this
   *  sheet (we do it ourselves before calling), flips into pin-pick
   *  mode (crosshair overlay + Confirm/Cancel buttons), reads the
   *  camera center when the user confirms, then calls
   *  ref.setCoords + ref.present. */
  onRequestPinOnMap: () => void;
  /** Fires after a successful submit (sheet already dismissed + form
   *  reset). Host can toast, refresh pins, etc. */
  onSubmitted?: () => void;
}

const AddRouteSheet = forwardRef<AddRouteSheetHandle, AddRouteSheetProps>((props, ref) => {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const sheetRef = useRef<TrueSheet>(null);
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Set to true when we programmatically dismiss the sheet before
  // pushing the device-media-picker; useFocusEffect re-presents on
  // return and clears this flag.
  const pendingRepresentRef = useRef(false);

  // Top segment: 0 = Rope, 1 = Boulder
  const [topIdx, setTopIdx] = useState(0);
  // Sub-style when Rope is selected
  const [ropeStyle, setRopeStyle] = useState<RopeStyle>('sport');

  const style: Style = topIdx === 1 ? 'boulder' : ropeStyle;
  const gradeSystem: 'yds' | 'vscale' = topIdx === 1 ? 'vscale' : 'yds';
  const gradeOptions = topIdx === 1 ? V_SCALE_GRADES : YDS_GRADES;

  const [name, setName] = useState('');
  const [gradeText, setGradeText] = useState('');
  const [coords, setCoords] = useState<[number, number] | null>(null);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleTopChange = (idx: number) => {
    if (idx !== topIdx) setGradeText(''); // V-scale ↔ YDS not compatible
    setTopIdx(idx);
  };

  useImperativeHandle(ref, () => ({
    present: () => {
      sheetRef.current?.present().catch(() => {});
    },
    dismiss: () => {
      sheetRef.current?.dismiss().catch(() => {});
    },
    setCoords: (c) => setCoords(c),
  }));

  // Back from /community/device-media-picker: consume the media bridge,
  // upload photos to R2 under `outdoor_routes/`, re-present the sheet.
  useFocusEffect(
    useCallback(() => {
      const items = consumePendingMedia();
      if (items && items.length > 0) {
        const photos = items.filter((it) => it.mediaType === 'image');
        if (photos.length > 0) {
          setUploading(true);
          uploadPostMedia(photos, 'outdoor_routes')
            .then((uploaded) => {
              setPhotoUrls((prev) => [...prev, ...uploaded.map((u) => u.url)]);
            })
            .catch((e) => {
              Alert.alert(
                tr('上传失败', 'Upload failed'),
                String(e?.message ?? e),
              );
            })
            .finally(() => {
              setUploading(false);
            });
        }
      }
      // Re-present only if we left via our own picker push — NOT if the
      // user dismissed the sheet by swiping down (onDidDismiss clears
      // the flag).
      if (pendingRepresentRef.current) {
        pendingRepresentRef.current = false;
        setTimeout(() => sheetRef.current?.present().catch(() => {}), 50);
      }
    }, [tr]),
  );

  const handlePickPhotos = () => {
    const remaining = MAX_PHOTOS - photoUrls.length;
    if (remaining <= 0) {
      Alert.alert(tr('照片数量已达上限', 'Photo limit reached'));
      return;
    }
    pendingRepresentRef.current = true;
    sheetRef.current?.dismiss().catch(() => {});
    router.push({
      pathname: '/community/device-media-picker' as any,
      params: {
        mode: 'initial',
        maxSelect: String(remaining),
        source: 'add-route',
      },
    });
  };

  const [locLoading, setLocLoading] = useState(false);

  const handleUseMyLocation = async () => {
    // GPS-first flow: user just finished the climb and is standing at
    // the route — grabbing their device location is the most accurate
    // and least friction path. Map-center picking is the fallback via
    // "Pick on map".
    setLocLoading(true);
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      let granted = status === 'granted';
      if (!granted) {
        const req = await Location.requestForegroundPermissionsAsync();
        granted = req.status === 'granted';
      }
      if (!granted) {
        Alert.alert(
          tr('定位权限', 'Location permission'),
          tr('请在系统设置中授权定位。', 'Please enable Location access in Settings.'),
        );
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Highest,
      });
      setCoords([pos.coords.longitude, pos.coords.latitude]);
    } catch {
      Alert.alert(
        tr('定位失败', 'Location unavailable'),
        tr('无法获取当前位置，请稍后重试或用地图选点。', 'Could not get your location. Try again or pick on the map.'),
      );
    } finally {
      setLocLoading(false);
    }
  };

  const handleTapOnMap = () => {
    sheetRef.current?.dismiss().catch(() => {});
    props.onRequestPinOnMap();
  };

  const handleRemovePhoto = (url: string) => {
    setPhotoUrls((prev) => prev.filter((u) => u !== url));
  };

  const handleSubmit = async () => {
    if (!props.areaId) {
      Alert.alert(tr('缺少攀岩区', 'Area missing'));
      return;
    }
    if (!name.trim()) {
      Alert.alert(tr('请填写路线名称', 'Please enter route name'));
      return;
    }
    if (!gradeText) {
      Alert.alert(tr('请选择难度', 'Please select grade'));
      return;
    }
    if (!coords) {
      Alert.alert(tr('请选择坐标', 'Please set coordinates'));
      return;
    }
    if (photoUrls.length === 0) {
      Alert.alert(tr('请至少上传一张照片', 'Please add at least one photo'));
      return;
    }
    setSubmitting(true);
    try {
      await outdoorApi.submitRoute({
        area_id: props.areaId,
        style,
        name: name.trim(),
        grade_text: gradeText,
        grade_system: gradeSystem,
        lat: coords[1],
        lng: coords[0],
        photo_urls: photoUrls,
      });
      Alert.alert(
        tr('提交成功', 'Submitted'),
        tr('等待管理员审核', 'Waiting for admin review'),
      );
      // Reset form
      setName('');
      setGradeText('');
      setCoords(null);
      setPhotoUrls([]);
      setTopIdx(0);
      setRopeStyle('sport');
      sheetRef.current?.dismiss().catch(() => {});
      props.onSubmitted?.();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      Alert.alert(tr('提交失败', 'Submission failed'), msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <TrueSheet
      ref={sheetRef}
      name="add-route-sheet"
      detents={[1.0]}
      dimmed
      dismissible
      grabber
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      scrollable
    >
      <ScrollView
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>{tr('添加路线', 'Add a Route')}</Text>

        {/* Style segment */}
        <Text style={styles.label}>{tr('类型', 'Type')}</Text>
        <NativeSegmentedControl
          options={[tr('绳攀', 'Rope'), tr('抱石', 'Boulder')]}
          selectedIndex={topIdx}
          onSelect={handleTopChange}
        />
        {topIdx === 0 ? (
          <View style={styles.subStyleRow}>
            {(['sport', 'trad', 'multi-pitch'] as const).map((s) => {
              const active = ropeStyle === s;
              return (
                <TouchableOpacity
                  key={s}
                  onPress={() => setRopeStyle(s)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {s === 'sport'
                      ? tr('运动', 'Sport')
                      : s === 'trad'
                        ? tr('传统', 'Trad')
                        : tr('多段', 'Multi-pitch')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* Name */}
        <Text style={styles.label}>{tr('路线名', 'Name')}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={tr('例如：Bong Eater', 'e.g. Bong Eater')}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          maxLength={128}
        />

        {/* Grade */}
        <Text style={styles.label}>{tr('难度', 'Grade')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.gradeRow}
        >
          {gradeOptions.map((g) => {
            const active = gradeText === g;
            return (
              <TouchableOpacity
                key={g}
                onPress={() => setGradeText(g)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{g}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Coords */}
        <Text style={styles.label}>{tr('坐标', 'Coordinates')}</Text>
        <View style={styles.coordsRow}>
          <TouchableOpacity
            onPress={handleUseMyLocation}
            style={styles.coordsBtn}
            activeOpacity={0.7}
            disabled={locLoading}
          >
            {locLoading ? (
              <ActivityIndicator color={colors.accent} size="small" />
            ) : (
              <Ionicons name="navigate-outline" size={16} color={colors.accent} />
            )}
            <Text style={styles.coordsBtnText}>
              {tr('使用我的位置', 'Use my location')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleTapOnMap}
            style={styles.coordsBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="pin-outline" size={16} color={colors.accent} />
            <Text style={styles.coordsBtnText}>{tr('在地图上选点', 'Pick on map')}</Text>
          </TouchableOpacity>
        </View>
        {coords ? (
          <Text style={styles.coordsValue}>
            {coords[1].toFixed(5)}, {coords[0].toFixed(5)}
          </Text>
        ) : (
          <Text style={styles.coordsPlaceholder}>{tr('未选择', 'Not set')}</Text>
        )}

        {/* Photos */}
        <Text style={styles.label}>
          {tr('照片', 'Photos')}
          <Text style={styles.labelHint}> ({photoUrls.length}/{MAX_PHOTOS})</Text>
        </Text>
        <View style={styles.photoGrid}>
          {photoUrls.map((url) => (
            <View key={url} style={styles.photoItem}>
              <Image source={{ uri: url }} style={styles.photoThumb} />
              <TouchableOpacity
                style={styles.photoRemove}
                onPress={() => handleRemovePhoto(url)}
                hitSlop={6}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
          {photoUrls.length < MAX_PHOTOS && (
            <TouchableOpacity
              onPress={handlePickPhotos}
              style={[styles.photoItem, styles.photoAdd]}
              disabled={uploading}
              activeOpacity={0.7}
            >
              {uploading ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : (
                <Ionicons name="add" size={28} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Submit */}
        <TouchableOpacity
          onPress={handleSubmit}
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          disabled={submitting || uploading}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>{tr('提交', 'Submit')}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </TrueSheet>
  );
});

AddRouteSheet.displayName = 'AddRouteSheet';
export default AddRouteSheet;

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    body: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 20,
      paddingBottom: 40,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 22,
      color: c.textPrimary,
      marginBottom: 12,
    },
    label: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textSecondary,
      marginTop: 20,
      marginBottom: 8,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    labelHint: {
      textTransform: 'none',
      color: c.textTertiary,
    },
    subStyleRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 10,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: theme.borderRadius.pill,
      backgroundColor: c.backgroundSecondary,
    },
    chipActive: {
      backgroundColor: c.accent,
    },
    chipText: {
      fontFamily: theme.fonts.medium,
      fontSize: 14,
      color: c.textPrimary,
    },
    chipTextActive: {
      color: '#fff',
    },
    input: {
      height: 44,
      paddingHorizontal: 14,
      fontFamily: theme.fonts.regular,
      fontSize: 16,
      color: c.textPrimary,
      backgroundColor: c.backgroundSecondary,
      borderRadius: 12,
    },
    gradeRow: {
      gap: 8,
      paddingVertical: 4,
      paddingRight: 16,
    },
    coordsRow: {
      flexDirection: 'row',
      gap: 10,
    },
    coordsBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: c.backgroundSecondary,
    },
    coordsBtnText: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.accent,
    },
    coordsValue: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textPrimary,
      marginTop: 8,
    },
    coordsPlaceholder: {
      fontFamily: theme.fonts.regular,
      fontSize: 13,
      color: c.textTertiary,
      marginTop: 8,
    },
    photoGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    photoItem: {
      width: 80,
      height: 80,
      borderRadius: 10,
      overflow: 'hidden',
      backgroundColor: c.backgroundSecondary,
    },
    photoThumb: {
      width: '100%',
      height: '100%',
    },
    photoRemove: {
      position: 'absolute',
      top: 2,
      right: 2,
      backgroundColor: 'rgba(0,0,0,0.5)',
      borderRadius: 10,
    },
    photoAdd: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: c.divider,
      backgroundColor: 'transparent',
    },
    submitBtn: {
      marginTop: 28,
      height: 50,
      borderRadius: 25, // Full pill (height/2) to match Apple Maps action-button style.
      backgroundColor: c.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitBtnDisabled: {
      opacity: 0.6,
    },
    submitBtnText: {
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: '#fff',
    },
  });
