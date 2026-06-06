// app/exercise-picker.tsx
// Multi-select exercise picker formSheet.
//
// Sheet chrome convention (matches every other formSheet route in the
// repo — recent-climbs / body-info / csm-help / outdoor-create-list /
// etc.): native UIKit nav bar with X close on the left, title in the
// center, and a native UISearchBar embedded via
// `navigation.setOptions({ headerSearchBarOptions })`. Letting UIKit
// own the chrome means contentInsetAdjustmentBehavior="automatic" on
// the FlatList lays out the list rows below both the nav bar and the
// search bar correctly — without any hand-tuned padding.
//
// Two modes (controlled by request.singleSelect):
//   - multi (default): user picks N exercises with checkbox rows.
//     Bottom "Add Exercise (n)" CTA appears ONLY when ≥ 1 selected
//     and floats over the list (iOS Photos / Files pattern).
//   - single:          tap a row immediately writes a 1-element array
//     and pops the sheet (for "swap action_id" on an existing row).

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import {
  exercisesApi,
  type ExerciseListItem,
} from "../src/features/exercises/api";
import useExercisePickerHandoffStore from "../src/store/useExercisePickerHandoffStore";

export default function ExercisePickerRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr, lang } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const request = useExercisePickerHandoffStore((s) => s.request);
  const setResult = useExercisePickerHandoffStore((s) => s.setResult);
  const singleSelect = request?.singleSelect ?? false;

  // Lifecycle ownership (FRONTEND_MAP §A1): route owns the output slot.
  useEffect(() => () => setResult(null), [setResult]);

  const [items, setItems] = useState<ExerciseListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Set<string>>(new Set());

  // Native title + native UISearchBar. setOptions is the merge-friendly
  // path (in-screen <Stack.Screen options> REPLACES rather than merges
  // and would clobber the root formSheet config — same trap recorded
  // in FRONTEND_MAP).
  // Title only — the native `headerSearchBarOptions` UISearchController
  // is unreliable inside a UISheetPresentationController (real-world
  // symptoms observed: typing doesn't fire onChangeText, and on
  // focus/blur the underlying FlatList disappears and doesn't recover).
  // The route renders its own iOS-style search pill as the FlatList's
  // sticky header instead — same approach the rest of the app's
  // formSheet routes take.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: tr("动作库", "Exercise Library"),
    });
  }, [navigation, tr]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await exercisesApi.listExercises({ activeOnly: true });
        if (!alive) return;
        setItems(list);
      } catch (e: any) {
        if (!alive) return;
        setError(e?.message ?? tr("载入失败", "Failed to load"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tr]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      return (
        it.id.toLowerCase().includes(q) ||
        it.name_en.toLowerCase().includes(q) ||
        it.name_zh.toLowerCase().includes(q) ||
        it.goal.toLowerCase().includes(q)
      );
    });
  }, [items, query]);

  const togglePick = useCallback(
    (item: ExerciseListItem) => {
      if (singleSelect) {
        setResult({
          targetId: request?.targetId ?? "*",
          exercises: [item],
        });
        router.back();
        return;
      }
      setPicked((prev) => {
        const next = new Set(prev);
        if (next.has(item.id)) next.delete(item.id);
        else next.add(item.id);
        return next;
      });
    },
    [singleSelect, request?.targetId, router, setResult],
  );

  const handleAdd = useCallback(() => {
    if (picked.size === 0) return;
    const list = items.filter((it) => picked.has(it.id));
    setResult({
      targetId: request?.targetId ?? "*",
      exercises: list,
    });
    router.back();
  }, [picked, items, request?.targetId, router, setResult]);

  const openDetail = useCallback(
    (item: ExerciseListItem) => {
      router.push({
        pathname: "/library/exercise-detail",
        params: { exerciseId: item.id, context: "library" },
      } as any);
    },
    [router],
  );

  const renderThumb = useCallback(
    (item: ExerciseListItem) => {
      const initial = (lang === "zh" ? item.name_zh : item.name_en).charAt(0);
      return (
        <TouchableOpacity
          style={styles.thumb}
          onPress={() => openDetail(item)}
          accessibilityRole="button"
          accessibilityLabel={`${lang === "zh" ? item.name_zh : item.name_en} ${tr("详情", "details")}`}
        >
          <Text style={styles.thumbInitial}>{initial}</Text>
        </TouchableOpacity>
      );
    },
    [lang, openDetail, styles.thumb, styles.thumbInitial, tr],
  );

  // CTA visibility: hidden when nothing selected (iOS Photos / Files /
  // Mail multi-select pattern). Once ≥ 1 exercise checked, a native
  // checkmark UIBarButtonItem appears in the nav bar top-right. This
  // mirrors the template-builder Save button and avoids the
  // bottom-CTA-vs-keyboard fight when the search field is focused.
  const showCta = !singleSelect && picked.size > 0;

  // Important: NO wrapping `<View style={{flex:1}}>` between the route
  // and the FlatList. UIKit's formSheet collapses such wrappers to 0pt
  // at the large detent (documented behaviour, see recent-climbs.tsx
  // header comment). The FlatList is the route's root scrollable; the
  // loading / error / empty branches all live inside it via
  // ListEmptyComponent so we never need a wrapper.
  const ListEmpty = () => {
    if (loading) {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }
    return (
      <View style={styles.centerBox}>
        <Text style={styles.emptyText}>
          {tr("没有匹配项", "No matches")}
        </Text>
      </View>
    );
  };

  return (
    <>
      {showCta ? (
        <Stack.Toolbar placement="right">
          {/* `variant="prominent"` is the iOS 26 native UIBarButtonItem
              style — the entire item background fills with `tintColor`
              (glass-tinted), the icon renders on top in the canvas
              color. Apple's API:
              https://developer.apple.com/documentation/uikit/uibarbuttonitem/style-swift.property
              Pre-iOS-26 silently falls back to plain (icon-only) — no
              crash, just no fill. */}
          <Stack.Toolbar.Button
            icon="checkmark"
            onPress={handleAdd}
            variant="prominent"
            tintColor={colors.accent}
          />
        </Stack.Toolbar>
      ) : null}

      <FlatList
        style={{ flex: 1, backgroundColor: colors.background }}
        data={loading || error ? [] : filtered}
        keyExtractor={(it) => it.id}
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListHeaderComponent={
          <View style={styles.searchWrap}>
            <Ionicons
              name="search"
              size={16}
              color={colors.textTertiary}
              style={{ marginRight: 6 }}
            />
            <TextInput
              style={styles.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder={tr("搜索动作", "Search exercises")}
              placeholderTextColor={colors.textTertiary}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        }
        ListEmptyComponent={ListEmpty}
        renderItem={({ item }) => {
          const selected = picked.has(item.id);
          return (
            <TouchableOpacity
              style={styles.row}
              onPress={() => togglePick(item)}
              accessibilityRole={singleSelect ? "button" : "checkbox"}
              accessibilityState={singleSelect ? undefined : { checked: selected }}
              accessibilityLabel={lang === "zh" ? item.name_zh : item.name_en}
            >
              {renderThumb(item)}
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {lang === "zh" ? item.name_zh : item.name_en}
                </Text>
                {item.muscles.length > 0 ? (
                  <Text style={styles.rowMeta} numberOfLines={1}>
                    {item.muscles.slice(0, 3).join(" · ")}
                  </Text>
                ) : null}
              </View>
              {singleSelect ? (
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textTertiary}
                />
              ) : (
                <View
                  style={[
                    styles.checkbox,
                    selected && styles.checkboxSelected,
                  ]}
                >
                  {selected ? (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                  ) : null}
                </View>
              )}
            </TouchableOpacity>
          );
        }}
      />
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    centerBox: {
      flex: 1,
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    errorText: {
      color: colors.textSecondary,
      fontFamily: theme.fonts.regular,
      fontSize: 14,
    },
    emptyText: {
      color: colors.textTertiary,
      fontFamily: theme.fonts.regular,
      fontSize: 14,
    },

    row: {
      paddingHorizontal: 16,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    thumb: {
      width: 60,
      height: 60,
      borderRadius: 12,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    thumbInitial: {
      fontSize: 24,
      fontFamily: theme.fonts.black,
      color: colors.textSecondary,
    },
    rowTitle: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    rowMeta: {
      marginTop: 3,
      fontSize: 12,
      color: colors.textSecondary,
      fontFamily: theme.fonts.medium,
    },
    checkbox: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
    },
    checkboxSelected: {
      backgroundColor: colors.cardDark,
      borderColor: colors.cardDark,
    },
    // iOS-style search pill — mirrors UISearchBar's appearance so the
    // user reads it as system search without our needing to host an
    // actual UISearchController (which doesn't behave inside the sheet).
    searchWrap: {
      flexDirection: "row",
      alignItems: "center",
      marginHorizontal: 16,
      marginTop: 8,
      marginBottom: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.backgroundSecondary,
    },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontFamily: theme.fonts.regular,
      padding: 0,
    },
  });
