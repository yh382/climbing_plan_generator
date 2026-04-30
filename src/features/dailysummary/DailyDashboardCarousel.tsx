// src/features/dailysummary/DailyDashboardCarousel.tsx
// Horizontal carousel for the daily summary dashboard: 3 swipable pages.

import React, { useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { useThemeColors } from "../../lib/useThemeColors";
import RingsPage from "./RingsPage";
import DailyGradePyramid from "./DailyGradePyramid";
import CSMDailyCard from "./CSMDailyCard";
import type { DailyData } from "./useDailyData";

const PAGE_HEIGHT = 240;

type Props = {
  data: DailyData;
};

export default function DailyDashboardCarousel({ data }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width: screenWidth } = Dimensions.get("window");
  const [page, setPage] = useState(0);

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const p = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
          setPage(p);
        }}
      >
        <View style={{ width: screenWidth, height: PAGE_HEIGHT, paddingHorizontal: 16, justifyContent: "center" }}>
          <RingsPage
            timeOnWallMin={data.kpis.timeOnWallMin}
            timeOnWallPct={data.timeOnWallPct}
            topsRatePct={data.topsRatePct}
            sends={data.kpis.sends}
            attempts={data.kpis.attempts}
            quickLogCount={data.kpis.quickLogCount}
          />
        </View>
        <View style={{ width: screenWidth, height: PAGE_HEIGHT, paddingHorizontal: 16, justifyContent: "center" }}>
          <DailyGradePyramid data={data.gradePyramid} />
        </View>
        <View style={{ width: screenWidth, height: PAGE_HEIGHT, paddingHorizontal: 16, justifyContent: "center" }}>
          <CSMDailyCard />
        </View>
      </ScrollView>

      <View style={styles.dotRow}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.dot, page === i && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: { paddingTop: 8 },
    dotRow: {
      flexDirection: "row",
      justifyContent: "center",
      alignItems: "center",
      gap: 6,
      marginTop: 8,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.textTertiary,
      opacity: 0.5,
    },
    dotActive: {
      backgroundColor: colors.accent,
      width: 8,
      height: 8,
      borderRadius: 4,
      opacity: 1,
    },
  });
