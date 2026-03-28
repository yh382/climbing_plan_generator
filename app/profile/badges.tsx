import React, { useLayoutEffect, useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet, useWindowDimensions, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { HeaderButton } from "../../src/components/ui/HeaderButton";

import { useBadgesProgress } from "@/features/community/hooks";
import BadgeCard from "@/features/profile/components/badgessection/BadgeCard";
import { useThemeColors } from "@/lib/useThemeColors";
import type { ThemeColors } from "@/lib/theme";

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
];

export default function AllBadgesPage() {
  const { badges: rawBadges, loading } = useBadgesProgress();
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const colors = useThemeColors();
  const dynamicStyles = useMemo(() => createStyles(colors), [colors]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: "Badges",
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, router]);

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        contentInsetAdjustmentBehavior="automatic"
        data={grouped}
        keyExtractor={item => item.key}
        contentContainerStyle={dynamicStyles.container}
        ListHeaderComponent={
          <Text style={dynamicStyles.headerSub}>{awardedCount} / {allBadges.length} earned</Text>
        }
        renderItem={({ item: group }) => {
          const isExpanded = expanded[group.key] ?? false;
          const hasMore = group.badges.length > COLLAPSED_COUNT;
          const visible = isExpanded ? group.badges : group.badges.slice(0, COLLAPSED_COUNT);

          return (
            <View style={dynamicStyles.section}>
              <Pressable
                style={dynamicStyles.sectionHeader}
                onPress={hasMore ? () => toggleSection(group.key) : undefined}
              >
                <Text style={dynamicStyles.sectionTitle}>{group.title}</Text>
                {hasMore && (
                  <Text style={dynamicStyles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
                )}
              </Pressable>
              <View style={dynamicStyles.grid}>
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

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { padding: PADDING, paddingBottom: 40 },
    headerSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
    section: { marginBottom: 24 },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    chevron: { fontSize: 12, color: colors.textSecondary },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
  });
}
