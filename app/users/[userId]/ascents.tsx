// app/users/[userId]/ascents.tsx
// Window D1 — historical aggregated ascents for a user, reachable from
// Profile → followers/following row tap. Mirrors daily-summary's "other
// user" mode (readOnly when not self) and renders ClimbItemCard for each
// route-folded entry.

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { NativeSegmentedControl } from "../../../src/components/ui/NativeSegmentedControl";

import {
  HEADER_TRANSPARENT,
  NATIVE_HEADER_BASE,
  withHeaderTheme,
} from "@/lib/nativeHeaderOptions";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../../src/lib/useThemeColors";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { useUserStore } from "../../../src/store/useUserStore";
import { HeaderButton } from "../../../src/components/ui/HeaderButton";
import { ScrollEdgeFallback } from "@/components/shared/ScrollEdgeFallback";
import ClimbItemCard from "../../../src/components/shared/ClimbItemCard";
import { useUserAscents } from "../../../src/features/profile/hooks/useUserAscents";
import type {
  AscentsLocationFilter,
  AscentsWallFilter,
} from "../../../src/features/profile/types";
import { api } from "../../../src/lib/apiClient";

const LOCATION_OPTIONS: AscentsLocationFilter[] = ["all", "outdoor", "gym"];
const WALL_OPTIONS: AscentsWallFilter[] = ["all", "boulder", "rope"];

export default function UserAscentsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{ userId?: string; username?: string }>();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // iOS 26 floating header doesn't push content — pad the container by the
  // rendered header height so filter row + list don't slip under the status
  // bar. iOS<26 (HEADER_TRANSPARENT undefined) keeps the standard opaque
  // header that already eats into screen space, so no padding needed.
  const headerHeight = useHeaderHeight();
  const headerPad = HEADER_TRANSPARENT ? headerHeight : 0;

  const targetUserId = Array.isArray(params.userId) ? params.userId[0] : params.userId;
  const initialUsername = Array.isArray(params.username)
    ? params.username[0]
    : params.username;

  const currentUserId = useUserStore((s) => s.user?.id);
  const isSelf = !!targetUserId && targetUserId === currentUserId;

  const [locationType, setLocationType] = useState<AscentsLocationFilter>("all");
  const [wallType, setWallType] = useState<AscentsWallFilter>("all");
  const [resolvedUsername, setResolvedUsername] = useState<string | undefined>(
    initialUsername,
  );

  const {
    ascents,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
  } = useUserAscents(targetUserId, { locationType, wallType });

  // Best-effort lookup of the username when the route param doesn't include
  // it (e.g. deep-link). Falls back to the user_id substring.
  useEffect(() => {
    if (resolvedUsername || !targetUserId) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ username?: string; display_name?: string }>(
          `/profiles/${targetUserId}`,
        );
        if (!cancelled) {
          setResolvedUsername(data.display_name || data.username);
        }
      } catch {
        // Swallow — header just shows the fallback title.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [targetUserId, resolvedUsername]);

  useLayoutEffect(() => {
    navigation.setOptions({
      ...NATIVE_HEADER_BASE,
      ...withHeaderTheme(colors),
      headerShown: true,
      headerTransparent: HEADER_TRANSPARENT,
      scrollEdgeEffects: { top: "soft" },
      title: resolvedUsername || tr("攀爬记录", "Ascents"),
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
      headerRight: undefined,
    });
  }, [navigation, router, tr, colors, resolvedUsername]);

  const handleSelectLocation = useCallback((index: number) => {
    setLocationType(LOCATION_OPTIONS[index] ?? "all");
  }, []);

  const handleSelectWall = useCallback((value: AscentsWallFilter) => {
    setWallType(value);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: typeof ascents[number] }) => (
      <ClimbItemCard
        item={item}
        readOnly={!isSelf}
        onPress={() => {
          if (item.outdoor_route_id) {
            router.push({
              pathname: "/outdoor/outdoor-route-detail",
              params: { id: item.outdoor_route_id },
            });
            return;
          }
          if (item.gym_route_id) {
            router.push({
              pathname: "/gym/route/[routeId]",
              params: { routeId: item.gym_route_id },
            });
            return;
          }
        }}
      />
    ),
    [isSelf, router],
  );

  if (!targetUserId) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          {tr("用户 ID 缺失", "Missing user id")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: headerPad }]}>
      <View style={styles.filtersWrap}>
        <NativeSegmentedControl
          options={[
            tr("全部", "All"),
            tr("户外", "Outdoor"),
            tr("室内", "Gym"),
          ]}
          selectedIndex={LOCATION_OPTIONS.indexOf(locationType)}
          onSelect={handleSelectLocation}
          style={styles.segment}
        />
        <View style={styles.pillRow}>
          {WALL_OPTIONS.map((opt) => {
            const active = opt === wallType;
            const label =
              opt === "all"
                ? tr("全部", "All")
                : opt === "boulder"
                ? tr("抱石", "Boulder")
                : tr("绳索", "Rope");
            return (
              <TouchableOpacity
                key={opt}
                onPress={() => handleSelectWall(opt)}
                activeOpacity={0.7}
                style={[
                  styles.pill,
                  active ? styles.pillActive : styles.pillInactive,
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    active ? styles.pillTextActive : styles.pillTextInactive,
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.textPrimary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {tr("加载失败，下拉重试", "Failed to load. Pull to retry.")}
          </Text>
        </View>
      ) : ascents.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>
            {tr("还没有公开的攀爬记录", "No public ascents yet")}
          </Text>
        </View>
      ) : (
        <ScrollEdgeFallback>
          <FlatList
            data={ascents}
            keyExtractor={(it) => it.routeKey}
            renderItem={renderItem}
            contentContainerStyle={{ paddingTop: 8, paddingBottom: 80 }}
            contentInsetAdjustmentBehavior="automatic"
            onEndReachedThreshold={0.4}
            onEndReached={() => {
              if (hasMore && !loadingMore) loadMore();
            }}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.textTertiary} />
                </View>
              ) : null
            }
          />
        </ScrollEdgeFallback>
      )}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    },
    emptyText: { color: c.textSecondary, fontSize: 14 },
    filtersWrap: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 10,
      backgroundColor: c.background,
    },
    segment: { width: "100%" },
    pillRow: { flexDirection: "row", gap: 8 },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 14,
    },
    pillActive: { backgroundColor: c.pillBackground },
    pillInactive: {
      backgroundColor: c.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: c.cardBorder,
    },
    pillText: { fontSize: 13, fontFamily: theme.fonts.medium },
    pillTextActive: { color: c.pillText },
    pillTextInactive: { color: c.textSecondary },
    footerLoader: { paddingVertical: 16, alignItems: "center" },
  });
