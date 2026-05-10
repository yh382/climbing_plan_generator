// app/outdoor-create-list.tsx
// Native iOS formSheet route for creating a new outdoor route list.
// Migrated from src/features/outdoor/components/CreateListSheet.tsx
// (sheet-container-audit A1). Calls outdoorListsApi.create directly; on
// success writes the new list into useOutdoorSheetHandoffStore so callers
// (ListsSection / AddToListSheet) can react.

import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRouter } from "expo-router";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import { useSettings } from "@/contexts/SettingsContext";
import { outdoorListsApi } from "@/features/outdoor/listsApi";
import useOutdoorSheetHandoffStore from "@/store/useOutdoorSheetHandoffStore";

export default function OutdoorCreateListRoute() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const setLastCreatedList = useOutdoorSheetHandoffStore((s) => s.setLastCreatedList);
  const editingList = useOutdoorSheetHandoffStore((s) => s.editingList);
  const setEditingList = useOutdoorSheetHandoffStore((s) => s.setEditingList);
  const setLastUpdatedList = useOutdoorSheetHandoffStore((s) => s.setLastUpdatedList);

  const isEditing = !!editingList;

  const [name, setName] = useState(editingList?.name ?? "");
  const [description, setDescription] = useState(editingList?.description ?? "");
  const [saving, setSaving] = useState(false);

  // setOptions merges with parent _layout options (unlike <Stack.Screen options>
  // which REPLACES in this Expo Router version, blowing away presentation:"formSheet").
  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      title: isEditing ? tr("编辑清单", "Edit List") : tr("新建清单", "Create List"),
    });
  }, [navigation, isEditing, tr]);

  // Clear the editing slot when the route unmounts so a subsequent push without
  // a fresh setEditingList(...) renders the create mode.
  useEffect(() => {
    return () => {
      setEditingList(null);
    };
  }, [setEditingList]);

  const canSave = name.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
      };
      if (editingList) {
        const updated = await outdoorListsApi.update(editingList.id, payload);
        setLastUpdatedList(updated);
      } else {
        const saved = await outdoorListsApi.create(payload);
        setLastCreatedList(saved);
      }
      router.back();
    } catch (e: any) {
      const msg = e?.message ?? tr("保存失败", "Failed to save");
      Alert.alert(tr("保存失败", "Failed to save"), msg);
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.background }}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: insets.bottom + 20,
          paddingTop: 8,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>{tr("名称", "Name")}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={tr("例如:阳朔经典", "e.g. Yangshuo Classics")}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          maxLength={120}
          autoFocus
        />

        <Text style={styles.label}>{tr("简介 (可选)", "Description (optional)")}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={tr("简单描述这个清单", "What's this list about?")}
          placeholderTextColor={colors.textTertiary}
          style={[styles.input, { height: 72, textAlignVertical: "top" }]}
          multiline
        />

        <Text style={styles.visFooter}>
          {tr(
            "清单的可见性在「设置 → 隐私 → 我的清单」中统一管理。",
            "List visibility is managed globally via Settings → Privacy → My Lists.",
          )}
        </Text>

        <TouchableOpacity
          style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          {saving ? (
            <ActivityIndicator color={colors.pillText} />
          ) : (
            <Text style={[styles.saveText, !canSave && { color: colors.textTertiary }]}>
              {tr("保存", "Save")}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    label: {
      fontFamily: theme.fonts.medium,
      fontSize: 12,
      color: c.textTertiary,
      marginTop: 12,
      marginBottom: 6,
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    input: {
      backgroundColor: c.sheetCardBackground,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: theme.fonts.regular,
      fontSize: 15,
      color: c.textPrimary,
    },
    visFooter: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textTertiary,
      marginTop: 16,
      lineHeight: 17,
    },
    saveBtn: {
      marginTop: 20,
      height: 52,
      backgroundColor: c.pillBackground,
      borderRadius: 26,
      alignItems: "center",
      justifyContent: "center",
    },
    saveBtnDisabled: { backgroundColor: c.sheetCardBackground },
    saveText: {
      color: c.pillText,
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
  });
