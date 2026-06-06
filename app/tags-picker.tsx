// app/tags-picker.tsx
// Tags multi-select formSheet — Selected row + Available presets row
// + "Add New +" inline-input pill.
//
// Convention: matches outdoor-create-list / session-log-workout /
// outdoor-beta-share — the app's other formSheet routes. ScrollView is
// the route's direct root (no wrapper view — UIKit's formSheet collapses
// extra `<View flex:1>` wrappers at the large detent, see
// recent-climbs.tsx). Save button lives at the bottom of the ScrollView
// as a filled accent pill, the same shape outdoor-create-list uses.
//
// FRONTEND_MAP §A1 Variant 2 handoff:
//   caller →  setRequest({ targetId, initial, presets }) + router.push
//   route  →  reads request as initial draft + writes result on Save
//   caller →  useEffect on result; consume + clear

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import useTagsPickerHandoffStore from "../src/store/useTagsPickerHandoffStore";
import { formatTagLabel } from "../src/features/workouts/constants";

// Apple HIG: small visible pills (~28pt) need hitSlop so the
// effective tap zone meets the 44pt minimum touch target.
const SMALL_PILL_HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };

// 5-color palette — climbing-themed, drawn from app's existing
// accent / grade / CSM hues so a new entry doesn't introduce a
// foreign tint. Per UX review we deliberately keep this short
// (vs Motra's ~10 swatches) — fewer choices = faster decision.
const TAG_COLOR_PALETTE: { hex: string; nameZh: string; nameEn: string }[] = [
  { hex: "#306E6F", nameZh: "主青", nameEn: "Accent" },
  { hex: "#5D9080", nameZh: "中绿", nameEn: "Forest" },
  { hex: "#A08060", nameZh: "暖棕", nameEn: "Warm Sand" },
  { hex: "#D97706", nameZh: "南瓜橙", nameEn: "Squash" },
  { hex: "#8B6F5C", nameZh: "暖灰棕", nameEn: "Driftwood" },
];
const DEFAULT_TAG_COLOR = TAG_COLOR_PALETTE[0].hex;

