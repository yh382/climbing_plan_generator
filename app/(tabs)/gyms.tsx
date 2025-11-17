// app/(tabs)/gyms.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
  StyleSheet,
  useColorScheme,
  Pressable,
  useWindowDimensions,  
} from "react-native";
import MapboxGL from "@rnmapbox/maps";
import * as Location from "expo-location";
import Constants from "expo-constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { searchGymsNearby, type GymPlace } from "../../lib/poi";
import BottomSheet, { BottomSheetView, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import type { Feature, Point } from "geojson";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient"; // ✅ 雾化渐变
import { Ionicons } from "@expo/vector-icons";
import { Keyboard, InteractionManager, LayoutAnimation, UIManager, Alert, Linking, ActionSheetIOS   } from "react-native";
import { useSettings } from "src/contexts/SettingsContext";
import { useSharedValue, useDerivedValue } from "react-native-reanimated";
import type{ BottomSheetFlatListMethods } from "@gorhom/bottom-sheet";
import {
  FLOATING_TAB_BAR_GYMS_SIDE_MARGIN,
  FLOATING_TAB_BAR_STACK_SPACING,
} from "@components/FloatingTabBar.constants";
import { BlurView } from "expo-blur";

type LatLng = { lat: number; lng: number };


const MAPBOX_TOKEN = (Constants.expoConfig?.extra as any)?.MAPBOX_TOKEN as string;
MapboxGL.setAccessToken(MAPBOX_TOKEN);

export default function GymsScreen() {
  const mapRef = useRef<MapboxGL.MapView>(null);
  const camRef = useRef<MapboxGL.Camera>(null);
  const bsRef = useRef<BottomSheet>(null);
  const inputRef = useRef<TextInput>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [query, setQuery] = useState("");
  const [userLoc, setUserLoc] = useState<LatLng | null>(null);
  const [center, setCenter] = useState<LatLng | null>(null);
  const [gyms, setGyms] = useState<GymPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [is3D, setIs3D] = useState(false);
  const [styleId, setStyleId] = useState<"outdoors" | "satellite">("outdoors");
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const [searchFocused, setSearchFocused] = useState(false);
  const [showClear, setShowClear] = useState(false);  // 仅在点过搜索栏时显示 X 胶囊
  const { tr } = useSettings();
  const { height: screenH } = useWindowDimensions();
  const [selectedGym, setSelectedGym] = useState<GymPlace | null>(null);
  const listRef = useRef<BottomSheetFlatListMethods>(null);

  const collapsedHeight = 118;
  const bottomInset = useMemo(
  () => (insets.bottom || 0) + FLOATING_TAB_BAR_STACK_SPACING,
  [insets.bottom]
  );// 地图中心是否已对准用户定位（阈值约 120m）
  const isAtUser = useMemo(() => {
    if (!userLoc || !center) return false;
    // 粗略距离（米）
    const rad = Math.PI / 180;
    const x = (center.lng - userLoc.lng) * Math.cos(((center.lat + userLoc.lat) * rad) / 2);
    const y = (center.lat - userLoc.lat);
    const distM = Math.sqrt(x * x + y * y) * 111320; // m
    return distM < 120;
  }, [userLoc, center]);

  useEffect(() => {
    if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [isAtUser]);

  // —— 想要停在“灵动岛下方一点”的顶部间距
  const topGapWanted = useMemo(() => insets.top + 12, [insets.top]);

  // ① 先算出最大展开高度（expandedPx）
  const expandedPx = Math.round(screenH - bottomInset - topGapWanted);

  // ② snapPoints：收起 / 中段（45%）/ 亮色段（像素锚定在灵动岛下）
  const snapPoints = useMemo(() => {
    return [collapsedHeight, "45%", expandedPx];
  }, [collapsedHeight, expandedPx]);

// ③ 计算高亮触发阈值（65%）
const brightThreshold = expandedPx * 0.65;

  const overlayTint = scheme === "dark" ? "rgba(15,23,42,0.72)" : "rgba(248,250,252,0.82)";
  const colors = useMemo(() => {
    const isDark = scheme === "dark";
    const shellBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.06)";
    const shellBg = isDark ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.97)";
    const shellBG = isDark
    ? "rgba(15,23,42,0.40)"
    : "rgba(255,255,255,0.60)";
    const shellBORDER = isDark
    ? "rgba(148,163,184,0.85)"
    : "rgba(148,163,184,0.30)";
    return {
      shellBg: shellBg,
      shellBG: shellBG,
      shellBorder: shellBorder,
      shellBORDER: shellBORDER,
      iconActive: "#306E6F",
      iconInactive: isDark ? "rgba(226,232,240,0.8)" : "#94A3B8",
      iconLabel: isDark ? "rgba(226,232,240,0.95)" : "#1E293B",
      searchBg: isDark ? "rgba(30,41,59,0.88)" : "rgba(241,245,249,0.94)",
      searchPlaceholder: isDark ? "rgba(148,163,184,0.8)" : "#94A3B8",
      searchBorder: shellBorder,                                    // ✅ 搜索栏常态边框
      searchBorderFocus: isDark ? "rgba(59,130,246,0.55)" : "#93c5fd", // ✅ 新增聚焦态边框色
      shellShadow:
        Platform.OS === "ios"
          ? { shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }
          : { elevation: 12, shadowColor: "#000" },
    };
  }, [scheme]);

    const primary = colors.iconActive;                     // 例：#306E6F
    const primaryBg = scheme === "dark"
      ? "rgba(48,110,111,0.22)"                           // 深色模式浅绿背景
      : "rgba(22,163,74,0.24)";  
      // —— 80% 段位是否“变亮” ——
    // 需求 3：当 bottomsheet 上滑到 80% 时，搜索栏&卡片变白、背景变灰
    const [isBright, setIsBright] = useState(false);

    const panelBg   = isBright
      ? (scheme === "dark" ? "rgba(148,163,184,0.08)" : "#F1F5F9")   // 面板灰背景
      : colors.shellBg;

    const fieldBg   = isBright ? "#FFFFFF" : colors.searchBg;        // 搜索栏底色
    const fieldBdr  = isBright ? (scheme === "dark" ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.06)") : colors.searchBorder;

    const cardBg    = isBright ? "#FFFFFF" : colors.shellBg;         // 卡片底色
    const cardBdr   = isBright ? (scheme === "dark" ? "rgba(255,255,255,0.16)" : "rgba(15,23,42,0.06)") : colors.shellBorder;
    const cardTitle = isBright ? (scheme === "dark" ? "#E2E8F0" : "#0F172A") : colors.iconLabel;
    const cardMeta  = isBright ? (scheme === "dark" ? "rgba(226,232,240,0.8)" : "#64748B") : colors.iconInactive;

  const topInset = Math.max(insets.top, 16);

  // 定位
  useEffect(() => {
    (async () => {
      try {
        setError(null);
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setError("未授权定位。你可以在搜索栏输入地址或城市。");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLoc(c);
        setCenter(c);
        camRef.current?.setCamera({ centerCoordinate: [c.lng, c.lat], zoomLevel: 11, animationDuration: 600 });
        await fetchNearby(c, query);
      } catch (e: any) {
        setError(e?.message ?? "定位失败");
      }
    })();
  }, []);

  useEffect(() => {
    if (sheetIndex < 2) setShowClear(false);
  }, [sheetIndex]);

  const fetchNearby = useCallback(
    async (c: LatLng, q: string) => {
      setLoading(true);
      setError(null);
      try {
        const list = await searchGymsNearby(c, 30, q);
        setGyms(list);
      } catch (e: any) {
        setError(e?.message ?? "获取附近岩馆失败");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const onRegionDidChange = useCallback(
    (f?: Feature<Point, any>) => {
      if (!f) return;
      let lat: number | undefined, lng: number | undefined;
      const coords = f.geometry?.coordinates;
      if (Array.isArray(coords) && coords.length >= 2) {
        lng = Number(coords[0]);
        lat = Number(coords[1]);
      }
      const vb = (f.properties as any)?.visibleBounds;
      if ((lat === undefined || lng === undefined) && Array.isArray(vb) && vb.length >= 2) {
        const sw = vb[0], ne = vb[1];
        if (Array.isArray(sw) && sw.length >= 2 && Array.isArray(ne) && ne.length >= 2) {
          lng = (Number(sw[0]) + Number(ne[0])) / 2;
          lat = (Number(sw[1]) + Number(ne[1])) / 2;
        }
      }
      if (typeof lat !== "number" || typeof lng !== "number") return;
      const c = { lat, lng };
      setCenter(c);
      if (sheetIndex <= 1) fetchNearby(c, query);
    },
    [fetchNearby, query, sheetIndex]
  );

  const onSubmitSearch = useCallback(() => {
    if (!center) return;
    fetchNearby(center, query.trim());
  }, [center, query, fetchNearby]);

  const flyTo = useCallback((p: GymPlace) => {
    camRef.current?.setCamera({
      centerCoordinate: [p.location.lng, p.location.lat],
      zoomLevel: 14,
      animationDuration: 600,
    });
    bsRef.current?.snapToIndex(0);
  }, []);

  const openGymDetails = useCallback((g: GymPlace) => {
    setSelectedGym(g);
    // 地图镜头对准
    camRef.current?.setCamera({
      centerCoordinate: [g.location.lng, g.location.lat],
      zoomLevel: 14,
      animationDuration: 500,
    });
    // 上滑到第 2 段
    bsRef.current?.snapToIndex(1);
    // 列表滚到该项
    const i = gyms.findIndex(x => x.place_id === g.place_id);
    if (i >= 0) {
      // 延迟一下等 BottomSheet 完成布局
      setTimeout(() => listRef.current?.scrollToIndex({ index: i, animated: true }), 200);
    }
  }, [gyms]);

  const handleNavigate = useCallback(async () => {
    if (!selectedGym) return;
    const { lat, lng } = selectedGym.location;
    const label = encodeURIComponent(selectedGym.name);

    if (Platform.OS === "android") {
      // ✅ Android：优先 Google Maps（导航模式）
      const gNav = `google.navigation:q=${lat},${lng}`;
      const gDir = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      const url = (await Linking.canOpenURL(gNav)) ? gNav : gDir;

      Alert.alert("Open Navigation?", "即将打开 Google Maps 进行导航", [
        { text: "取消", style: "cancel" },
        { text: "打开", onPress: () => Linking.openURL(url) },
      ]);
      return;
    }

    // ✅ iOS：无优先级，弹出选择
    const apple = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&q=${label}`;
    const gApp  = `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`;
    const canGoogle = await Linking.canOpenURL(gApp);

    const options = canGoogle ? ["Apple Maps", "Google Maps", "取消"] : ["Apple Maps", "取消"];
    const cancelIndex = options.length - 1;

    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: cancelIndex },
      (idx) => {
        if (idx === cancelIndex) return;
        if (options[idx] === "Google Maps") Linking.openURL(gApp);
        else Linking.openURL(apple);
      }
    );
  }, [selectedGym]);



  const mapStyleURL = useMemo(
    () => (styleId === "outdoors" ? "mapbox://styles/mapbox/outdoors-v12" : "mapbox://styles/mapbox/satellite-streets-v12"),
    [styleId]
  );
  const pitch = is3D ? 55 : 0;
  const bearing = 0;
  const searchPlaceholder = tr("搜索附近的岩馆…", "Search nearby climbing gyms…");
  const collapsedHint = tr("上滑查看附近岩馆列表", "Swipe up to explore nearby gyms");

  // ✅ 点搜索框，直达 90%
  const handleSearchFocus = useCallback(() => {
    bsRef.current?.snapToIndex(2);
  }, []);


  return (
    <View style={[styles.root, { backgroundColor: scheme === "dark" ? "#0B1220" : "#E2E8F0" }]}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} translucent />
      <View style={styles.mapWrapper}>
        {MAPBOX_TOKEN ? (
          <>
            <MapboxGL.MapView
              ref={mapRef}
              styleURL={mapStyleURL}
              style={StyleSheet.absoluteFillObject}
              logoEnabled={false}
              scaleBarEnabled={false}
              compassEnabled={false}
              onRegionDidChange={onRegionDidChange}
            >
              <MapboxGL.Camera ref={camRef} pitch={pitch} heading={bearing} />
              <MapboxGL.UserLocation visible showsUserHeadingIndicator />
              {gyms.map((g) => (
                <MapboxGL.PointAnnotation
                  key={g.place_id}
                  id={g.place_id}
                  coordinate={[g.location.lng, g.location.lat]}
                  onSelected={() => openGymDetails(g)}
                >
                  <View style={styles.pin} />
                </MapboxGL.PointAnnotation>
              ))}
                {/* 文本标注（只负责显示名字） */}
                <MapboxGL.ShapeSource
                  id="gyms-labels-src"
                  shape={{
                    type: "FeatureCollection",
                    features: gyms.map((g) => ({
                      type: "Feature",
                      id: g.place_id,
                      properties: { name: g.name },
                      geometry: { type: "Point", coordinates: [g.location.lng, g.location.lat] },
                    })),
                  }}
                >
                  <MapboxGL.SymbolLayer
                    id="gyms-labels"
                    style={{
                      textField: ['get', 'name'],
                      textSize: 12,
                      textColor: scheme === 'dark' ? '#E2E8F0' : '#0F172A',
                      textHaloColor: scheme === 'dark' ? 'rgba(11,18,32,0.85)' : 'rgba(255,255,255,0.85)',
                      textHaloWidth: 1.2,
                      textVariableAnchor: ['top', 'bottom', 'left', 'right'],
                      textOffset: [0, 1.2],
                      textAllowOverlap: true,
                      symbolZOrder: 'auto',
                    }}
                  />
                </MapboxGL.ShapeSource>
            </MapboxGL.MapView>

          {/* ✅ 右上角控制：第 0 段 & 第 1 段显示；第 2 段隐藏 */}
          {sheetIndex <= 1 ? (
            <View
              pointerEvents="box-none"
              style={[styles.controlColumn, { top: insets.top + 10 }]}  // ← 上移：离电量区域约 30
            >
              <View style={[styles.controlCard, scheme === "dark" && styles.controlCardDark]}>
                <IconButton
                  icon={styleId === "outdoors" ? "layers-outline" : "image-outline"}
                  onPress={() => setStyleId((s) => (s === "outdoors" ? "satellite" : "outdoors"))}
                  dark={scheme === "dark"}
                />
                <IconButton
                  icon={is3D ? "cube" : "cube-outline"}
                  active={is3D}
                  onPress={() => setIs3D((v) => !v)}
                  dark={scheme === "dark"}
                />
                {/* 定位按钮：当已在定位中心时不渲染 → 胶囊高度自适应收缩（有布局动画） */}
                {!isAtUser && (
                  <IconButton
                    icon="locate"
                    dark={scheme === "dark"}
                    onPress={() => {
                      if (!userLoc) return;
                      camRef.current?.setCamera({
                        centerCoordinate: [userLoc.lng, userLoc.lat],
                        zoomLevel: 12.5,
                        animationDuration: 600,
                      });
                    }}
                  />
                )}
              </View>
            </View>
          ) : null}

          </>
        ) : (
          <View style={styles.missingToken}>
            <Text style={styles.missingTokenText}>缺少 MAPBOX_TOKEN（请在 app.json 的 extra 中配置）。</Text>
          </View>
        )}
      </View>

      {/* ✅ 顶部雾化渐变：仅覆盖状态区附近，短条 */}
      <View pointerEvents="none" style={[styles.topOverlay, { height: insets.top + 12 }]}>
        <LinearGradient
          style={StyleSheet.absoluteFillObject}
          colors={[overlayTint, "rgba(255, 255, 255, 0)"]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 0.8 }}
        />
      </View>

      <BottomSheet
        ref={bsRef}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        enableOverDrag={false}
        topInset={topGapWanted}      // ✅ 避免视图上溢
        keyboardBehavior="interactive"      // ✅ iOS 键盘弹出时更稳定
        keyboardBlurBehavior="restore" 
        onAnimate={(_, __, position) => {
          if (position > brightThreshold && !isBright) setIsBright(true);
          else if (position <= brightThreshold && isBright) setIsBright(false);
        }}
        onChange={(i) => {
          setSheetIndex(i);
          if (i !== 2) Keyboard.dismiss(); // 不在第三段就收起键盘
        }}
        handleIndicatorStyle={styles.hiddenIndicator}
        backgroundStyle={{ backgroundColor: "transparent" }}
        bottomInset={bottomInset}
      >
      <BottomSheetView style={styles.sheetInner}>
        <BlurView
          tint={scheme === "dark" ? "dark" : "light"}
          intensity={40}  // 想更模糊可以调大，想更玻璃可以再调小
          style={[
            styles.sheetCard,
            { backgroundColor: colors.shellBG, borderColor: isBright ? cardBdr : colors.shellBORDER },
            colors.shellShadow,
          ]}
        >
          <View style={{ flex: 1 }}>
          <View style={styles.handleBar} />

        <View style={styles.searchWrap}>
          <View
            style={[
              styles.searchRow,
              {
                backgroundColor: fieldBg,
                borderColor: searchFocused ? (colors.searchBorderFocus ?? fieldBdr) : fieldBdr,
                borderWidth: StyleSheet.hairlineWidth,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.searchPlaceholder} style={styles.searchIcon} />

            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder={searchPlaceholder}
              placeholderTextColor={colors.searchPlaceholder}
              style={[styles.searchInput, { color: colors.iconLabel }]}
              returnKeyType="search"
              onSubmitEditing={onSubmitSearch}          // ④ 用键盘回车搜索
              onPressIn={() => {                        // ① 只有按下搜索栏才触发

              }}
                onPressOut={() => {
                // ✅ 用户手指离开屏幕才触发上滑到第三段
                if (sheetIndex !== 2) {
                  bsRef.current?.snapToIndex(2);
                  // 展开键盘（确保焦点）
                  inputRef.current?.focus();
                }
                setShowClear(true);
              }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              autoCorrect={false}
            />
          </View>

          {/* ① 只有按过搜索栏才出现 X（不是仅仅上滑） */}
          {showClear && (
            <TouchableOpacity
              onPress={() => {
                setQuery("");
                Keyboard.dismiss();
                setShowClear(false);                    // 收起后隐藏 X
                bsRef.current?.snapToIndex(0);
              }}
              activeOpacity={0.85}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              style={[
                styles.searchClearOutside,
                {
                  backgroundColor: fieldBg,             // ④ 胶囊底色 = 变亮后的搜索栏颜色
                  borderColor: cardBdr,
                },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.iconInactive} />
            </TouchableOpacity>
          )}
        </View>


        {/* ✅ 列表紧随搜索栏下方（整份列表在一张“中卡片”里） */}
        <View style={styles.listContainer}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator />
            </View>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {selectedGym && (
          <View style={[
            styles.detailCard,
            styles.detailCardHighlight,
            { backgroundColor: cardBg, borderColor: cardBdr }
          ]}>
            {/* 左侧高亮色条：主题色 */}
            <View style={[styles.detailStripe, { backgroundColor: primary }]} />

            <Text style={[styles.detailTitle, { color: cardTitle }]} numberOfLines={2}>
              {selectedGym.name}
            </Text>
            <Text style={[styles.detailMeta, { color: cardMeta }]}>
              {selectedGym.distanceMiles.toFixed(1)} mi
              {selectedGym.rating ? ` · ${selectedGym.rating} (${selectedGym.user_ratings_total ?? 0})` : ""}
            </Text>
            {(selectedGym.vicinity || selectedGym.formatted_address) && (
              <Text style={[styles.detailAddr, { color: cardMeta }]} numberOfLines={2}>
                {selectedGym.vicinity || selectedGym.formatted_address}
              </Text>
            )}

            {/* —— 按钮区 —— */}
            <View style={styles.detailActions}>
              {/* 主按钮：Get Directions（浅绿背景，图标+文字 = 主题色） */}
              <TouchableOpacity onPress={handleNavigate} activeOpacity={0.9}
                style={[styles.actionBase, styles.actionPrimary, { backgroundColor: primaryBg, borderColor: primaryBg }]}
              >
                <Ionicons name="navigate" size={18} color={primary} style={{ marginRight: 8 }} />
                <Text style={[styles.actionPrimaryText, { color: primary }]}>Get Directions</Text>
              </TouchableOpacity>

              {/* Close：同尺寸，右对齐 */}
              <TouchableOpacity onPress={() => setSelectedGym(null)} activeOpacity={0.9}
                style={[styles.actionBase, styles.actionGhost, { borderColor: cardBdr, marginLeft: "auto" }]}
              >
                <Text style={[styles.actionGhostText, { color: cardMeta }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}





          <View style={[styles.listCard, { backgroundColor: cardBg, borderColor: cardBdr }]}>
            <BottomSheetFlatList<GymPlace>
              ref={listRef}
              data={gyms}
              keyExtractor={(it: GymPlace) => it.place_id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }: { item: GymPlace }) => (
                <Pressable
                  onPress={() => {
                    setSelectedGym(item);
                    flyTo(item);
                  }}
                  android_ripple={{ color: "rgba(0,0,0,0.06)" }}
                  style={styles.rowItem}
                >
                  <Text style={[styles.rowTitle, { color: cardTitle }]} numberOfLines={1}>{item.name}</Text>
                  <Text style={[styles.rowMeta, { color: cardMeta }]} numberOfLines={1}>
                    {item.distanceMiles.toFixed(1)} mi
                    {item.rating ? ` · ${item.rating} (${item.user_ratings_total ?? 0})` : ""}
                  </Text>
                  {(item.vicinity || item.formatted_address) && (
                    <Text style={[styles.rowAddr, { color: cardMeta }]} numberOfLines={1}>
                      {item.vicinity || item.formatted_address}
                    </Text>
                  )}
                </Pressable>
              )}
              // —— 短横线分隔 —— //
              ItemSeparatorComponent={() => (
                <View style={[styles.rowDividerShort, { backgroundColor: cardBdr }]} />
              )}
              ListEmptyComponent={
                !loading && !error ? (
                  <Text style={[styles.emptyLabel, { color: colors.iconInactive }]}>
                    {center ? tr("附近没有匹配结果", "No gyms found nearby.")
                          : tr("等待定位或输入搜索关键字。", "Waiting for your location or a keyword…")}
                  </Text>
                ) : null
              }
              bounces={false}
              overScrollMode="never"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listCardContent}
            />
          </View>
        </View>
        </View>
        </BlurView>
      </BottomSheetView>

      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  mapWrapper: { flex: 1 },
  pin: {
    backgroundColor: "#2563EB",
    borderRadius: 999,
    padding: 6,
    borderWidth: 2,
    borderColor: "#fff",
  },
  controlColumn: { position: "absolute", right: 12 },
  controlCard: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: Platform.OS === "android" ? 8 : 0,
  },
  controlCardDark: { backgroundColor: "rgba(15,23,42,0.92)" },
  missingToken: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  missingTokenText: { color: "#ef4444", fontSize: 16, textAlign: "center" },

  topOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0,
    zIndex: 30,
    overflow: "hidden",
  },

  hiddenIndicator: { opacity: 0 },
  sheetBackground: { backgroundColor: "transparent" },
  sheetInner: { paddingHorizontal: FLOATING_TAB_BAR_GYMS_SIDE_MARGIN, paddingBottom: 0 },
  sheetCard: {
    borderRadius: 28,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 0, // ✅ 与浮动栏贴合
    overflow: "hidden",
  },
  handleBar: {
    alignSelf: "center",
    width: 46, height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(148,163,184,0.45)",
    marginBottom: 10,
  },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    // 不要额外的 marginBottom，保证与 FloatingTabBar 无缝
  },
  // ✅ 搜索栏在底部，底部圆角=0
  searchRow: {
    flex: 1,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 0, // ✅ 去除间距
  },
  searchIcon: { marginRight: 12 },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0 },
  searchAction: { marginLeft: 12 },
  searchButtonText: { fontWeight: "700", fontSize: 15 },

  searchClearOutside: {
    marginLeft: 8,              // ⬅️ 与搜索栏留一点间距；想更近就调小
    height: 48,
    width: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    // 不设背景，X 就是“在外面”视觉
  },
  listContainer: { flex: 1, paddingTop: 8 },
  hintText: { textAlign: "center", fontSize: 14 },
  loadingRow: { paddingVertical: 6 },
  errorText: { color: "#ef4444", marginBottom: 6, textAlign: "center" },
  listItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148,163,184,0.24)",
  },
  listTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  listMeta: { fontSize: 13, marginBottom: 2 },
  listAddress: { fontSize: 13 },
  emptyLabel: { paddingVertical: 12, textAlign: "center", fontSize: 13, color: "#64748b" },
  listContent: { paddingBottom: 14 },

  rowItem: {
    paddingVertical: 10,
    // 与大卡片内边距保持一致即可
  },
  rowTitle: { fontSize: 16, fontWeight: "700", marginBottom: 2 },
  rowMeta: { fontSize: 13, marginBottom: 2 },
  rowAddr: { fontSize: 13 },

  // 分隔线：整行横线（如果想短横线就把 width 改成 "32%" 并加 alignSelf: "center"）
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    alignSelf: "center",
    opacity: 0.8,
  },
  // 中卡片：承载整份列表
  listCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginTop: 8,
  },

  // 中卡片内部的 padding（给每一行留出横向内边距）
  listCardContent: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  // 短横线（在中卡片内居中，长度约三分之一）
  rowDividerShort: {
    height: 1,
    width: "100%",
    alignSelf: "center",

    opacity: 1,
    },
  detailTitle: { fontSize: 17, fontWeight: '800' },
  detailMeta: { fontSize: 13, marginTop: 2 },
  detailAddr: { fontSize: 13, marginTop: 2 },
  detailBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: 'rgba(37,99,235,0.08)',
  },
  detailBtnText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },

  detailCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  // 高亮：更明显的描边 + 阴影
  detailCardHighlight: {
    borderColor: "#93c5fd", // 浅蓝描边
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: Platform.OS === "android" ? 6 : 0,
  },
  // 左侧色条
  detailStripe: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: "#2563EB",
    opacity: 0.9,
  },

  // 导航按钮（主按钮）
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(37,99,235,0.10)", // 略更显眼
  },
  navBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
  },
  // —— 详情卡按钮区（缺失样式补齐）——
  detailActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  actionBase: {
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 14,
    minWidth: 150,
  },
  actionPrimary: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionPrimaryText: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionGhost: {
    backgroundColor: "transparent",
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionGhostText: {
    fontSize: 14,
    fontWeight: "700",
  },

});

// —— 右侧小图标按钮（图标版）——
function IconButton({
  icon,
  active,
  dark,
  onPress,
  ghost = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  dark?: boolean;
  onPress: () => void;
  ghost?: boolean;
}) {
  const bg = ghost
    ? "transparent"        // ← 透明背景
    : active
      ? (dark ? "rgba(59,130,246,0.22)" : "#e8eefc")
      : (dark ? "rgba(15,23,42,0.7)" : "white");
  const border = active ? (dark ? "rgba(148,197,255,0.6)" : "#93c5fd") : "transparent";
  const color = active ? "#2563EB" : dark ? "#E2E8F0" : "#1F2937";
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        width: 44, height: 44, borderRadius: 16,
        alignItems: "center", justifyContent: "center",
        backgroundColor: bg, borderWidth: active ? 1 : 0, borderColor: border,
      }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name={icon} size={22} color={color} />
    </TouchableOpacity>
  );
}
