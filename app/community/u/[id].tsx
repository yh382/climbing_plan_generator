// app/community/u/[id].tsx

import { useState, useEffect, useCallback, useLayoutEffect, useMemo, type ReactNode } from "react";
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
import { HEADER_TRANSPARENT } from "@/lib/nativeHeaderOptions";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useI18N } from "../../../lib/i18n";
import { HeaderButton } from "../../../src/components/ui/HeaderButton";
import { useThemeColors } from "../../../src/lib/useThemeColors";

import Animated, { useSharedValue } from "react-native-reanimated";

import ProfileHeader, {
  PROFILE_COVER_HEIGHT_FULL,
  PROFILE_COVER_OVERLAP_PT,
} from "../../../src/components/shared/ProfileHeader";
import ActivityFeedSection from "../../../src/features/profile/components/fivecorefunction/ActivityFeedSection";
import CollapsingHeaderBg from "../../../src/features/profile/components/CollapsingHeaderBg";
import CollapsingHeaderTitle from "../../../src/features/profile/components/CollapsingHeaderTitle";
import PublicStatsSection from "../../../src/features/profile/components/PublicStatsSection";
import ProfileListsWrapper from "../../../src/features/profile/components/ProfileListsWrapper";
import ProfileChromeRoot from "../../../src/features/profile/components/ProfileChromeRoot";
import type {
  ProfileChromeTab,
  ProfileChromePageHandle,
} from "../../../src/features/profile/components/ProfileChromeRoot.types";
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

// Other-user profile keeps all 3 tabs. Stats tab here is the PUBLIC stats
// (PublicStatsSection + badges), not the self-only StatsAndBadgesSection —
// preserved as a "pure chrome rewrite" (functionality unchanged).
const OTHER_TABS: readonly ProfileChromeTab[] = [
  { key: "activity", label: "Activity" },
  { key: "stats", label: "Stats & Badges" },
  { key: "lists", label: "Lists" },
];
const HERO_HEIGHT = PROFILE_COVER_HEIGHT_FULL - PROFILE_COVER_OVERLAP_PT;

export default function PublicProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { tt } = useI18N();

  // BG: the Activity tab pulls polymorphic posts through
  // ActivityFeedSection → useCommunityStore.userActivityByUserId, so we
  // no longer destructure `posts` from the public profile hook.
  const { profile, badges, sessionSummary, loading } = usePublicProfile(id ?? null);
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

  // 0 = chrome at rest (CollapsingHeader nav chrome invisible) → 1 = pinned.
  // ProfileChromeRoot writes this from the active tab's synchronized scrollY;
  // we feed it to the nav bar via setOptions.
  const pinFadeProgress = useSharedValue<number>(0);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: HEADER_TRANSPARENT,
      // Belt-and-suspenders: see profile/index.tsx for why this is set
      // both here AND in app/community/_layout.tsx.
      scrollEdgeEffects: { top: "hidden" },
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
      // Window BG — collapsing nav: nav bar fades opaque + mini avatar
      // + name slides in as the user scrolls past the cover. Mirrors the
      // self profile screen.
      headerBackground: () => (
        <CollapsingHeaderBg pinFadeProgress={pinFadeProgress} />
      ),
      headerTitle: () =>
        profile ? (
          <CollapsingHeaderTitle
            pinFadeProgress={pinFadeProgress}
            avatarUrl={profile.avatarUrl}
            name={profile.displayName}
          />
        ) : null,
    });
  }, [navigation, router, pinFadeProgress, profile?.avatarUrl, profile?.displayName]);

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

  return (
    <View style={dynStyles.screenRoot}>
      <ProfileChromeRoot
        viewMode="other"
        tabs={OTHER_TABS}
        heroHeight={HERO_HEIGHT}
        pinFadeProgress={pinFadeProgress}
        renderHero={(activeScrollY) => (
          <ProfileHeader
            name={profile.displayName}
            username={profile.username}
            avatarUrl={profile.avatarUrl}
            coverUrl={profile.coverUrl}
            bio={profile.bio}
            homeGym={profile.homeGym}
            followersCount={localFollowersCount}
            followingCount={profile.followingCount}
            viewMode="other"
            isFollowing={isFollowing}
            followLoading={followLoading}
            msgLoading={msgLoading}
            onFollowPress={handleFollow}
            onMessagePress={handleMessage}
            onFollowersPress={() => router.push(`/profile/followers?userId=${id}` as any)}
            onFollowingPress={() => router.push(`/profile/following?userId=${id}` as any)}
            scrollY={activeScrollY}
            bleedUnderHeader={false}
            boulderGrade={profile.boulderMax || "—"}
            routeGrade={profile.routeMax || "—"}
            totalSends={profile.totalSends}
            // Public profile contract has no session count → card renders "—".
            onKPIPress={() => router.push(`/users/${id}/ascents` as any)}
          />
        )}
        renderPage={(handle) => {
          switch (handle.key) {
            case "activity":
              return privacy?.posts === false ? (
                <HandleScroller handle={handle} colors={colors}>
                  <PrivateSection
                    message={tt({ zh: "帖子已设为私密", en: "Posts are private" })}
                    colors={colors}
                  />
                </HandleScroller>
              ) : (
                <ActivityFeedSection userId={id!} viewMode="other" pageHandle={handle} />
              );
            case "stats":
              return (
                <HandleScroller handle={handle} colors={colors}>
                  {/* Stats card (public) — body info / lists / radar are self-only */}
                  {privacy?.analysis === false ? (
                    <PrivateSection
                      message={tt({ zh: "统计数据已设为私密", en: "Stats are private" })}
                      colors={colors}
                    />
                  ) : (
                    <PublicStatsSection profile={profile} sessionSummary={sessionSummary} />
                  )}

                  {/* Badges (public, sub-section under Stats segment) */}
                  {privacy?.badges === false ? (
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
                  )}
                </HandleScroller>
              );
            case "lists":
              return (
                <ProfileListsWrapper
                  pageHandle={handle}
                  userId={id}
                  contentPaddingHorizontal={16}
                />
              );
            default:
              return null;
          }
        }}
      />

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

/**
 * Window BX — wraps inline tab content (other-user stats/badges, privacy
 * placeholders) in the page's own Animated.ScrollView so it participates in
 * the fixed-chrome collapse. Sections that already own a scroller
 * (ActivityFeedSection, ProfileListsWrapper) don't use this.
 */
function HandleScroller({
  handle,
  colors,
  children,
}: {
  handle: ProfileChromePageHandle;
  colors: ReturnType<typeof useThemeColors>;
  children: ReactNode;
}) {
  return (
    <Animated.ScrollView
      ref={handle.scrollRef}
      onScroll={handle.scrollHandler}
      scrollEventThrottle={1}
      showsVerticalScrollIndicator={false}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: handle.contentInsetTop,
        paddingBottom: handle.contentInsetBottom,
      }}
    >
      {children}
    </Animated.ScrollView>
  );
}

const createDynStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  screenRoot: { flex: 1, backgroundColor: colors.background },
  emptyState: { padding: 48, alignItems: "center" },
  emptyText: { color: colors.textTertiary, marginTop: 8 },
  // Badges
  badgeSectionBlock: { marginBottom: 16 },
  badgeSectionTitle: { fontSize: 13, fontWeight: "600", color: colors.textSecondary, marginBottom: 8, paddingHorizontal: 12 },
});
