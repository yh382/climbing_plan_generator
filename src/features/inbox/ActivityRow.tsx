import React, { useMemo } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Image as SUIImage } from "@expo/ui/swift-ui";
import { Host } from "@expo/ui/swift-ui";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import type { InboxActivityItem } from "./api";

interface Props {
  item: InboxActivityItem;
  onPress: (item: InboxActivityItem) => void;
}

function kindGlyph(kind: string): string {
  switch (kind) {
    case "post_liked":
      return "heart";
    case "post_commented":
    case "comment_replied":
      return "message";
    case "new_follower":
      return "person.badge.plus";
    case "badge_awarded":
      return "sparkle";
    case "mention":
      return "at";
    case "challenge_started":
    case "challenge_ended":
    case "event_reminder":
    case "event_started":
      return "flag";
    default:
      return "bell";
  }
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
}

export default function ActivityRow({ item, onPress }: Props) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const isSystem = item.actor_count === 0;
  const firstActor = item.actors[0];

  // Build primary line per kind
  const primary = useMemo(() => {
    const name = firstActor?.username ?? "";
    switch (item.kind) {
      case "post_liked":
        return item.actor_count > 1
          ? tr(`${name} 等 ${item.actor_count} 人赞了你的帖子`, `${name} and ${item.actor_count - 1} others liked your post`)
          : tr(`${name} 赞了你的帖子`, `${name} liked your post`);
      case "post_commented":
        return item.actor_count > 1
          ? tr(`${name} 等 ${item.actor_count} 人评论了你的帖子`, `${name} and ${item.actor_count - 1} others commented on your post`)
          : tr(`${name} 评论了你的帖子`, `${name} commented on your post`);
      case "comment_replied":
        return tr(`${name} 回复了你的评论`, `${name} replied to your comment`);
      case "mention":
        return tr(`${name} 在评论中提到了你`, `${name} mentioned you in a comment`);
      case "new_follower":
        return tr(`${name} 关注了你`, `${name} started following you`);
      case "badge_awarded":
        return tr(`恭喜！解锁徽章`, `Congrats! New badge unlocked`);
      case "challenge_started":
        return tr(`挑战已开始`, `Challenge started`);
      case "challenge_ended":
        return tr(`挑战已结束`, `Challenge ended`);
      case "event_reminder":
        return tr(`活动提醒`, `Event reminder`);
      case "event_started":
        return tr(`活动开始`, `Event started`);
      default:
        return item.kind;
    }
  }, [item, firstActor, tr]);

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => onPress(item)}
    >
      {isSystem ? (
        <View style={[styles.avatar, styles.avatarSystem]}>
          <Host matchContents>
            <SUIImage systemName={kindGlyph(item.kind) as any} size={14} color={colors.textSecondary} />
          </Host>
        </View>
      ) : firstActor?.avatar_url ? (
        <Image source={{ uri: firstActor.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]} />
      )}

      <View style={styles.center}>
        <Text style={styles.primary} numberOfLines={1}>
          {primary}
        </Text>
        {item.preview ? (
          <Text style={styles.secondary} numberOfLines={1}>
            {item.preview}
          </Text>
        ) : null}
      </View>

      <View style={styles.right}>
        <Text style={styles.time}>{formatTime(item.latest_at)}</Text>
        {!item.read_all ? <View style={styles.unreadDot} /> : null}
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    row: {
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: theme.spacing.screenPadding,
      paddingVertical: 8,
      gap: 12,
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    avatarPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
    },
    avatarSystem: {
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    center: {
      flex: 1,
      gap: 2,
    },
    primary: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: colors.textPrimary,
    },
    secondary: {
      fontFamily: theme.fonts.regular,
      fontSize: 11,
      color: colors.textSecondary,
    },
    right: {
      alignItems: "flex-end",
      gap: 6,
      minWidth: 40,
    },
    time: {
      fontFamily: theme.fonts.monoRegular,
      fontSize: 11,
      color: colors.textTertiary,
    },
    unreadDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
  });
