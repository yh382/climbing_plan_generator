// app/library/my-templates.tsx
// Full "Saved Templates" list — opened from the My Templates section
// header's "View All" link. Mirrors the Motra Saved Templates screen:
//   - search bar
//   - chip filter [Mine | Official]
//   - vertical rows with cover thumbnail + title + summary line
//   - native header + button (Add Template / Add Plan)

import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import useWorkoutTemplateStore from "../../src/features/workouts/store/useWorkoutTemplateStore";
import type { WorkoutTemplateSummary } from "../../src/features/workouts/types";
import { formatTagLabel } from "../../src/features/workouts/constants";

type Chip = "mine" | "official";

export default function MyTemplatesRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { tr, lang } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    myList,
    officialList,
    isLoadingMine,
    isLoadingOfficial,
    fetchMine,
    fetchOfficial,
  } = useWorkoutTemplateStore();

  const [chip, setChip] = useState<Chip>("mine");
  const [query, setQuery] = useState("");

  useFocusEffect(
    useCallback(() => {
      fetchMine();
      fetchOfficial();
    }, [fetchMine, fetchOfficial]),
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: tr("我的模板", "My Templates"),
    });
  }, [navigation, tr]);

  const mineEmptyFallback =
    chip === "mine" && !isLoadingMine && myList.length === 0;
  const list = chip === "official" || mineEmptyFallback ? officialList : myList;
  const loading =
    chip === "official" || mineEmptyFallback ? isLoadingOfficial : isLoadingMine;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.goal_tags.some((g) => g.toLowerCase().includes(q)),
    );
  }, [list, query]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: 32 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* TR4b-2: native UIMenu popover anchored to the toolbar +. */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="plus">
          <Stack.Toolbar.MenuAction
            icon="doc.text"
            onPress={() => router.push("/library/template-builder" as any)}
          >
            {tr("新建模板", "Add Template")}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="calendar"
            onPress={() => router.push("/library/plan-builder" as any)}
          >
            {tr("新建计划", "Add Plan")}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          value={query}
          onChangeText={setQuery}
          placeholder={tr("搜索…", "Search")}
          placeholderTextColor={colors.textTertiary}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      <View style={styles.chipRow}>
        {(["mine", "official"] as Chip[]).map((c) => {
          const active = c === chip;
          return (
            <TouchableOpacity
              key={c}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => setChip(c)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={
                c === "mine"
                  ? tr("我的模板", "My Templates")
                  : tr("官方模板", "Official Templates")
              }
            >
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
              >
                {c === "mine" ? tr("我的", "Mine") : tr("官方", "Official")}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {mineEmptyFallback ? (
        <Text style={styles.fallbackHint}>
          {tr(
            "保存官方模板以建立你的库",
            "Save official templates to build your library",
          )}
        </Text>
      ) : null}

      {loading && filtered.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            {tr("没有匹配项", "No matches")}
          </Text>
        </View>
      ) : (
        filtered.map((t) => (
          <TemplateRow
            key={t.id}
            template={t}
            tr={tr}
            lang={lang === "zh" ? "zh" : "en"}
            colors={colors}
            styles={styles}
            onPress={() =>
              router.push({
                pathname: "/template/[id]",
                params: { id: t.id },
              } as any)
            }
            onLongPress={
              chip === "mine" && !mineEmptyFallback
                ? () =>
                    router.push({
                      pathname: "/library/template-builder",
                      params: { templateId: t.id },
                    } as any)
                : undefined
            }
          />
        ))
      )}
    </ScrollView>
  );
}

function TemplateRow({
  template,
  tr,
  lang,
  colors,
  styles,
  onPress,
  onLongPress,
}: {
  template: WorkoutTemplateSummary;
  tr: (zh: string, en: string) => string;
  lang: "zh" | "en";
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const goal = template.goal_tags[0]
    ? formatTagLabel(template.goal_tags[0], lang)
    : null;
  const duration = template.est_duration_min
    ? `${template.est_duration_min} min`
    : null;
  const meta = [duration, goal].filter(Boolean).join(" · ");

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="button"
      accessibilityLabel={template.title}
    >
      {template.cover_image_url ? (
        <Image
          source={{ uri: template.cover_image_url }}
          style={styles.rowThumb}
        />
      ) : (
        <View style={[styles.rowThumb, styles.rowThumbFallback]}>
          <Ionicons name="barbell" size={20} color={colors.textSecondary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {template.title}
        </Text>
        {meta ? (
          <Text style={styles.rowMeta} numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={colors.textTertiary}
      />
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    searchWrap: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    search: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.textPrimary,
      fontFamily: theme.fonts.regular,
    },
    chipRow: {
      flexDirection: "row",
      gap: 8,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.cardDark,
      borderColor: colors.cardDark,
    },
    chipText: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: "#FFF",
      fontWeight: "700",
    },
    fallbackHint: {
      paddingHorizontal: 16,
      marginBottom: 8,
      fontSize: 12,
      color: colors.textTertiary,
      fontFamily: theme.fonts.regular,
    },
    loadingBox: { paddingVertical: 24, alignItems: "center" },
    empty: { padding: 32, alignItems: "center" },
    emptyText: {
      color: colors.textTertiary,
      fontFamily: theme.fonts.regular,
      fontSize: 14,
    },
    row: {
      marginHorizontal: 16,
      marginBottom: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: theme.borderRadius.card,
    },
    rowThumb: {
      width: 52,
      height: 52,
      borderRadius: 10,
      backgroundColor: colors.background,
    },
    rowThumbFallback: {
      alignItems: "center",
      justifyContent: "center",
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
  });
