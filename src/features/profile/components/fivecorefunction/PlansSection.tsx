import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";

import { TrainingPlanCard, TrainingPlan } from "../../../../components/plancard"; 
// ↑ 如果你项目里 plancard 的实际路径不同，改成正确相对路径即可
// 你在 my-plans.tsx 用的是 "../../src/components/plancard" 那套路径也可以

type Props = {
  styles: any;
  plans?: TrainingPlan[];
  isOwner?: boolean;
  maxItems?: number;
  
  // 可选：外部覆盖
  onPressPlan?: (plan: TrainingPlan) => void;
  onManagePlan?: (plan: TrainingPlan) => void;
};

export default function PlansSection({
  styles,
  plans = [],
  isOwner = false,
  maxItems = 2,
  onPressPlan,
  onManagePlan,
}: Props) {
  const router = useRouter();

  const visiblePlans = useMemo(() => {
    if (!plans?.length) return [];
    return isOwner ? plans : plans.filter((p) => p.visibility === "public");
  }, [plans, isOwner]);

  if (!visiblePlans.length) return null;

  const handlePress = (plan: TrainingPlan) => {
    if (onPressPlan) return onPressPlan(plan);
    router.push({
      pathname: "/library/plan-overview",
      params: { planId: plan.id, source: isOwner ? "user" : "market" },
    });
  };

  const handleManage = (plan: TrainingPlan) => {
    if (onManagePlan) return onManagePlan(plan);

    Alert.alert("Manage Plan", plan.title, [{ text: "OK" }]);
  };

  return (
    <View style={styles.plansContainer}>
      {/* 标题行（owner 才显示 Manage） */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "900", color: "#111" }}>Plans</Text>

        {isOwner ? (
          <TouchableOpacity onPress={() => router.push("/library/my-plans")} activeOpacity={0.8}>
            <Text style={{ fontSize: 13, fontWeight: "800", color: "#6B7280" }}>Manage</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {visiblePlans.slice(0, maxItems).map((plan) => (
        <TrainingPlanCard
          key={plan.id}
          plan={plan}
          variant="compact"
          context={isOwner ? "personal" : "public"}
          handlers={{
            onPress: () => handlePress(plan),
            onOpenMenu: isOwner ? () => handleManage(plan) : undefined,
          }}
          display={{
            showSourceBadge: true,
            showVisibilityBadge: isOwner,
          }}
        />
      ))}
    </View>
  );
}
