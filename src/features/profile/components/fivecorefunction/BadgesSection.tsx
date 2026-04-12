// src/features/profile/components/fivecorefunction/BadgesSection.tsx

import { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, useWindowDimensions, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import BadgeCard from "../badgessection/BadgeCard";
import BadgeDetailModal from "../badgessection/BadgeDetailModal";
import type { Badge, BadgeSectionKey, BadgeTier } from "../badgessection/types";
import { useBadgesProgress, BadgeProgress } from "../../../community/hooks";
import { useUserStore } from "@/store/useUserStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "src/contexts/SettingsContext";

/** Map backend BadgeProgress → frontend Badge type */
function toBadge(bp: BadgeProgress): Badge {
  return {
    id: bp.code,
    title: bp.name,
    section: bp.category as BadgeSectionKey,
    tier: (bp.tier ?? null) as BadgeTier,
    status: bp.isAwarded ? "unlocked" : "locked",
    progress: bp.progress,
    description: bp.description,
    iconUrl: bp.iconUrl,
    awardedAt: bp.awardedAt,
    sourceType: bp.sourceType,
    sourceId: bp.sourceId,
    rarity: (bp as any).rarity ?? undefined,
  };
}

/** For grade badges, same grade: solid supersedes limit (solid is harder to earn). */
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

const DISPLAY_GROUPS: { key: string; title: string; filter: (b: Badge) => boolean; dedupe?: boolean }[] = [
  { key: "boulder", title: "Boulder", filter: (b) => b.id.startsWith("limit_boulder_") || b.id.startsWith("solid_boulder_"), dedupe: true },
  { key: "rope", title: "Rope", filter: (b) => b.id.startsWith("limit_rope_") || b.id.startsWith("solid_rope_"), dedupe: true },
  { key: "lifetime", title: "Lifetime", filter: (b) => b.section === "lifetime" },
  { key: "monthly", title: "Monthly", filter: (b) => b.section === "monthly" },
];

export default function BadgesSection({ styles: externalStyles }: { styles: any }) {
  const { width } = useWindowDimensions();
  const { badges: rawBadges, loading } = useBadgesProgress();
  const router = useRouter();
  const colors = useThemeColors();
  const pinnedCodes = useUserStore((s) => s.user?.pinned_badges) ?? [];

  const outerPadding = 12;
  const colGap = 10;

  const cardSize = useMemo(() => {
    return (width - outerPadding * 2 - colGap * 2) / 3;
  }, [width]);

  const allBadges = useMemo(() => rawBadges.map(toBadge), [rawBadges]);

  const awardedBadges = useMemo(() => {
    return allBadges.filter(b => b.status === "unlocked");
  }, [allBadges]);

  // Pinned / Featured badges (matched by code against loaded badge data)
  const pinnedBadges = useMemo(() => {
    if (pinnedCodes.length === 0) return [];
    return pinnedCodes
      .map((code) => allBadges.find((b) => b.id === code))
      .filter(Boolean) as Badge[];
  }, [pinnedCodes, allBadges]);

  const groupedAwarded = useMemo(() => {
    return DISPLAY_GROUPS
      .map(g => {
        const filtered = awardedBadges.filter(g.filter);
        const deduped = g.dedupe ? deduplicateGradeBadges(filtered) : filtered;
        // Show hardest badges first (reverse backend ascending sort_order)
        return { ...g, badges: [...deduped].reverse() };
      })
      .filter(g => g.badges.length > 0);
  }, [awardedBadges]);

  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const onPressBadge = (badge: Badge) => {
    setSelectedBadge(badge);
  };

  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);

  if (loading && allBadges.length === 0) {
    return (
      <View style={[styles.container, externalStyles?.badgesContainer, { padding: 24, alignItems: "center" }]}>
        <ActivityIndicator size="small" color="#111" />
      </View>
    );
  }

  return (
    <View style={[styles.container, externalStyles?.badgesContainer]}>
      {/* Header with count + Show All */}
      <View style={styles.headerRow}>
        <Text style={styles.title}>
          {awardedBadges.length} Badges Earned
        </Text>
        <Pressable onPress={() => router.push("/profile/badges")}>
          <Text style={styles.showAll}>Show All →</Text>
        </Pressable>
      </View>

      {/* Featured / Pinned badges */}
      {pinnedBadges.length > 0 && (
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { color: colors.accent }]}>★ Featured</Text>
          <FlatList
            data={pinnedBadges}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={item => `pinned_${item.id}`}
            renderItem={({ item }) => (
              <BadgeCard badge={item} size={cardSize} onPress={onPressBadge} />
            )}
            ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
            contentContainerStyle={{ paddingHorizontal: outerPadding }}
          />
        </View>
      )}

      {awardedBadges.length === 0 ? (
        <Text style={styles.emptyText}>
          No badges earned yet. Keep climbing!
        </Text>
      ) : (
        groupedAwarded.map(group => (
          <View key={group.key} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>{group.title}</Text>
            <FlatList
              data={group.badges}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <BadgeCard badge={item} size={cardSize} onPress={onPressBadge} />
              )}
              ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
              contentContainerStyle={{ paddingHorizontal: outerPadding }}
            />
          </View>
        ))
      )}
      <BadgeDetailModal
        badge={selectedBadge}
        visible={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        tr={tr}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111",
  },
  showAll: {
    fontSize: 13,
    color: "#2563eb",
  },

  emptyText: {
    textAlign: "center",
    color: "#999",
    paddingVertical: 24,
  },

  sectionBlock: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    paddingHorizontal: 12,
  },
});
