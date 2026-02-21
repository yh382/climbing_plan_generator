// src/features/profile/components/badgessection/BadgesSection.tsx

import React, { useMemo } from "react";
import { View, Text, StyleSheet, FlatList, useWindowDimensions } from "react-native";
import BadgeCard from "../badgessection/BadgeCard";
import { mockBadges } from "../badgessection/mockBadges";
import type { Badge, BadgeSectionKey } from "../badgessection/types";

const SECTION_LABEL: Record<BadgeSectionKey, string> = {
  challenge: "Challenge",
  milestone: "Milestone",
  influence: "Influence",
};

function sortBadgesForDisplay(list: Badge[]) {
  const copy = [...list];
  copy.sort((a, b) => {
    if (a.status !== b.status) return a.status === "unlocked" ? -1 : 1;
    const ap = a.progress ?? 0;
    const bp = b.progress ?? 0;
    return bp - ap;
  });
  return copy;
}

export default function BadgesSection({ styles: externalStyles }: { styles: any }) {
  const { width } = useWindowDimensions();

  const outerPadding = 12; // ✅ 更贴边
  const colGap = 10;
  const columns = 3;

  const cardSize = useMemo(() => {
    return (width - outerPadding * 2 - colGap * (columns - 1)) / columns;
  }, [width]);

  const all = useMemo(() => sortBadgesForDisplay(mockBadges), []);
  const unlockedCount = useMemo(() => all.filter((b) => b.status === "unlocked").length, [all]);

  const sections = useMemo(() => {
    const challenge = sortBadgesForDisplay(all.filter((b) => b.section === "challenge"));
    const milestone = sortBadgesForDisplay(all.filter((b) => b.section === "milestone"));
    const influence = sortBadgesForDisplay(all.filter((b) => b.section === "influence"));

    return [
      { key: "challenge" as const, data: challenge },
      { key: "milestone" as const, data: milestone },
      { key: "influence" as const, data: influence },
    ].filter((s) => s.data.length > 0);
  }, [all]);

  const onPressBadge = (badge: Badge) => {
    // 之后做 detail sheet 就从这里触发
    // console.log("badge", badge.id);
  };

  return (
    <View style={[styles.container, externalStyles?.badgesContainer]}>
      {/* Header：左对齐 + 更贴近内容 */}
      <View style={[styles.headerRow, { paddingHorizontal: outerPadding }]}>
        <Text style={styles.title}>Badges</Text>
        <Text style={styles.counter}>
          {unlockedCount} / {all.length} unlocked
        </Text>
      </View>

      {/* 分区 */}
      {sections.map((section) => (
        <View key={section.key} style={styles.sectionBlock}>
          <Text style={[styles.sectionTitle, { paddingHorizontal: outerPadding }]}>
            {SECTION_LABEL[section.key]}
          </Text>

          <FlatList
            data={section.data}
            keyExtractor={(item) => item.id}
            numColumns={columns}
            columnWrapperStyle={{ gap: colGap }}
            contentContainerStyle={{
              paddingHorizontal: outerPadding,
              paddingTop: 8,    // ✅ 更紧凑
              paddingBottom: 4,
              gap: colGap,
            }}
            renderItem={({ item }) => (
              <BadgeCard badge={item} size={cardSize} onPress={onPressBadge} />
            )}
            scrollEnabled={false}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 6, // ✅ 顶部更贴
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 6, // ✅ 减少上面空白
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
  counter: {
    fontSize: 12,
    color: "rgba(17,17,17,0.6)",
    fontWeight: "700",
  },

  sectionBlock: {
    marginTop: 10, // 分区之间留点呼吸
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "rgba(17,17,17,0.75)",
    marginBottom: 2,
  },
});

