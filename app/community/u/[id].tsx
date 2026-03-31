// app/community/u/[id].tsx

import { useState, useEffect, useCallback, useLayoutEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share,
  FlatList,
  useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18N } from "../../../lib/i18n";
import { HeaderButton } from "../../../src/components/ui/HeaderButton";
import { useThemeColors } from "../../../src/lib/useThemeColors";

import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolate,
} from "react-native-reanimated";

import ProfileHeader from "../../../src/components/shared/ProfileHeader";
import ProfileTabBar from "../../../src/components/shared/ProfileTabBar";
import ProfilePostGrid from "../../../src/features/profile/components/ProfilePostGrid";
import PublicStatsSection from "../../../src/features/profile/components/PublicStatsSection";
import BadgeCard from "../../../src/features/profile/components/badgessection/BadgeCard";
import type { Badge, BadgeSectionKey, BadgeTier } from "../../../src/features/profile/components/badgessection/types";
import { usePublicProfile, PublicBadge } from "../../../src/features/community/hooks";
import { communityApi } from "../../../src/features/community/api";
import { chatApi } from "../../../src/features/chat/api";

function publicBadgeToBadge(b: PublicBadge): Badge {
  return {
    id: b.code,
    title: b.name,
    section: (b.category ?? "special") as BadgeSectionKey,
    tier: (b.tier ?? null) as BadgeTier,
    status: "unlocked",
    progress: 1,
    iconUrl: b.iconUrl,
    awardedAt: b.awardedAt,
    sourceType: b.sourceType,
    sourceId: b.sourceId,
  };
}

function deduplicateGradeBadges(badges: Badge[]): Badge[] {
  const byGrade = new Map<string, Badge>();
  for (const b of badges) {
    const suffix = b.id.replace(/^(limit|solid)_(boulder|rope)_/, "");
    const existing = byGrade.get(suffix);
    if (!existing) {
      byGrade.set(suffix, b);
    } else if (b.id.startsWith("solid_") && existing.id.startsWith("limit_")) {
      byGrade.set(suffix, b);
    }
  }
  return Array.from(byGrade.values());
}

const BADGE_GROUPS: { key: string; title: string; filter: (b: Badge) => boolean; dedupe?: boolean }[] = [
  { key: "boulder", title: "Boulder", filter: (b) => b.id.startsWith("limit_boulder_") || b.id.startsWith("solid_boulder_"), dedupe: true },
  { key: "rope", title: "Rope", filter: (b) => b.id.startsWith("limit_rope_") || b.id.startsWith("solid_rope_"), dedupe: true },
  { key: "lifetime", title: "Lifetime", filter: (b) => b.section === "lifetime" },
  { key: "monthly", title: "Monthly", filter: (b) => b.section === "monthly" },
];

