// app/profile/badges.tsx
// Full badge collection page — redesigned for visual clarity:
//   - Hero card: next-to-unlock or latest earned badge
//   - 2-column grid (bigger badges, more breathing room)
//   - Sections collapsed by default (header + earned count only)
//   - Tap section → expand to show all badges in that group
//   - i18n: zh/en via useSettings

import { useCallback, useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  ActionSheetIOS,
  Alert,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../src/components/ui/HeaderButton";

import { useBadgesProgress } from "@/features/community/hooks";
import BadgeCard from "@/features/profile/components/badgessection/BadgeCard";
import GradeProgressionPath from "@/features/profile/components/badgessection/GradeProgressionPath";
import BadgeDetailModal from "@/features/profile/components/badgessection/BadgeDetailModal";
import { useThemeColors } from "@/lib/useThemeColors";
import { theme } from "@/lib/theme";
import type { ThemeColors } from "@/lib/theme";
import type { Badge, BadgeSectionKey, BadgeTier } from "@/features/profile/components/badgessection/types";
import { useSettings } from "src/contexts/SettingsContext";
import { useUserStore } from "@/store/useUserStore";

// ── Constants ──

const COLUMNS = 2;
const PADDING = 16;
const GAP = 12;

// ── Tier colors ──

const TIER_COLORS: Record<string, string> = {
  bronze: "#CD7F32",
  silver: "#A0A0A0",
  gold: "#DAA520",
  diamond: "#6ECBF5",
};

function tierColor(tier?: BadgeTier): string {
  if (!tier) return "#306E6F";
  return TIER_COLORS[tier] ?? "#306E6F";
}

// ── Data transform ──

function toBadge(bp: any): Badge {
  return {
    id: bp.code,
    title: bp.name,
    section: bp.category as BadgeSectionKey,
    tier: (bp.tier ?? null) as BadgeTier,
    status: bp.isAwarded ? "unlocked" : "locked",
    progress: bp.progress,
    description: bp.description ?? null,
    currentValue: bp.currentValue ?? 0,
    threshold: bp.threshold ?? 0,
    iconUrl: bp.iconUrl,
    awardedAt: bp.awardedAt,
    sourceType: bp.sourceType,
    sourceId: bp.sourceId,
    rarity: bp.rarity ?? undefined,
  };
}

// ── Display groups ──

const DISPLAY_GROUPS = [
  { key: "boulder_limit", titleZh: "抱石入门", titleEn: "Boulder Limit", filter: (b: Badge) => b.id.startsWith("limit_boulder_") },
  { key: "boulder_solid", titleZh: "抱石精通", titleEn: "Boulder Solid", filter: (b: Badge) => b.id.startsWith("solid_boulder_") },
  { key: "rope_limit", titleZh: "绳攀入门", titleEn: "Rope Limit", filter: (b: Badge) => b.id.startsWith("limit_rope_") },
  { key: "rope_solid", titleZh: "绳攀精通", titleEn: "Rope Solid", filter: (b: Badge) => b.id.startsWith("solid_rope_") },
  { key: "lifetime", titleZh: "终身成就", titleEn: "Lifetime", filter: (b: Badge) => b.section === "lifetime" },
  { key: "monthly", titleZh: "月度挑战", titleEn: "Monthly", filter: (b: Badge) => b.section === "monthly" },
];

// ── Hero card: "next to unlock" or "latest earned" ──

function HeroCard({
  badge,
  colors,
  tr,
}: {
  badge: Badge;
  colors: ReturnType<typeof useThemeColors>;
  tr: (zh: string, en: string) => string;
}) {
  const tColor = tierColor(badge.tier as BadgeTier);
  const locked = badge.status === "locked";
  const progress = Math.round((badge.progress ?? 0) * 100);

  return (
    <View
      style={[
        heroStyles.card,
        { backgroundColor: colors.cardBackground, borderColor: colors.border },
      ]}
    >
      {/* Badge image */}
      <View style={heroStyles.imgWrap}>
        {badge.iconUrl ? (
          <Image
            source={{ uri: badge.iconUrl }}
            style={heroStyles.img}
            contentFit="contain"
          />
        ) : (
          <View style={[heroStyles.img, { backgroundColor: colors.backgroundSecondary, alignItems: "center", justifyContent: "center" }]}>
            <Ionicons name="trophy" size={28} color={tColor} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={heroStyles.info}>
        <Text style={[heroStyles.label, { color: colors.textSecondary }]}>
          {locked ? tr("下一个目标", "Next Goal") : tr("最新解锁", "Latest Earned")}
        </Text>
        <Text style={[heroStyles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {badge.title}
        </Text>
        {badge.description && (
          <Text style={[heroStyles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
            {badge.description}
          </Text>
        )}
        {locked && typeof badge.threshold === "number" && badge.threshold > 0 && (
          <View style={heroStyles.progressRow}>
            <View style={[heroStyles.progressTrack, { backgroundColor: colors.border }]}>
              <View
                style={[
                  heroStyles.progressFill,
                  { width: `${progress}%`, backgroundColor: tColor },
                ]}
              />
            </View>
            <Text style={[heroStyles.progressText, { color: tColor }]}>
              {badge.currentValue ?? 0}/{badge.threshold}
            </Text>
          </View>
        )}
        {!locked && badge.awardedAt && (
          <Text style={[heroStyles.date, { color: colors.textTertiary }]}>
            {new Date(badge.awardedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        )}
      </View>
    </View>
  );
}

const heroStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
    gap: 14,
  },
  imgWrap: {
    width: 64,
    height: 64,
  },
  img: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 10,
    fontFamily: theme.fonts.medium,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  name: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
  },
  desc: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    lineHeight: 16,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontSize: 11,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
  },
  date: {
    fontSize: 11,
    fontFamily: theme.fonts.regular,
    marginTop: 2,
  },
});

// ── Section header ──

function SectionHeader({
  title,
  earned,
  total,
  expanded,
  onToggle,
  tier,
  colors,
}: {
  title: string;
  earned: number;
  total: number;
  expanded: boolean;
  onToggle: () => void;
  tier: string;
  colors: ReturnType<typeof useThemeColors>;
}) {
  const dotColor = TIER_COLORS[tier] ?? "#306E6F";

  return (
    <Pressable style={sectionHeaderStyles.row} onPress={onToggle}>
      <View style={sectionHeaderStyles.left}>
        <View style={[sectionHeaderStyles.dot, { backgroundColor: dotColor }]} />
        <Text style={[sectionHeaderStyles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
      </View>
      <View style={sectionHeaderStyles.right}>
        <Text style={[sectionHeaderStyles.count, { color: colors.textSecondary }]}>
          {earned}/{total}
        </Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.textTertiary}
        />
      </View>
    </Pressable>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    fontFamily: theme.fonts.bold,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  count: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
  },
});

// ── Main page ──

export default function AllBadgesPage() {
  const { badges: rawBadges, loading } = useBadgesProgress();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);
  const colors = useThemeColors();
  const { lang } = useSettings();
  const tr = useCallback(
    (zh: string, en: string) => (lang === "zh" ? zh : en),
    [lang],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tr("徽章", "Badges"),
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, router, tr]);

  const cardSize = useMemo(
    () => (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS,
    [width],
  );

  const allBadges = useMemo(() => rawBadges.map(toBadge), [rawBadges]);
  const awardedCount = allBadges.filter((b) => b.status === "unlocked").length;

  const grouped = useMemo(() => {
    return DISPLAY_GROUPS.map((g) => {
      const filtered = allBadges.filter(g.filter);
      const unlocked = filtered.filter((b) => b.status === "unlocked").reverse();
      const locked = filtered.filter((b) => b.status === "locked").reverse();
      const earnedCount = unlocked.length;

      // Infer dominant tier for section dot color
      const sectionTier =
        g.key.includes("gold") || g.key.includes("solid")
          ? "gold"
          : g.key.includes("diamond")
          ? "diamond"
          : g.key.includes("silver") || g.key.includes("limit")
          ? "silver"
          : "bronze";

      return {
        ...g,
        badges: [...unlocked, ...locked],
        earnedCount,
        sectionTier,
      };
    }).filter((g) => g.badges.length > 0);
  }, [allBadges]);

  // Hero badge: next-to-unlock (highest progress < 1) or latest earned
  const heroBadge = useMemo(() => {
    const locked = allBadges
      .filter((b) => b.status === "locked" && (b.progress ?? 0) > 0)
      .sort((a, b) => (b.progress ?? 0) - (a.progress ?? 0));
    if (locked.length > 0) return locked[0]; // closest to unlock

    const earned = allBadges
      .filter((b) => b.status === "unlocked" && b.awardedAt)
      .sort((a, b) => new Date(b.awardedAt!).getTime() - new Date(a.awardedAt!).getTime());
    return earned[0] ?? null;
  }, [allBadges]);

  const toggleSection = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ── Pin / Unpin badge to profile ──
  const pinnedCodes = useUserStore((s) => s.user?.pinned_badges) ?? [];
  const updateMe = useUserStore((s) => s.updateMe);

  const handleLongPressBadge = useCallback(
    (badge: Badge) => {
      if (badge.status !== "unlocked") return; // can only pin earned badges
      const isPinned = pinnedCodes.includes(badge.id);

      const pinLabel = isPinned
        ? tr("取消置顶", "Unpin from Profile")
        : tr("置顶到主页", "Pin to Profile");
      const cancelLabel = tr("取消", "Cancel");

      if (Platform.OS === "ios") {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: [pinLabel, cancelLabel],
            cancelButtonIndex: 1,
          },
          (idx) => {
            if (idx === 0) togglePin(badge.id, isPinned);
          },
        );
      } else {
        // Android fallback
        Alert.alert(badge.title, undefined, [
          { text: pinLabel, onPress: () => togglePin(badge.id, isPinned) },
          { text: cancelLabel, style: "cancel" },
        ]);
      }
    },
    [pinnedCodes, tr],
  );

  const togglePin = useCallback(
    (code: string, currentlyPinned: boolean) => {
      let next: string[];
      if (currentlyPinned) {
        next = pinnedCodes.filter((c) => c !== code);
      } else {
        if (pinnedCodes.length >= 3) {
          Alert.alert(
            tr("已达上限", "Limit Reached"),
            tr("最多置顶 3 个徽章", "You can pin up to 3 badges"),
          );
          return;
        }
        next = [...pinnedCodes, code];
      }
      updateMe({ pinned_badges: next } as any);
    },
    [pinnedCodes, updateMe, tr],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: PADDING, paddingBottom: 60 }}
      >
        {/* Overall progress */}
        <Text
          style={{
            fontSize: 14,
            fontFamily: theme.fonts.medium,
            color: colors.textSecondary,
            marginBottom: 16,
          }}
        >
          {awardedCount} / {allBadges.length} {tr("已获得", "earned")}
        </Text>

        {/* Hero card */}
        {heroBadge && <HeroCard badge={heroBadge} colors={colors} tr={tr} />}

        {/* Grade progression paths */}
        <GradeProgressionPath badges={allBadges} type="boulder" tr={tr} />
        <GradeProgressionPath badges={allBadges} type="rope" tr={tr} />

        {/* Sections */}
        {grouped.map((group) => {
          const isExpanded = expanded[group.key] ?? false;
          const title = lang === "zh" ? group.titleZh : group.titleEn;

          return (
            <View key={group.key} style={{ marginBottom: 20 }}>
              <SectionHeader
                title={title}
                earned={group.earnedCount}
                total={group.badges.length}
                expanded={isExpanded}
                onToggle={() => toggleSection(group.key)}
                tier={group.sectionTier}
                colors={colors}
              />

              {isExpanded && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: GAP }}>
                  {group.badges.map((badge) => (
                    <BadgeCard
                      key={badge.id}
                      badge={badge}
                      size={cardSize}
                      onPress={(b) => setSelectedBadge(b)}
                      onLongPress={handleLongPressBadge}
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>

      <BadgeDetailModal
        badge={selectedBadge}
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        tr={tr}
      />
    </View>
  );
}
