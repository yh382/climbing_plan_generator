import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
  LayoutAnimation,
  UIManager,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

// 开启 LayoutAnimation (Android 需要)
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SCREEN_HEIGHT = Dimensions.get("window").height;

export type SendStyle = "redpoint" | "onsight" | "flash";
export type Feel = "soft" | "solid" | "hard";

export type LogSendDraft = {
  style: SendStyle;
  attempts: number;
  feel: Feel;
  name: string;
  note: string;
};

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  // Allow async so parent can persist to storage and enqueue outbox events.
  onDone: (draft: LogSendDraft) => void | Promise<void>;
  tr?: (zh: string, en: string) => string;
};

export default function LogSendModal({ visible, title, onClose, onDone, tr }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = useMemo(() => tr ?? ((zh: string, en: string) => en), [tr]);

  const [style, setStyle] = useState<SendStyle>("redpoint");
  const [attempts, setAttempts] = useState(1);
  const [feel, setFeel] = useState<Feel>("solid");
  const [name, setName] = useState("");
  const [note, setNote] = useState("");

  // 用于锁定 Modal 的高度
  const [modalMinHeight, setModalMinHeight] = useState<number>(0);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [showModal, setShowModal] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();

      // Reset logic
      setStyle("redpoint");
      setAttempts(1);
      setFeel("solid");
      setName("");
      setNote("");
    } else {
      closeWithAnimation();
    }
  }, [visible]);

  const closeWithAnimation = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onClose();
    });
  };

  // 带动画的样式切换
  const handleStyleChange = (newStyle: SendStyle) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStyle(newStyle);
    // Flash/Onsight = first-try success, force attempts to 1
    if (newStyle !== "redpoint") {
      setAttempts(1);
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.vy > 0.5 || g.dy > 110) closeWithAnimation();
        else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
          }).start();
        }
      },
    })
  ).current;

  const feelCycle = (dir: -1 | 1) => {
    const order: Feel[] = ["soft", "solid", "hard"];
    const idx = order.indexOf(feel);
    setFeel(order[(idx + dir + order.length) % order.length]);
  };

  const showAttempts = style === "redpoint";

  const [submitting, setSubmitting] = useState(false);

  const handleDone = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const finalAttempts = style === "redpoint" ? attempts : 1;
      await Promise.resolve(onDone({ style, attempts: finalAttempts, feel, name, note }));
      closeWithAnimation();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={showModal} onRequestClose={closeWithAnimation}>
      <Pressable style={styles.overlay} onPress={closeWithAnimation}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ justifyContent: "flex-end" }}>
          <Animated.View
            onLayout={(e) => {
              if (style === "redpoint") {
                const h = e.nativeEvent.layout.height;
                if (h > modalMinHeight) setModalMinHeight(h);
              }
            }}
            style={[
              styles.modalContent,
              {
                paddingBottom: insets.bottom + 14,
                transform: [{ translateY }],
                minHeight: modalMinHeight > 0 ? modalMinHeight : undefined,
              },
            ]}
            {...panResponder.panHandlers}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.dragHandleArea}>
                <View style={styles.dragIndicator} />
              </View>

              <View style={styles.headerRow}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={closeWithAnimation} style={styles.closeBtn} activeOpacity={0.7}>
                  <Ionicons name="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity activeOpacity={0.9} style={styles.mediaBtn} onPress={() => {}}>
                <View style={styles.mediaTile}>
                  <Ionicons name="camera-outline" size={24} color={colors.textSecondary} />
                  <View style={styles.mediaPlus}>
                    <Ionicons name="add" size={12} color={colors.textPrimary} />
                  </View>
                </View>
              </TouchableOpacity>

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

              <View style={styles.section}>
                <Text style={styles.fieldLabel}>{t("方式", "Style")}</Text>
                <View style={styles.segWrap}>
                  {(["redpoint", "onsight", "flash"] as SendStyle[]).map((k) => {
                    const active = style === k;
                    const label = k === "redpoint" ? "Redpoint" : k === "onsight" ? "Onsight" : "Flash";
                    return (
                      <TouchableOpacity
                        key={k}
                        activeOpacity={0.9}
                        onPress={() => handleStyleChange(k)}
                        style={[styles.segBtn, active && styles.segBtnActive]}
                      >
                        <Text style={[styles.segText, active && styles.segTextActive]}>{label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

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

              <TouchableOpacity activeOpacity={0.9} onPress={handleDone} style={styles.doneBtn}>
                <Text style={styles.doneText}>{t("完成", "Done")}</Text>
              </TouchableOpacity>
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "flex-end",
    },
    modalContent: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      paddingHorizontal: theme.spacing.screenPadding,
    },
    dragHandleArea: {
      width: "100%",
      height: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    dragIndicator: {
      width: 36,
      height: 4,
      backgroundColor: colors.textTertiary,
      borderRadius: 2,
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
    segWrap: {
      flexDirection: "row",
      backgroundColor: colors.inputBackground,
      borderRadius: theme.borderRadius.card,
      padding: 4,
    },
    segBtn: {
      flex: 1,
      height: 38,
      borderRadius: theme.borderRadius.cardSmall,
      alignItems: "center",
      justifyContent: "center",
    },
    segBtnActive: {
      backgroundColor: colors.pillBackground,
    },
    segText: {
      ...theme.typography.cardTitle,
      fontFamily: theme.fonts.bold,
      color: colors.textSecondary,
    },
    segTextActive: {
      color: colors.pillText,
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
