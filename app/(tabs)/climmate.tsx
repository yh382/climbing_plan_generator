// app/(tabs)/climmate.tsx
import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "@/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";
import GlassIconButton from "../../src/features/community/challenges/component/GlassIconButton";
import { useCoachChatStore } from "../../src/features/coachChat/state/coachChatStore";
import ConversationMenuSheet from "../../src/features/coachChat/components/ConversationMenuSheet";
import ConversationListSheet from "../../src/features/coachChat/components/ConversationListSheet";
import CoachChatScreen from "../../src/features/coachChat/screens/CoachChatScreen";
import PlansView from "../../src/features/coachChat/components/PlansView";
import ExercisesView from "../../src/features/coachChat/components/ExercisesView";

type ClimmateView = "coach" | "plans" | "exercises";

const NAV_ITEMS: { key: ClimmateView; label: string }[] = [
  { key: "coach", label: "Coach" },
  { key: "plans", label: "Plans" },
  { key: "exercises", label: "Exercises" },
];

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 8,
      paddingBottom: 4,
    },
    pageTitle: {
      fontFamily: theme.fonts.black,
      ...theme.typography.hero,
      color: colors.textPrimary,
    },
    navRow: {
      flexDirection: "row",
      paddingHorizontal: theme.spacing.screenPadding,
      gap: 24,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    navItem: {
      paddingVertical: 10,
    },
    navLabel: {
      fontFamily: theme.fonts.medium,
      fontSize: 14,
    },
    navLabelActive: {
      color: colors.textPrimary,
    },
    navLabelInactive: {
      color: colors.textSecondary,
    },
    navUnderline: {
      height: 2,
      marginTop: 8,
      borderRadius: 1,
      backgroundColor: "transparent",
    },
    navUnderlineActive: {
      backgroundColor: colors.accent,
    },
    content: {
      flex: 1,
    },
  });

export default function ClimmateTab() {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [activeView, setActiveView] = useState<ClimmateView>("coach");
  const [menuOpen, setMenuOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  const createConversation = useCoachChatStore((s) => s.createConversation);
  const deleteConversation = useCoachChatStore((s) => s.deleteConversation);
  const switchConversation = useCoachChatStore((s) => s.switchConversation);
  const coach = useCoachChatStore((s) => s.state);

  const handleNewConversation = useCallback(() => {
    createConversation();
  }, [createConversation]);

  const handleViewAll = useCallback(() => {
    setMenuOpen(false);
    setListOpen(true);
  }, []);

  const handleDeleteCurrent = useCallback(() => {
    if (coach.currentConversationId) {
      deleteConversation(coach.currentConversationId);
    }
  }, [coach.currentConversationId, deleteConversation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      {/* Page title + menu button */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle}>Climmate</Text>
        {activeView === "coach" && (
          <GlassIconButton icon="ellipsis-horizontal" onPress={() => setMenuOpen(true)} />
        )}
      </View>

      {/* Secondary navigation — underline style */}
      <View style={styles.navRow}>
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setActiveView(item.key)}
              style={styles.navItem}
            >
              <Text
                style={[
                  styles.navLabel,
                  isActive ? styles.navLabelActive : styles.navLabelInactive,
                ]}
              >
                {item.label}
              </Text>
              <View
                style={[
                  styles.navUnderline,
                  isActive && styles.navUnderlineActive,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

      {/* Content */}
      <View style={styles.content}>
        {activeView === "coach" && <CoachChatScreen embedded />}
        {activeView === "plans" && <PlansView />}
        {activeView === "exercises" && <ExercisesView />}
      </View>

      {/* Conversation menu */}
      <ConversationMenuSheet
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        onNewConversation={handleNewConversation}
        onViewAll={handleViewAll}
        onDeleteCurrent={handleDeleteCurrent}
      />

      {/* Conversation list */}
      <ConversationListSheet
        visible={listOpen}
        onClose={() => setListOpen(false)}
        conversations={coach.conversations}
        currentId={coach.currentConversationId}
        onSelect={switchConversation}
        onDelete={deleteConversation}
      />
    </View>
  );
}
