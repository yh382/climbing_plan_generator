import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { AbilityRadarNative } from "../../../../../../modules/climmate-charts/src";

const { width: SCREEN_W } = Dimensions.get("window");

type Props = {
  data: {
    finger: number;
    pull: number;
    core: number;
    flex: number;
    sta: number;
  };
  styles?: any;
  title?: string;
};

export default function AbilityRadar({ data, styles: _styles, title: _title = "Ability Radar" }: Props) {
  // Hevy-reference layout: chart fills the card with no title row + minimal
  // padding. Outer card padding is owned by the parent card-wrapper (see
  // StatsAndBadgesSection.radarCardWrapper).
  const CHART_SIZE = useMemo(() => {
    const candidate = SCREEN_W * 0.7;
    return Math.max(220, Math.min(300, candidate));
  }, []);

  return (
    <View style={local.chartWrap}>
      <AbilityRadarNative data={data} size={CHART_SIZE} />
    </View>
  );
}

const local = StyleSheet.create({
  chartWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
});
