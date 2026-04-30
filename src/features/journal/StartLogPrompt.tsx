// src/features/journal/StartLogPrompt.tsx
// Entry prompt for logging a climb: pick between starting a timed session
// (full PreSessionModal flow with Live Activity) or dropping a quick log
// (no timer, session_id=null). Appears from the Activity tab's Start Log
// button and from outdoor route detail before an active session exists.

import React, { useEffect, useMemo, useRef } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "../../contexts/SettingsContext";

type Props = {
  visible: boolean;
  onClose: () => void;
  onStartTimed: () => void;
  /** Fired when the user picks the quick-log path. For MVP parent may show an alert. */
  onQuickLog: () => void;
};

export default function StartLogPrompt({ visible, onClose, onStartTimed, onQuickLog }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);

  useEffect(() => {
    if (visible && !isPresented.current) {
      setTimeout(() => {
        sheetRef.current?.present();
        isPresented.current = true;
      }, 50);
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  return (
    <TrueSheet
      ref={sheetRef}
      onDidDismiss={() => {
        isPresented.current = false;
        onClose();
      }}
      detents={["auto"]}
      backgroundColor={colors.background}
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      dimmed
    >
      <View style={styles.container}>
        <Text style={styles.title}>{tr("如何记录？", "How do you want to log?")}</Text>
        <Text style={styles.subtitle}>
          {tr("开启 session 会计时并启动 Live Activity；快速记录跳过计时。", "Starting a session times your climb and starts a Live Activity. Quick log skips timing.")}
        </Text>

        <TouchableOpacity
          style={[styles.option, styles.primaryOption]}
          activeOpacity={0.85}
          onPress={() => {
            sheetRef.current?.dismiss();
            onStartTimed();
          }}
        >
          <View style={styles.iconWrap}>
            <Ionicons name="timer-outline" size={22} color="#FFFFFF" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.primaryOptionTitle}>{tr("开始计时 Session", "Start Timed Session")}</Text>
            <Text style={styles.primaryOptionSub}>{tr("推荐 · 启动计时 + Live Activity", "Recommended · timer + Live Activity")}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.option}
          activeOpacity={0.85}
          onPress={() => {
            sheetRef.current?.dismiss();
            onQuickLog();
          }}
        >
          <View style={[styles.iconWrap, styles.secondaryIconWrap]}>
            <Ionicons name="flash-outline" size={22} color={colors.textPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.optionTitle}>{tr("快速记录", "Quick Log")}</Text>
            <Text style={styles.optionSub}>
              {tr("不计时 · 适合事后补录一条路线", "No timer · for adding a single climb after the fact")}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    </TrueSheet>
  );
}

/**
 * Helper: a placeholder Quick Log action. Until the full quick-log route ships,
 * show an informative alert so the UI affordance is honest about current state.
 */
export function showQuickLogComingSoonAlert(tr: (zh: string, en: string) => string) {
  Alert.alert(
    tr("快速记录即将推出", "Quick Log coming soon"),
    tr(
      "快速记录（session_id=null）流程正在建设中，敬请期待。现在请使用「开始计时 Session」来记录。",
      "The quick-log flow (session_id=null) is under construction. Please use Start Timed Session for now."
    )
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingTop: 24,
      paddingBottom: 32,
      gap: 12,
    },
    title: {
      fontSize: 20,
      fontFamily: theme.fonts.black,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: 13,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      marginBottom: 8,
      lineHeight: 18,
    },
    option: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      borderRadius: 14,
      backgroundColor: colors.backgroundSecondary,
    },
    primaryOption: {
      backgroundColor: colors.cardDark,
    },
    iconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    secondaryIconWrap: {
      backgroundColor: colors.background,
    },
    primaryOptionTitle: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: "#FFFFFF",
    },
    primaryOptionSub: {
      marginTop: 2,
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: "#C7C7CC",
    },
    optionTitle: {
      fontSize: 15,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    optionSub: {
      marginTop: 2,
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
  });
