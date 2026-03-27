import { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Pressable,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";

import SegmentedTabs from "./component/SegmentedTabs";
import LeaderboardFilters from "./component/LeaderboardFilters";
import RankingRowCard from "./component/RankingRowCard";
import { HeaderButton } from "@/components/ui/HeaderButton";

import { useChallengeDetailData } from "./data/useChallengeDetailData";
import { useUserStore } from "@/store/useUserStore";

import ChallengeDetailsModal from "./ChallengeDetailsModal";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

const COVER_H = 280;
const SIDE_PADDING = 12;

function formatYMD(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function daysLeft(endISO?: string) {
  if (!endISO) return null;
  const end = new Date(endISO);
  if (Number.isNaN(end.getTime())) return null;

  const now = new Date();
  const endUTC = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  const nowUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.ceil((endUTC - nowUTC) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

// Category chip
function CategoryChip({ text }: { text: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.chip as ViewStyle}>
      <Text style={styles.chipText as TextStyle}>{text}</Text>
    </View>
  );
}

// Info row
function InfoRow({
  icon,
  children,
  right,
  isLast = false,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
  right?: React.ReactNode;
  isLast?: boolean;
  onPress?: () => void;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const Content = (
    <View style={[styles.infoRow as ViewStyle, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={22} color={colors.textSecondary} />
      </View>
      <View style={styles.infoContent}>
        <View style={{ flex: 1, paddingRight: 8, justifyContent: "center" }}>{children}</View>
        {right ? <View style={styles.infoRight}>{right}</View> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
        {Content}
      </Pressable>
    );
  }
  return Content;
}

export default function ChallengeDetailScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler((event) => {
    scrollY.value = event.contentOffset.y;
  });

  const coverParallaxStyle = useAnimatedStyle(() => {
    const adjustedScrollY = scrollY.value + headerHeight;
    if (adjustedScrollY >= 0) return {};
    const absScroll = -adjustedScrollY;
    return {
      transform: [
        { scale: 1 + absScroll / COVER_H },
        { translateY: adjustedScrollY / 2 },
      ],
    };
  });

  const currentUser = useUserStore((s) => s.user);

  const {
    challenge,
    leaderboard,
    loading,
    joined,
    onToggleJoin,
    peopleFilter,
    genderFilter,
    setPeopleFilter,
    setGenderFilter,
  } = useChallengeDetailData();

  const myEntry = leaderboard.find((u) => u.userId === currentUser?.id);

  const [tab, setTab] = useState<"leaderboard">("leaderboard");

  const startText = useMemo(() => formatYMD(challenge?.startAt), [challenge?.startAt]);
  const endText = useMemo(() => formatYMD(challenge?.endAt), [challenge?.endAt]);
  const left = useMemo(() => daysLeft(challenge?.endAt), [challenge?.endAt]);

  const organizerName = challenge?.publisher?.name ?? "ClimMate Community";
  const participantsText = typeof challenge?.participantCount === "number" ? `${challenge.participantCount}` : "—";

  const [detailsOpen, setDetailsOpen] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTransparent: true,
      headerTitle: "",
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
      headerRight: () => <HeaderButton icon="square.and.arrow.up" onPress={() => {}} />,
      scrollEdgeEffects: { top: 'soft' },
    });
  }, [navigation, router, challenge]);

  // Loading state
  if (loading || !challenge) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#9CA3AF" />
      </View>
    );
  }

  // Build chips from highlights or challengeKind
  const chipTexts: string[] = challenge.highlights?.slice(0, 3)
    ?? (challenge.challengeKind ? [challenge.challengeKind] : []);

  // Reward text from rewardPayload
  const rewardTexts: string[] = challenge.rewardPayload
    ? Object.values(challenge.rewardPayload).filter((v): v is string => typeof v === "string")
    : [];

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* === Hero === */}
        <View style={styles.heroWrap}>
          <Animated.View style={[coverParallaxStyle, { marginTop: -headerHeight, overflow: "hidden" }]}>
            <View style={[styles.coverWrap, { height: COVER_H, backgroundColor: "#0F0E0C" }]}>
              {challenge.coverUrl ? <Image source={{ uri: challenge.coverUrl }} style={styles.coverImg} /> : null}
              <View style={styles.coverScrim} />

              <View style={styles.coverChips}>
                {chipTexts.map((c) => (
                  <CategoryChip key={c} text={c} />
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Badge/Trophy Center (Strava style) */}
          <View style={styles.badgeCenterWrap}>
            <View style={styles.badgeCircle}>
              <Ionicons name="trophy" size={36} color="#F59E0B" />
            </View>
            <Text style={styles.badgeSubtext}>Complete to earn this badge</Text>
          </View>
        </View>

        {/* === Main content === */}
        <View style={styles.mainBlock}>
          <Text style={styles.title}>{challenge.title}</Text>

          {/* Join / Joined panel */}
          {joined ? (
            <View style={styles.joinedPanel}>
              <View style={styles.joinedRow}>
                <View style={styles.joinedStat}>
                  <Text style={styles.joinedStatValue}>{myEntry?.score ?? 0}</Text>
                  <Text style={styles.joinedStatLabel}>My Points</Text>
                </View>
                {left !== null && (
                  <>
                    <View style={styles.joinedDivider} />
                    <View style={styles.joinedStat}>
                      <Text style={styles.joinedStatValue}>{left}</Text>
                      <Text style={styles.joinedStatLabel}>Days Left</Text>
                    </View>
                  </>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity activeOpacity={0.9} style={styles.joinBtn} onPress={onToggleJoin}>
              <Text style={styles.joinBtnText}>Join Challenge</Text>
            </TouchableOpacity>
          )}

          {/* === Info list === */}
          <View style={styles.infoListContainer}>
            <InfoRow icon="business-outline">
              <Text style={styles.infoValue}>
                <Text style={{ fontWeight: "400", color: colors.textSecondary }}>Hosted by </Text>
                {organizerName}
              </Text>
            </InfoRow>

            <InfoRow
              icon="calendar-clear-outline"
              right={left !== null ? <Text style={styles.daysLeftPill}>{left} days left</Text> : null}
            >
              <Text style={styles.infoValue}>
                {startText && endText ? `${startText} - ${endText}` : startText || "—"}
              </Text>
            </InfoRow>

            <InfoRow icon="trophy-outline">
              {rewardTexts.length > 0 ? (
                <Text style={styles.infoValue} numberOfLines={1}>
                  {rewardTexts.join(" · ")}
                </Text>
              ) : (
                <Text style={styles.infoMuted}>No prizes yet</Text>
              )}
            </InfoRow>

            <InfoRow
              icon="information-circle-outline"
              isLast
              onPress={() => setDetailsOpen(true)}
              right={<Ionicons name="chevron-forward" size={18} color="#9CA3AF" />}
            >
              <Text style={styles.infoValue} numberOfLines={3}>
                {challenge.description || "View challenge details and rules."}
              </Text>
            </InfoRow>
          </View>
        </View>

        {/* === Leaderboard (hidden for lifetime/skill challenges) === */}
        {challenge.category !== "lifetime" && challenge.category !== "skill" && (
          <View style={styles.leaderboardSection}>
            <View style={styles.leaderboardCard}>

              <View style={styles.leaderHeaderRow}>
                <Text style={styles.cardTitle}>Leaderboard</Text>
                <View style={styles.participantsBadge}>
                  <Ionicons name="people" size={12} color="#4B5563" style={{marginRight:4}}/>
                  <Text style={styles.participantsText}>{participantsText}</Text>
                </View>
              </View>

              {/* Controls Row */}
              <View style={styles.controlsRow}>
                <View style={{ flex: 1, marginRight: 12 }}>
                  <SegmentedTabs
                    value={tab}
                    options={[
                      { key: "leaderboard", label: "Ranking" },
                    ]}
                    onChange={setTab}
                  />
                </View>

                <View style={{ zIndex: 10 }}>
                  <LeaderboardFilters
                    people={peopleFilter}
                    gender={genderFilter}
                    onChangePeople={setPeopleFilter}
                    onChangeGender={setGenderFilter}
                  />
                </View>
              </View>

              {/* Leaderboard content */}
              <View style={{ marginTop: 4 }}>
                {leaderboard.length === 0 ? (
                  <View style={{ padding: 20, alignItems: "center" }}>
                    <Text style={{ color: colors.textTertiary, fontSize: 14 }}>No rankings yet.</Text>
                  </View>
                ) : (
                  <View style={{ gap: 8 }}>
                    {leaderboard.map((u) => (
                      <RankingRowCard
                        key={u.userId}
                        rank={u.rank}
                        user={{
                          userId: u.userId,
                          name: u.username || "Unknown",
                          points: u.score,
                          gender: "other",
                          isFollowing: false,
                        }}
                        onPress={() => router.push(`/community/u/${u.userId}`)}
                      />
                    ))}
                  </View>
                )}
              </View>

            </View>
          </View>
        )}
      </Animated.ScrollView>

      <ChallengeDetailsModal
        visible={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Details"
        content={challenge.description || "No details."}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  heroWrap: { position: "relative" },
  coverWrap: { width: "100%" },
  coverImg: { width: "100%", height: "100%" },
  coverScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,14,12,0.35)",
  },

  coverChips: {
    position: "absolute",
    right: SIDE_PADDING,
    bottom: 12,
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.cardDark,
    justifyContent: "center",
  },
  chipText: { fontSize: 12, fontFamily: theme.fonts.bold, color: "#FFFFFF" },

  badgeCenterWrap: {
    alignItems: "center",
    marginTop: -40,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  badgeCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FEF3C7",
  },
  badgeSubtext: {
    fontSize: 12,
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
    marginTop: 6,
  },

  mainBlock: {
    paddingHorizontal: SIDE_PADDING,
    paddingBottom: 8,
  },

  title: {
    fontSize: 30,
    fontFamily: theme.fonts.black,
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 20,
    marginTop: 4,
    lineHeight: 34,
    textAlign: "center",
  },

  joinBtn: {
    height: 48,
    width: 200,
    alignSelf: "center",
    borderRadius: theme.borderRadius.pill,
    backgroundColor: colors.cardDark,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  joinBtnText: { fontSize: 15, fontFamily: theme.fonts.bold, color: "#FFFFFF" },

  joinedPanel: {
    borderRadius: theme.borderRadius.card,
    backgroundColor: colors.backgroundSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginBottom: 20,
  },
  joinedRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  joinedStat: { flex: 1, alignItems: "center" },
  joinedStatValue: { fontSize: 24, fontFamily: theme.fonts.monoMedium, color: colors.textPrimary },
  joinedStatLabel: { fontSize: 12, fontFamily: theme.fonts.medium, color: colors.textSecondary, marginTop: 2 },
  joinedDivider: { width: 1, height: 32, backgroundColor: colors.border, marginHorizontal: 16 },

  infoListContainer: {
    marginTop: 0,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIconWrap: {
    width: 28,
    alignItems: "center",
    marginRight: 10,
  },
  infoContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  infoMuted: {
    fontSize: 15,
    fontFamily: theme.fonts.medium,
    color: colors.textTertiary,
  },
  infoRight: { marginLeft: 8 },

  daysLeftPill: {
    fontSize: 12,
    fontFamily: theme.fonts.monoMedium,
    color: "#FFFFFF",
    backgroundColor: colors.cardDark,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    overflow: "hidden",
  },

  leaderboardSection: {
    paddingHorizontal: SIDE_PADDING,
    marginTop: 10,
  },
  leaderboardCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    zIndex: 1,
  },

  leaderHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },

  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    zIndex: 20,
  },

  cardTitle: { fontSize: 18, fontFamily: theme.fonts.black, color: colors.textPrimary },

  participantsBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  participantsText: { fontSize: 12, fontFamily: theme.fonts.bold, color: colors.textSecondary },
});
