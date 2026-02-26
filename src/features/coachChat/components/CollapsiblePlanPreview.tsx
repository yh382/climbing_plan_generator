// src/features/coachChat/components/CollapsiblePlanPreview.tsx
import { Pressable, ScrollView, Text, View } from "react-native";
import type { DraftPlan } from "../types";
import { Ionicons } from "@expo/vector-icons";

const PREVIEW_HEIGHT = 150;

export default function CollapsiblePlanPreview({
  plan,
  onExpand,
}: {
  plan: DraftPlan | null;
  onExpand: () => void;
}) {
  const title = plan?.title ?? "Plan Preview";
  const subtitle = plan?.subtitle ?? "Start chatting to generate a plan.";
  const bullets = plan?.bullets ?? ["No draft yet."];

  return (
    <View
      style={{
        marginHorizontal: 16,
        marginTop: 10,
        height: PREVIEW_HEIGHT,
        borderRadius: 22,
        borderWidth: 0.8,
        borderColor: "#E5E7EB",
        backgroundColor: "#0B1220",
        overflow: "hidden",
      }}
    >
      <View style={{ flex: 1, padding: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={{ color: "#FFF", fontSize: 18, fontWeight: "900" }} numberOfLines={1}>
              {title}
            </Text>
            <Text style={{ color: "rgba(255,255,255,0.75)", marginTop: 6 }} numberOfLines={2}>
              {subtitle}
            </Text>
          </View>
          <Pressable onPress={onExpand} hitSlop={12}>
            <Ionicons name="chevron-up" size={22} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ marginTop: 14, flex: 1 }}
        >
          {bullets.map((b, idx) => (
            <View key={`${idx}-${b}`} style={{ flexDirection: "row", gap: 8, marginBottom: 6 }}>
              <Text style={{ color: "rgba(255,255,255,0.7)" }}>•</Text>
              <Text style={{ color: "rgba(255,255,255,0.85)", flex: 1 }} numberOfLines={1}>
                {b}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}
