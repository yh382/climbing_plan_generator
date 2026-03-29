import { useState, useLayoutEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, Image, TouchableOpacity, Linking } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { NativeSegmentedControl } from "../../src/components/ui/NativeSegmentedControl";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { useSettings } from "src/contexts/SettingsContext";
import type { ThemeColors } from "../../src/lib/theme";

export default function HelpCenter() {
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const [tabIndex, setTabIndex] = useState(0);
  const [msg, setMsg] = useState("");
  const styles = useMemo(() => createStyles(colors), [colors]);

  const tabs = useMemo(() => ["Q&A", tr("提问", "Ask")], [lang]);

  useLayoutEffect(() => {
    navigation.setOptions({ title: tr("帮助", "Help") });
  }, [navigation, lang]);

  return (
    <ScrollView
      style={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
    >
      {/* Segmented Control */}
      <View style={styles.segmentWrapper}>
        <NativeSegmentedControl
          options={tabs}
          selectedIndex={tabIndex}
          onSelect={setTabIndex}
        />
      </View>

      {tabIndex === 0 ? (
        <View style={styles.tabContent}>
          {/* Search bar */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={tr("搜索文章...", "Search articles...")}
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Articles */}
          <TouchableOpacity style={styles.articleCard} activeOpacity={0.7} onPress={() => Linking.openURL("https://yh382.github.io/climmate-legal/help#getting-started")}>
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.articleTitle}>{tr("如何开始使用 ClimMate？", "How to get started with ClimMate?")}</Text>
              <Text style={styles.articleDesc}>{tr("了解基本功能和操作流程", "Learn about basic features and workflows")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.articleCard} activeOpacity={0.7} onPress={() => Linking.openURL("https://yh382.github.io/climmate-legal/help#logging-climbs")}>
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.articleTitle}>{tr("如何记录攀爬日志？", "How to log your climbs?")}</Text>
              <Text style={styles.articleDesc}>{tr("快速记录你的每次攀爬", "Quickly log each climbing session")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.articleCard} activeOpacity={0.7} onPress={() => Linking.openURL("https://yh382.github.io/climmate-legal/help#training-plans")}>
            <Ionicons name="document-text-outline" size={20} color={colors.textSecondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.articleTitle}>{tr("训练计划怎么用？", "How to use training plans?")}</Text>
              <Text style={styles.articleDesc}>{tr("定制和跟踪你的训练进度", "Customize and track your training progress")}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.askContent}>
          <Image
            source={{ uri: "https://i.pravatar.cc/300?u=support" }}
            style={styles.avatar}
          />
          <Text style={styles.askTitle}>{tr("有什么可以帮助你？", "How can we help?")}</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.msgInput}
              multiline
              placeholder={tr(
                "请在此输入你的问题，我们会尽快回复。",
                "Type your question here, we will try our best to respond soon."
              )}
              placeholderTextColor={colors.textSecondary}
              value={msg}
              onChangeText={setMsg}
              textAlignVertical="top"
            />
          </View>
          <TouchableOpacity style={styles.sendBtn} activeOpacity={0.8}>
            <Text style={styles.sendText}>{tr("发送", "Send")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    segmentWrapper: { paddingHorizontal: 16, paddingVertical: 12 },
    tabContent: { paddingHorizontal: 16 },
    searchBar: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.inputBackground,
      borderRadius: 10,
      paddingHorizontal: 12,
      height: 36,
      marginBottom: 20,
    },
    searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: colors.textPrimary },
    articleCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      padding: 14,
      marginBottom: 10,
      borderRadius: 12,
      backgroundColor: colors.cardBackground,
    },
    articleTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginBottom: 2 },
    articleDesc: { fontSize: 13, color: colors.textSecondary },
    askContent: { alignItems: "center", paddingTop: 32, paddingHorizontal: 16 },
    avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 16, backgroundColor: colors.cardBackground },
    askTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 24 },
    inputWrapper: {
      width: "100%",
      height: 180,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      padding: 16,
      marginBottom: 20,
    },
    msgInput: { flex: 1, fontSize: 16, color: colors.textPrimary },
    sendBtn: {
      width: "100%",
      backgroundColor: colors.pillBackground,
      borderRadius: 12,
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    sendText: { color: colors.pillText, fontSize: 16, fontWeight: "600" },
  });
