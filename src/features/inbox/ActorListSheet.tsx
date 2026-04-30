import React, { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, FlatList } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import type { InboxActor } from "./api";

export interface ActorListSheetHandle {
  present: (payload: { actors: InboxActor[]; kind: string }) => void;
  dismiss: () => void;
}

interface Props {
  onPressActor: (userId: string) => void;
}

function actionVerb(kind: string, tr: (zh: string, en: string) => string): string {
  switch (kind) {
    case "post_liked":
      return tr("赞了你的帖子", "liked your post");
    case "post_commented":
      return tr("评论了你的帖子", "commented on your post");
    default:
      return "";
  }
}

const ActorListSheet = forwardRef<ActorListSheetHandle, Props>(function ActorListSheet(
  { onPressActor },
  ref,
) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const sheetRef = useRef<TrueSheet>(null);
  const [state, setState] = React.useState<{ actors: InboxActor[]; kind: string }>({
    actors: [],
    kind: "",
  });

  useImperativeHandle(ref, () => ({
    present: (payload) => {
      setState(payload);
      sheetRef.current?.present();
    },
    dismiss: () => sheetRef.current?.dismiss(),
  }));

  const verb = actionVerb(state.kind, tr);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={["auto"]}
      dimmed
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
    >
      <View style={styles.content}>
        <FlatList
          data={state.actors}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => {
                sheetRef.current?.dismiss();
                onPressActor(item.id);
              }}
            >
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]} />
              )}
              <View style={styles.textCol}>
                <Text style={styles.username} numberOfLines={1}>
                  {item.username ?? "—"}
                </Text>
                {verb ? <Text style={styles.action}>{verb}</Text> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </TrueSheet>
  );
});

export default ActorListSheet;

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    content: {
      paddingVertical: 12,
      paddingHorizontal: theme.spacing.screenPadding,
      backgroundColor: colors.sheetBackground,
    },
    row: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    avatar: {
      width: 32,
      height: 32,
      borderRadius: 16,
    },
    avatarPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
    },
    textCol: {
      flex: 1,
      gap: 2,
    },
    username: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: colors.textPrimary,
    },
    action: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: colors.textSecondary,
    },
  });
