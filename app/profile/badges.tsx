import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, useWindowDimensions, Pressable } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBadgesProgress } from "@/features/community/hooks";
import BadgeCard from "@/features/profile/components/badgessection/BadgeCard";
import TopBar from "../../components/TopBar";
import type { Badge, BadgeSectionKey, BadgeTier } from "@/features/profile/components/badgessection/types";

const COLUMNS = 3;
const PADDING = 12;
const GAP = 6;
const COLLAPSED_COUNT = 6;

function toBadge(bp: any): Badge {
  return {
    id: bp.code,
    title: bp.name,
    section: bp.category as BadgeSectionKey,
    tier: (bp.tier ?? null) as BadgeTier,
    status: bp.isAwarded ? "unlocked" : "locked",
    progress: bp.progress,
    iconUrl: bp.iconUrl,
    awardedAt: bp.awardedAt,
    sourceType: bp.sourceType,
    sourceId: bp.sourceId,
  };
}

const DISPLAY_GROUPS = [
  { key: "boulder_limit", title: "Boulder Limit", filter: (b: Badge) => b.id.startsWith("limit_boulder_") },
  { key: "boulder_solid", title: "Boulder Solid", filter: (b: Badge) => b.id.startsWith("solid_boulder_") },
  { key: "rope_limit", title: "Rope Limit", filter: (b: Badge) => b.id.startsWith("limit_rope_") },
  { key: "rope_solid", title: "Rope Solid", filter: (b: Badge) => b.id.startsWith("solid_rope_") },
  { key: "lifetime", title: "Lifetime", filter: (b: Badge) => b.section === "lifetime" },
  { key: "monthly", title: "Monthly", filter: (b: Badge) => b.section === "monthly" },
  { key: "milestone", title: "Milestone", filter: (b: Badge) => b.section === "milestone" },
  { key: "influence", title: "Influence", filter: (b: Badge) => b.section === "influence" },
  { key: "special", title: "Special", filter: (b: Badge) => b.section === "special" },
];

export default function AllBadgesPage() {
  const { badges: rawBadges, loading } = useBadgesProgress();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const cardSize = useMemo(() => {
    return (width - PADDING * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  }, [width]);

  const allBadges = useMemo(() => rawBadges.map(toBadge), [rawBadges]);
  const awardedCount = allBadges.filter(b => b.status === "unlocked").length;

  const grouped = useMemo(() => {
    return DISPLAY_GROUPS
      .map(g => {
        const filtered = allBadges.filter(g.filter);
        // Sort: unlocked first, then within each group descending difficulty
        const unlocked = filtered.filter(b => b.status === "unlocked").reverse();
        const locked = filtered.filter(b => b.status === "locked").reverse();
        return { ...g, badges: [...unlocked, ...locked] };
      })
      .filter(g => g.badges.length > 0);
  }, [allBadges]);

  const toggleSection = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", paddingTop: insets.top }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TopBar
        routeName="badges"
        title="All Badges"
        useSafeArea={false}
        leftControls={{ mode: "back", onBack: () => router.back() }}
      />
      <FlatList
        data={grouped}
        keyExtractor={item => item.key}
        contentContainerStyle={styles.container}
        ListHeaderComponent={
          <Text style={styles.headerSub}>{awardedCount} / {allBadges.length} earned</Text>
        }
        renderItem={({ item: group }) => {
          const isExpanded = expanded[group.key] ?? false;
          const hasMore = group.badges.length > COLLAPSED_COUNT;
          const visible = isExpanded ? group.badges : group.badges.slice(0, COLLAPSED_COUNT);

          return (
            <View style={styles.section}>
              <Pressable
                style={styles.sectionHeader}
                onPress={hasMore ? () => toggleSection(group.key) : undefined}
              >
                <Text style={styles.sectionTitle}>{group.title}</Text>
                {hasMore && (
                  <Text style={styles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
                )}
              </Pressable>
              <View style={styles.grid}>
                {visible.map(badge => (
                  <BadgeCard
                    key={badge.id}
                    badge={badge}
                    size={cardSize}
                    onPress={badge.sourceType === "challenge" && badge.sourceId
                      ? () => router.push(`/community/challenges/${badge.sourceId}`)
                      : undefined
                    }
                  />
                ))}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: PADDING, paddingBottom: 40 },
  headerSub: { fontSize: 14, color: "#666", marginBottom: 16 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#333" },
  chevron: { fontSize: 12, color: "#999" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
});
