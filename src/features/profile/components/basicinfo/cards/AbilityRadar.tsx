import React, { useMemo } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
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

export default function AbilityRadar({ data, styles, title = "Ability Radar" }: Props) {
  const CHART_SIZE = useMemo(() => {
    const candidate = SCREEN_W * 0.78;
    return Math.max(240, Math.min(340, candidate));
  }, []);

  const cardStyle = styles?.statCard ?? local.fallbackCard;
  const headerStyle = styles?.cardHeader ?? local.fallbackHeader;
  const titleStyle = styles?.cardTitle ?? local.fallbackTitle;

  return (
    <View style={cardStyle}>
      <View style={headerStyle}>
        <Text style={titleStyle}>{title}</Text>
      </View>
      <View style={local.chartWrap}>
        <AbilityRadarNative data={data} size={CHART_SIZE} />
      </View>
    </View>
  );
}

const local = StyleSheet.create({
  chartWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 6,
    paddingBottom: 2,
  },
  fallbackCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
  },
  fallbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fallbackTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111",
  },
});
