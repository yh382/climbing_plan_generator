import React from "react";
import { Text, View } from "react-native";
import type { CoachPhase } from "../types";

const PHASES: { key: CoachPhase; en: string; zh: string }[] = [
  { key: "collect", en: "Collect", zh: "收集信息" },
  { key: "draft", en: "Draft", zh: "生成草案" },
  { key: "match", en: "Match", zh: "匹配动作" },
  { key: "schedule", en: "Schedule", zh: "排课进阶" },
];

export default function PhaseIndicator({ phase }: { phase: CoachPhase }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, height: 28 }}>
      {PHASES.map((p, i) => {
        const active = p.key === phase;
        return (
          <React.Fragment key={p.key}>
            {i > 0 && (
              <Text style={{ fontSize: 12, color: "#D1D5DB", marginHorizontal: 6 }}>·</Text>
            )}
            <Text
              style={{
                fontSize: 13,
                fontWeight: active ? "800" : "400",
                color: active ? "#306E6F" : "#9CA3AF",
              }}
            >
              {p.en}
            </Text>
          </React.Fragment>
        );
      })}
    </View>
  );
}