const SCROLL_THRESHOLD = 44;

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { tt } = useI18N();

  const { profile, posts, plans, badges, sessionSummary, loading } = usePublicProfile(id ?? null);
  const { width } = useWindowDimensions();

  const badgeCardSize = useMemo(() => (width - 24 - 12) / 3, [width]);

  const allBadgesMapped = useMemo(() => {
    const seen = new Set<string>();
    return badges.map(publicBadgeToBadge).filter(b => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [badges]);

  const groupedBadges = useMemo(() => {
    return BADGE_GROUPS
      .map(g => {
        const filtered = allBadgesMapped.filter(g.filter);
        const deduped = g.dedupe ? deduplicateGradeBadges(filtered) : filtered;
        return { ...g, badges: [...deduped].reverse() };
      })
      .filter(g => g.badges.length > 0);
  }, [allBadgesMapped]);

  // Follow state
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);
  const [localFollowersCount, setLocalFollowersCount] = useState(0);

  useEffect(() => {
    if (profile) {
      setIsFollowing(profile.isFollowing);
      setLocalFollowersCount(profile.followersCount);
    }
  }, [profile]);

  const handleFollow = async () => {
    if (!id || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await communityApi.unfollowUser(id);
        setIsFollowing(false);
        setLocalFollowersCount((c) => Math.max(0, c - 1));
      } else {
        await communityApi.followUser(id);
        setIsFollowing(true);
        setLocalFollowersCount((c) => c + 1);
      }
    } catch (_e) { /* swallow */ }
    finally { setFollowLoading(false); }
  };

  const handleMessage = useCallback(async () => {
    if (!id || msgLoading) return;
    setMsgLoading(true);
    try {
      const conv = await chatApi.startConversation(id);
      router.push(`/chat/${conv.id}` as any);
    } catch (_e) {
      router.push("/chat" as any);
    } finally {
      setMsgLoading(false);
    }
  }, [id, msgLoading, router]);

  const submitReport = useCallback(async (targetType: 'user' | 'post', targetId: string, reason: string) => {
    try {
      await communityApi.report(targetType, targetId, reason);
      Alert.alert(
        tt({ zh: "举报已提交", en: "Report Submitted" }),
        tt({ zh: "感谢你的反馈，我们会尽快处理", en: "Thank you for your feedback. We will review it shortly." }),
      );
    } catch (e: any) {
      if (e?.response?.status === 409) {
        Alert.alert(
          tt({ zh: "已举报", en: "Already Reported" }),
          tt({ zh: "你已经举报过了", en: "You have already reported this." }),
        );
      } else {
        Alert.alert(tt({ zh: "举报失败", en: "Report Failed" }));
      }
    }
  }, [tt]);

  // ── Menu action handlers ──
  const handleBlock = useCallback(() => {
    if (!id) return;
    Alert.alert(
      tt({ zh: "确认屏蔽", en: "Confirm Block" }),
      tt({ zh: "屏蔽后将无法看到对方的内容", en: "You won't see their content after blocking" }),
      [
        { text: tt({ zh: "取消", en: "Cancel" }), style: "cancel" },
        {
          text: tt({ zh: "屏蔽", en: "Block" }),
          style: "destructive",
          onPress: async () => {
            try { await communityApi.blockUser(id); router.back(); } catch (_e) { /* swallow */ }
          },
        },
      ],
    );
  }, [id, tt, router]);

  const handleReport = useCallback(() => {
    if (!id) return;
    Alert.alert(
      tt({ zh: "选择举报原因", en: "Select Report Reason" }),
      undefined,
      [
        { text: tt({ zh: "垃圾内容", en: "Spam" }), onPress: () => submitReport("user", id!, "spam") },
        { text: tt({ zh: "骚扰", en: "Harassment" }), onPress: () => submitReport("user", id!, "harassment") },
        { text: tt({ zh: "不当内容", en: "Inappropriate" }), onPress: () => submitReport("user", id!, "inappropriate") },
        { text: tt({ zh: "其他", en: "Other" }), onPress: () => submitReport("user", id!, "other") },
        { text: tt({ zh: "取消", en: "Cancel" }), style: "cancel" },
      ],
    );
  }, [id, tt, submitReport]);

  const handleShare = useCallback(() => {
    Share.share({
      message: `Check out ${profile?.displayName ?? profile?.username}'s climbing profile!`,
    }).catch(() => {});
  }, [profile]);

  // Tabs
  const [activeTab, setActiveTab] = useState("posts");

  // --------------------- Reanimated scroll ---------------------
  const scrollY = useSharedValue(0);

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      title: "",
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, router]);

  const headerTitleAnimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0], Extrapolate.CLAMP),
    transform: [
      { scale: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [1, 0.92], Extrapolate.CLAMP) },
      { translateY: interpolate(scrollY.value, [0, SCROLL_THRESHOLD], [0, -10], Extrapolate.CLAMP) },
    ],
  }));

  // Privacy helpers
  const privacy = profile?.privacy;

  const colors = useThemeColors();
  const dynStyles = useMemo(() => createDynStyles(colors), [colors]);

  // --------------------- Loading / Error states ---------------------
  if (loading && !profile) {
    return (
      <View style={[dynStyles.screenRoot, { paddingTop: insets.top + 44, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="large" color={colors.textPrimary} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[dynStyles.screenRoot, { paddingTop: insets.top + 44, alignItems: "center", justifyContent: "center" }]}>
        <Ionicons name="person-outline" size={48} color={colors.border} />
        <Text style={{ color: colors.textTertiary, marginTop: 8 }}>User not found</Text>
      </View>
    );
  }

  const gradeDisplay = `${profile.boulderMax || "—"}/${profile.routeMax || "—"}`;

  return (
    <View style={dynStyles.screenRoot}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        stickyHeaderIndices={[1]}
      >
        {/* [0] Cover/gradient + header */}
        <ProfileHeader
          name={profile.displayName}
          username={profile.username}
          avatarUrl={profile.avatarUrl}
          coverUrl={profile.coverUrl}
          bio={profile.bio}
          location={profile.location}
          homeGym={profile.homeGym}
          followersCount={localFollowersCount}
          followingCount={profile.followingCount}
          gradeDisplay={gradeDisplay}
          totalSends={profile.totalSends}
          isOwnProfile={false}
          isFollowing={isFollowing}
          followLoading={followLoading}
          msgLoading={msgLoading}
          onFollowPress={handleFollow}
          onMessagePress={handleMessage}
          onFollowersPress={() => router.push(`/profile/followers?userId=${id}` as any)}
          onFollowingPress={() => router.push(`/profile/following?userId=${id}` as any)}
          headerTitleAnimStyle={headerTitleAnimStyle}
          scrollY={scrollY}
        />

        {/* [1] Tab bar (sticky) */}
        <ProfileTabBar activeTab={activeTab} onTabPress={setActiveTab} />

        {/* Content */}
        <View style={dynStyles.contentArea}>
          {activeTab === "posts" && (
            privacy?.posts === false ? (
              <PrivateSection
                message={tt({ zh: "帖子已设为私密", en: "Posts are private" })}
                colors={colors}
              />
            ) : (
              <ProfilePostGrid
                posts={posts as any}
                onPressPost={(post) => router.push({ pathname: "/community/user-posts", params: { userId: id, initialPostId: post.id } } as any)}
              />
            )
          )}

          {activeTab === "stats" && (
            privacy?.analysis === false ? (
              <PrivateSection
                message={tt({ zh: "统计数据已设为私密", en: "Stats are private" })}
                colors={colors}
              />
            ) : profile ? (
              <PublicStatsSection profile={profile} sessionSummary={sessionSummary} />
            ) : null
          )}

          {activeTab === "plans" && (
            privacy?.plans === false ? (
              <PrivateSection
                message={tt({ zh: "训练计划已设为私密", en: "Plans are private" })}
                colors={colors}
              />
            ) : plans.length === 0 ? (
              <View style={dynStyles.emptyState}>
                <Ionicons name="calendar-outline" size={40} color={colors.border} />
                <Text style={dynStyles.emptyText}>
                  {tt({ zh: "暂无公开计划", en: "No public plans" })}
                </Text>
              </View>
            ) : (
              <View style={dynStyles.listContainer}>
                {plans.map((p) => (
                  <View key={p.id} style={dynStyles.planCard}>
                    <View style={dynStyles.planHeader}>
                      <Ionicons name="calendar" size={18} color="#6366F1" />
                      <Text style={dynStyles.planTitle} numberOfLines={1}>{p.title}</Text>
                    </View>
                    <View style={dynStyles.planMeta}>
                      {p.trainingType ? (
                        <View style={dynStyles.tag}>
                          <Text style={dynStyles.tagText}>{p.trainingType}</Text>
                        </View>
                      ) : null}
                      {p.durationWeeks ? (
                        <Text style={dynStyles.metaText}>
                          {p.durationWeeks} {tt({ zh: "周", en: "weeks" })}
                        </Text>
                      ) : null}
                      <View style={[dynStyles.statusDot, { backgroundColor: p.status === "active" ? "#22C55E" : "#9CA3AF" }]} />
                      <Text style={dynStyles.metaText}>{p.status}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )
          )}

          {activeTab === "badges" && (
            privacy?.badges === false ? (
              <PrivateSection
                message={tt({ zh: "徽章已设为私密", en: "Badges are private" })}
                colors={colors}
              />
            ) : badges.length === 0 ? (
              <View style={dynStyles.emptyState}>
                <Ionicons name="ribbon-outline" size={40} color={colors.border} />
                <Text style={dynStyles.emptyText}>
                  {tt({ zh: "暂无徽章", en: "No badges yet" })}
                </Text>
              </View>
            ) : (
              <View style={{ paddingTop: 8 }}>
                {groupedBadges.map(group => (
                  <View key={group.key} style={dynStyles.badgeSectionBlock}>
                    <Text style={dynStyles.badgeSectionTitle}>{group.title}</Text>
                    <FlatList
                      data={group.badges}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      keyExtractor={item => item.id}
                      renderItem={({ item }) => (
                        <BadgeCard
                          badge={item}
                          size={badgeCardSize}
                          onPress={item.sourceType === "challenge" && item.sourceId
                            ? () => router.push(`/community/challenges/${item.sourceId}`)
                            : undefined
                          }
                        />
                      )}
                      ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                      contentContainerStyle={{ paddingHorizontal: 12 }}
                    />
                  </View>
                ))}
              </View>
            )
          )}
        </View>
      </Animated.ScrollView>

      {/* Native toolbar menu (context menu from button position) */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Menu icon="ellipsis">
          <Stack.Toolbar.MenuAction
            icon="square.and.arrow.up"
            onPress={handleShare}
          >
            {tt({ zh: "分享主页", en: "Share Profile" })}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="exclamationmark.bubble"
            onPress={handleReport}
          >
            {tt({ zh: "举报", en: "Report" })}
          </Stack.Toolbar.MenuAction>
          <Stack.Toolbar.MenuAction
            icon="hand.raised.slash"
            onPress={handleBlock}
          >
            {tt({ zh: "屏蔽", en: "Block" })}
          </Stack.Toolbar.MenuAction>
        </Stack.Toolbar.Menu>
      </Stack.Toolbar>
    </View>
  );
}

function PrivateSection({ message, colors }: { message: string; colors: ReturnType<typeof useThemeColors> }) {
  return (
    <View style={{ padding: 48, alignItems: "center", gap: 8 }}>
      <Ionicons name="lock-closed-outline" size={36} color={colors.border} />
      <Text style={{ color: colors.textTertiary, fontSize: 14 }}>{message}</Text>
    </View>
  );
}

const createDynStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.background },
  contentArea: { minHeight: 400 },
  emptyState: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textTertiary, marginTop: 8 },
  // Plans
  listContainer: { padding: 16, gap: 12 },
  planCard: { backgroundColor: colors.backgroundSecondary, borderRadius: 12, padding: 14, gap: 8 },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  planTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, flex: 1 },
  planMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tag: { backgroundColor: colors.backgroundSecondary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 12, color: "#6366F1", fontWeight: "500" },
  metaText: { fontSize: 12, color: colors.textSecondary },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  // Badges
  badgeSectionBlock: { marginBottom: 16 },
  badgeSectionTitle: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, paddingHorizontal: 12 },
});