export default function TagsPickerRoute() {
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr, lang } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const request = useTagsPickerHandoffStore((s) => s.request);
  const setResult = useTagsPickerHandoffStore((s) => s.setResult);

  // Lifecycle ownership (FRONTEND_MAP §A1): route owns the output slot,
  // clears on unmount so an unconsumed write doesn't leak into the next
  // push of this same route.
  useEffect(() => () => setResult(null), [setResult]);

  // Local draft — seeded from the request slot on mount.
  const [selected, setSelected] = useState<string[]>(
    () => request?.initial ?? [],
  );
  const [drafting, setDrafting] = useState(false);
  const [draftText, setDraftText] = useState("");
  const [color, setColor] = useState<string>(
    () => request?.initialColor ?? DEFAULT_TAG_COLOR,
  );

  const presets = request?.presets ?? [];

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tr("添加标签", "Add Tags"),
    });
  }, [navigation, tr]);

  const handleDone = useCallback(() => {
    setResult({
      targetId: request?.targetId ?? "template",
      tags: selected,
      color,
    });
    router.back();
  }, [selected, color, request?.targetId, router, setResult]);

  const togglePreset = useCallback((slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((x) => x !== slug) : [...prev, slug],
    );
  }, []);

  const removeTag = useCallback((tag: string) => {
    setSelected((prev) => prev.filter((x) => x !== tag));
  }, []);

  const commitDraft = useCallback(() => {
    const t = draftText.trim().toLowerCase().replace(/\s+/g, "_");
    if (!t) {
      setDrafting(false);
      return;
    }
    setSelected((prev) => (prev.includes(t) ? prev : [...prev, t]));
    setDraftText("");
    setDrafting(false);
  }, [draftText]);

  const availablePresets = useMemo(
    () => presets.filter((p) => !selected.includes(p)),
    [presets, selected],
  );

  const label = (slug: string) =>
    formatTagLabel(slug, lang === "zh" ? "zh" : "en");

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.sectionLabel}>
        {tr("已选标签", "Selected Tags")}
      </Text>
      {selected.length === 0 ? (
        <Text style={styles.emptyText}>{tr("尚未选择", "None yet")}</Text>
      ) : (
        <View style={styles.pillRow}>
          {selected.map((t) => (
            <TouchableOpacity
              key={t}
              style={[
                styles.pill,
                styles.pillActive,
                { backgroundColor: color, borderColor: color },
              ]}
              onPress={() => removeTag(t)}
              hitSlop={SMALL_PILL_HIT_SLOP}
              accessibilityRole="button"
              accessibilityState={{ selected: true }}
              accessibilityLabel={label(t)}
            >
              <Text style={[styles.pillText, styles.pillTextActive]}>
                {label(t)}
              </Text>
              <Ionicons name="close" size={13} color="#FFF" />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Color section — five-swatch palette. Drives the background
          of selected pills above and propagates back to the caller
          (Template Builder) via TagsPickerResult.color. */}
      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
        {tr("标签颜色", "Tag Color")}
      </Text>
      <View style={styles.swatchRow}>
        {TAG_COLOR_PALETTE.map((c) => {
          const isOn = color === c.hex;
          return (
            <TouchableOpacity
              key={c.hex}
              onPress={() => setColor(c.hex)}
              hitSlop={SMALL_PILL_HIT_SLOP}
              accessibilityRole="radio"
              accessibilityState={{ selected: isOn }}
              accessibilityLabel={lang === "zh" ? c.nameZh : c.nameEn}
              style={[
                styles.swatch,
                { backgroundColor: c.hex },
                isOn && styles.swatchActive,
              ]}
            >
              {isOn ? (
                <Ionicons name="checkmark" size={16} color="#FFF" />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={[styles.sectionLabel, { marginTop: 24 }]}>
        {tr("可选标签", "Available Tags")}
      </Text>
      <View style={styles.pillRow}>
        {availablePresets.map((slug) => (
          <TouchableOpacity
            key={slug}
            style={styles.pill}
            onPress={() => togglePreset(slug)}
            hitSlop={SMALL_PILL_HIT_SLOP}
            accessibilityRole="button"
            accessibilityState={{ selected: false }}
            accessibilityLabel={label(slug)}
          >
            <Text style={styles.pillText}>{label(slug)}</Text>
          </TouchableOpacity>
        ))}
        {drafting ? (
          <View style={[styles.pill, styles.pillDrafting]}>
            <TextInput
              autoFocus
              style={styles.pillInput}
              value={draftText}
              onChangeText={setDraftText}
              placeholder={tr("新标签", "tag name")}
              placeholderTextColor={colors.textTertiary}
              onSubmitEditing={commitDraft}
              returnKeyType="done"
            />
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.pill, styles.pillDashed]}
            onPress={() => setDrafting(true)}
            accessibilityRole="button"
            accessibilityLabel={tr("添加新标签", "Add New")}
          >
            <Text style={styles.pillText}>
              {tr("添加新标签", "Add New")}
            </Text>
            <Ionicons name="add" size={13} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Save button — filled accent pill at the bottom of the
          ScrollView. Matches outdoor-create-list / session-log-workout
          conventions: in formSheet routes the action button lives
          inside the body, not in the toolbar. */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={handleDone}
        accessibilityRole="button"
        accessibilityLabel={tr("完成", "Done")}
      >
        <Ionicons name="checkmark" size={20} color="#FFF" />
        <Text style={styles.saveText}>{tr("完成", "Done")}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    sectionLabel: {
      paddingHorizontal: 16,
      marginTop: 8,
      marginBottom: 10,
      fontSize: 12,
      letterSpacing: 1,
      textTransform: "uppercase",
      color: colors.textTertiary,
      fontFamily: theme.fonts.bold,
      fontWeight: "700",
    },
    emptyText: {
      paddingHorizontal: 16,
      fontSize: 13,
      color: colors.textTertiary,
      fontFamily: theme.fonts.regular,
    },
    pillRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      paddingHorizontal: 16,
    },
    swatchRow: {
      flexDirection: "row",
      gap: 14,
      paddingHorizontal: 16,
    },
    swatch: {
      width: 32,
      height: 32,
      borderRadius: 999,
      alignItems: "center",
      justifyContent: "center",
    },
    swatchActive: {
      borderWidth: 2,
      borderColor: "#FFF",
    },
    pill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      borderWidth: 0.5,
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.cardDark,
      borderColor: colors.cardDark,
    },
    pillDrafting: {
      borderColor: colors.accent,
    },
    pillDashed: {
      borderStyle: "dashed",
    },
    pillText: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      fontWeight: "600",
      color: colors.textSecondary,
    },
    pillTextActive: {
      color: "#FFF",
    },
    pillInput: {
      fontSize: 13,
      fontFamily: theme.fonts.medium,
      minWidth: 80,
      padding: 0,
      color: colors.textPrimary,
    },
    saveBtn: {
      marginTop: 32,
      marginHorizontal: 16,
      paddingVertical: 14,
      borderRadius: 999,
      backgroundColor: colors.accent,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    saveText: {
      color: "#FFF",
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      fontWeight: "800",
    },
  });
