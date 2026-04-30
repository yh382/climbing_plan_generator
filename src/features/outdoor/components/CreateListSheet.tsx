// src/features/outdoor/components/CreateListSheet.tsx
// TrueSheet for creating a new outdoor route list.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Keyboard,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useThemeColors } from "../../../lib/useThemeColors";
import { theme } from "../../../lib/theme";
import { useSettings } from "../../../contexts/SettingsContext";
import { outdoorListsApi } from "../listsApi";
import type { OutdoorList } from "../types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreated: (list: OutdoorList) => void;
  /** When provided, the sheet is in edit mode and saves via PATCH instead of POST. */
  editing?: OutdoorList;
};

export default function CreateListSheet({ visible, onClose, onCreated, editing }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && !isPresented.current) {
      sheetRef.current?.present();
      isPresented.current = true;
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setName(editing?.name ?? "");
      setDescription(editing?.description ?? "");
      setSaving(false);
    }
  }, [visible, editing]);

  const canSave = name.trim().length > 0 && !saving;
  const isEditing = !!editing;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
      };
      const saved = editing
        ? await outdoorListsApi.update(editing.id, payload)
        : await outdoorListsApi.create(payload);
      onCreated(saved);
    } catch (e: any) {
      const msg = e?.message ?? tr("保存失败", "Failed to save");
      Alert.alert(tr("保存失败", "Failed to save"), msg);
      setSaving(false);
    }
  };

  return (
    <TrueSheet
      ref={sheetRef}
      // Fixed detents (was ["auto"]) — auto-sizing combined with autoFocus-triggered
      // keyboard pushed the sheet above the safe area on some layouts. Fixed detents
      // keep the sheet anchored while ScrollView handles any overflow inside.
      detents={[0.6, 0.9]}
      backgroundColor={colors.sheetBackground}
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      dimmed
      onDidDismiss={() => {
        Keyboard.dismiss();
        isPresented.current = false;
        onClose();
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 20,
          paddingBottom: insets.bottom + 20,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>
          {isEditing ? tr("编辑清单", "Edit List") : tr("新建清单", "Create List")}
        </Text>

        <Text style={styles.label}>{tr("名称", "Name")}</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder={tr("例如:阳朔经典", "e.g. Yangshuo Classics")}
          placeholderTextColor={colors.textTertiary}
          style={styles.input}
          maxLength={120}
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
    </TrueSheet>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 18,
      color: c.textPrimary,
      textAlign: "center",
      marginBottom: 20,
    },
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
