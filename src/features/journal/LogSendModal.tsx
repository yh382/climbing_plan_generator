import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { NativeSegmentedControl } from "@/components/ui/NativeSegmentedControl";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { consumePendingMedia } from "@/features/community/pendingMedia";
import type { LogMedia } from "./loglist/types";
import type { PickedMediaItem } from "@/features/community/types";

export type SendStyle = "redpoint" | "onsight" | "flash";
export type Feel = "soft" | "solid" | "hard";

export type LogSendDraft = {
  style: SendStyle;
  attempts: number;
  feel: Feel;
  name: string;
  note: string;
  media?: LogMedia[];
};

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  onDone: (draft: LogSendDraft) => void | Promise<void>;
  tr?: (zh: string, en: string) => string;
};

const LOG_MAX_MEDIA = 5;

const STYLE_OPTIONS = ["Redpoint", "Onsight", "Flash"];
const STYLE_KEYS: SendStyle[] = ["redpoint", "onsight", "flash"];

function toLogMedia(item: PickedMediaItem): LogMedia {
  return { id: item.id, type: item.mediaType, uri: item.uri };
}

export default function LogSendModal({ visible, title, onClose, onDone, tr }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useMemo(() => tr ?? ((_zh: string, en: string) => en), [tr]);
  const router = useRouter();
  const sheetRef = useRef<TrueSheet>(null);

  const [style, setStyle] = useState<SendStyle>("redpoint");
  const [attempts, setAttempts] = useState(1);
  const [feel, setFeel] = useState<Feel>("solid");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [mediaItems, setMediaItems] = useState<LogMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Present/dismiss based on visible prop
  useEffect(() => {
    if (visible) {
      sheetRef.current?.present();
      setStyle("redpoint");
      setAttempts(1);
      setFeel("solid");
      setName("");
      setNote("");
      setMediaItems([]);
    } else {
      sheetRef.current?.dismiss();
    }
  }, [visible]);

  // Consume pending media when screen regains focus (back from picker)
  useFocusEffect(
    useCallback(() => {
      const items = consumePendingMedia();
      if (items && items.length > 0) {
        setMediaItems((prev) => [...prev, ...items.map(toLogMedia)].slice(0, LOG_MAX_MEDIA));
      }
      // Re-present sheet if visible (returning from media picker)
      if (visible) {
        sheetRef.current?.present();
      }
    }, [visible])
  );

  const handleStyleChange = (newStyle: SendStyle) => {
    setStyle(newStyle);
    if (newStyle !== "redpoint") {
      setAttempts(1);
    }
  };

  const feelCycle = (dir: -1 | 1) => {
    const order: Feel[] = ["soft", "solid", "hard"];
    const idx = order.indexOf(feel);
    setFeel(order[(idx + dir + order.length) % order.length]);
  };

  const handleAddMedia = () => {
    router.push("/community/device-media-picker" as any);
  };

  const handleDone = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const finalAttempts = style === "redpoint" ? attempts : 1;
      await Promise.resolve(
        onDone({ style, attempts: finalAttempts, feel, name, note, media: mediaItems.length > 0 ? mediaItems : undefined })
      );
    } finally {
      setSubmitting(false);
    }
  };

  const showAttempts = style === "redpoint";

  return (
    <TrueSheet
      ref={sheetRef}
      detents={["auto"]}
      dimmed
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      backgroundColor={colors.background}
      onDidDismiss={() => onClose()}
    >
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.content, { paddingBottom: insets.bottom + 14 }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={() => sheetRef.current?.dismiss()} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Media button */}
          <TouchableOpacity activeOpacity={0.9} style={styles.mediaBtn} onPress={handleAddMedia}>
            {mediaItems.length > 0 ? (
              <Image source={{ uri: mediaItems[0].uri }} style={styles.mediaTile} />
            ) : (
              <View style={styles.mediaTile}>
                <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                <View style={styles.mediaPlus}>
                  <Ionicons name="add" size={12} color={colors.textPrimary} />
                </View>
              </View>
            )}
          </TouchableOpacity>

          {/* Route Name */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>{t("路线名称", "Route Name")}</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={t("例如：蓝色大斜板", "e.g. Blue slab project")}
              placeholderTextColor={colors.textTertiary}
              style={styles.input}
            />
          </View>

          {/* Style — NativeSegmentedControl */}
          <View style={styles.section}>
            <Text style={styles.fieldLabel}>{t("方式", "Style")}</Text>
            <NativeSegmentedControl
              options={STYLE_OPTIONS}
              selectedIndex={STYLE_KEYS.indexOf(style)}
              onSelect={(idx) => handleStyleChange(STYLE_KEYS[idx])}
              style={{ marginTop: 4 }}
            />
          </View>

          {/* Attempts & Feel */}
          <View style={{ marginTop: 12 }}>
            {showAttempts ? (
              <View style={styles.card}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardTitle}>{t("尝试次数", "Attempts")}</Text>
                  <View style={styles.stepperRowCompact}>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setAttempts((a) => Math.max(1, a - 1))}
                      style={styles.stepBtnCompact}
                    >
                      <Ionicons name="remove" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.stepValueCompact}>{attempts}</Text>
                    <TouchableOpacity
                      activeOpacity={0.7}
                      onPress={() => setAttempts((a) => a + 1)}
                      style={styles.stepBtnCompact}
                    >
                      <Ionicons name="add" size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : null}

            <View style={styles.card}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>{t("感觉如何？", "How did it feel?")}</Text>
                <View style={styles.feelRowCompact}>
                  <TouchableOpacity style={styles.stepBtnCompact} activeOpacity={0.7} onPress={() => feelCycle(-1)}>
                    <Ionicons name="chevron-back" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <View style={styles.feelPillCompact}>
                    <Text style={styles.feelText}>{feel.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity style={styles.stepBtnCompact} activeOpacity={0.7} onPress={() => feelCycle(1)}>
                    <Ionicons name="chevron-forward" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <Text style={styles.hintText}>
              {t(
                "记录尝试次数和体感可以让训练分析更精准",
                "Logging attempts & feel improves your training insights"
              )}
            </Text>

            {/* Note */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{t("备注", "Note")}</Text>
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder={t("写点感受…", "Write something…")}
                placeholderTextColor={colors.textTertiary}
                style={[styles.input, { height: 96, textAlignVertical: "top", marginTop: 8 }]}
                multiline
              />
            </View>
          </View>

          {/* Done */}
          <TouchableOpacity activeOpacity={0.9} onPress={handleDone} style={styles.doneBtn}>
            <Text style={styles.doneText}>{t("完成", "Done")}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TrueSheet>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: theme.spacing.screenPadding,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 16,
    },
    title: {
      ...theme.typography.sectionTitle,
      fontFamily: theme.fonts.black,
      color: colors.textPrimary,
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    mediaBtn: {
      marginTop: 4,
      height: 80,
      alignItems: "center",
      justifyContent: "center",
    },
    mediaTile: {
      width: 60,
      height: 60,
      borderRadius: theme.borderRadius.card,
      backgroundColor: colors.inputBackground,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
    },
    mediaPlus: {
      position: "absolute",
      right: 6,
      bottom: 6,
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    section: {
      marginTop: 16,
    },
    fieldLabel: {
      ...theme.typography.cardTitle,
      fontFamily: theme.fonts.bold,
      color: colors.textSecondary,
      marginBottom: 8,
    },
    input: {
      backgroundColor: colors.inputBackground,
      borderRadius: theme.borderRadius.card,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 15,
      fontFamily: theme.fonts.medium,
      color: colors.textPrimary,
    },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: theme.borderRadius.card,
      padding: 16,
      marginBottom: 12,
    },
    cardTitle: {
      ...theme.typography.body,
      fontFamily: theme.fonts.black,
      color: colors.textPrimary,
    },
    cardHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    stepperRowCompact: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    stepBtnCompact: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      backgroundColor: "transparent",
      alignItems: "center",
      justifyContent: "center",
    },
    stepValueCompact: {
      fontSize: 17,
      fontFamily: theme.fonts.black,
      color: colors.textPrimary,
      minWidth: 24,
      textAlign: "center",
    },
    feelRowCompact: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    feelPillCompact: {
      width: 100,
      height: 36,
      borderRadius: theme.borderRadius.pill,
      backgroundColor: colors.pillBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    feelText: {
      color: colors.pillText,
      fontFamily: theme.fonts.black,
      fontSize: 13,
      letterSpacing: 1,
    },
    hintText: {
      ...theme.typography.caption,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
      textAlign: "center",
      marginBottom: 12,
    },
    doneBtn: {
      marginTop: 12,
      height: 54,
      borderRadius: theme.borderRadius.card,
      backgroundColor: colors.pillBackground,
      alignItems: "center",
      justifyContent: "center",
    },
    doneText: {
      color: colors.pillText,
      fontSize: 17,
      fontFamily: theme.fonts.black,
    },
  });
