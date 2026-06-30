import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SectionList, View, Text, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { inboxApi, type InboxActivityItem } from "./api";
import ActivityRow from "./ActivityRow";
import DateGroupHeader from "./DateGroupHeader";
import ActorListSheet, { type ActorListSheetHandle } from "./ActorListSheet";

type Bucket = "today" | "yesterday" | "week" | "older";

interface Section {
  title: string;
  data: InboxActivityItem[];
}

function bucketOf(iso: string, now: Date): Bucket {
  const d = new Date(iso);
  const todayStr = now.toLocaleDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toLocaleDateString();

  const dStr = d.toLocaleDateString();
  if (dStr === todayStr) return "today";
  if (dStr === yesterdayStr) return "yesterday";
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  if (d >= weekAgo) return "week";
  return "older";
}

function groupByDate(items: InboxActivityItem[], tr: (zh: string, en: string) => string): Section[] {
  const now = new Date();
  const buckets: Record<Bucket, InboxActivityItem[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: [],
  };
  for (const item of items) {
    buckets[bucketOf(item.latest_at, now)].push(item);
  }
  const labels: Record<Bucket, string> = {
    today: tr("今天", "Today"),
    yesterday: tr("昨天", "Yesterday"),
    week: tr("本周", "This Week"),
    older: tr("更早", "Earlier"),
  };
  return (["today", "yesterday", "week", "older"] as const)
    .filter((b) => buckets[b].length > 0)
    .map((b) => ({ title: labels[b], data: buckets[b] }));
}

interface Props {
  listHeader?: React.ReactNode;
}

export default function ActivityFeed({ listHeader }: Props = {}) {
  const colors = useThemeColors();
  const { tr } = useSettings();
  const router = useRouter();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [items, setItems] = useState<InboxActivityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const sheetRef = useRef<ActorListSheetHandle>(null);

  const fetchItems = useCallback(async () => {
    try {
      const data = await inboxApi.getActivity();
      setItems(data);
    } catch {
      // silently ignore; UI shows empty state
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchItems().finally(() => setLoading(false));
    }, [fetchItems]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  }, [fetchItems]);

  const navigateForItem = useCallback(
    (item: InboxActivityItem, actorOverride?: string) => {
      const meta = item.target_id;
      const actorId = actorOverride ?? item.actors[0]?.id;
      switch (item.kind) {
        case "post_liked":
        case "post_commented":
          if (item.target_id) router.push(`/community/post/${item.target_id}` as any);
          break;
        case "comment_replied":
        case "mention": {
          // target_id for these non-aggregated kinds is meta.comment_id per SQL COALESCE chain.
          // The post_id lives in meta and is not exposed via target_id; without JOIN changes,
          // drop the commentId param entirely for now and navigate to the comment-id target.
          // NOTE: post detail deep-link with commentId scroll is a future enhancement.
          if (item.target_id) router.push(`/community/post/${item.target_id}` as any);
          break;
        }
        case "new_follower":
          if (actorId) router.push(`/community/u/${actorId}` as any);
          break;
        case "badge_awarded":
          // future-proofing: if profile supports ?tab=badges it will pick up;
          // otherwise falls back to default profile
          router.push("/(drawer)/(tabs)/profile?tab=badges" as any);
          break;
        case "challenge_started":
        case "challenge_ended":
          if (item.target_id) router.push(`/community/challenges/${item.target_id}` as any);
          break;
        case "event_reminder":
        case "event_started":
          if (item.target_id) router.push(`/community/events/${item.target_id}` as any);
          break;
        case "org_invite":
          router.push("/org-invites" as any);
          break;
        default:
          break;
      }
    },
    [router],
  );

  const handlePressRow = useCallback(
    async (item: InboxActivityItem) => {
      // Optimistic mark-read
      if (!item.read_all && item.underlying_notification_ids.length > 0) {
        setItems((prev) =>
          prev.map((it) => (it.id === item.id ? { ...it, read_all: true } : it)),
        );
        inboxApi.markRead(item.underlying_notification_ids).catch(() => {});
      }

      if (item.actor_count > 1) {
        sheetRef.current?.present({ actors: item.actors, kind: item.kind });
        return;
      }
      navigateForItem(item);
    },
    [navigateForItem],
  );

  const sections = useMemo(() => groupByDate(items, tr), [items, tr]);

  const empty = useMemo(() => {
    if (loading && items.length === 0) {
      return (
        <View style={styles.centerWrap}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
        </View>
      );
    }
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.emptyText}>{tr("还没有消息", "No messages yet")}</Text>
      </View>
    );
  }, [loading, items.length, styles, colors.textPrimary, tr]);

  return (
    <>
      <SectionList
        style={{ flex: 1, backgroundColor: colors.background }}
        sections={sections}
        keyExtractor={(item) => item.id}
        renderSectionHeader={({ section }) => <DateGroupHeader label={section.title} />}
        renderItem={({ item }) => <ActivityRow item={item} onPress={handlePressRow} />}
        ListHeaderComponent={<>{listHeader}</>}
        ListEmptyComponent={empty}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 40 }}
        stickySectionHeadersEnabled={false}
      />
      <ActorListSheet
        ref={sheetRef}
        onPressActor={(userId) => router.push(`/community/u/${userId}` as any)}
      />
    </>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    centerWrap: {
      padding: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 14,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
    },
  });
