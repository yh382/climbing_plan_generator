import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useProfileStore } from "@/features/profile/store/useProfileStore";

// ✅ AbilityRadar moved into basicinfo/cards
import AbilityRadar from "../basicinfo/cards/AbilityRadar";

// ✅ New modular cards
import AnthropometricCard from "../basicinfo/cards/AnthropometricCard";
import CapacityCard from "../basicinfo/cards/CapacityCard";
import FingerStrengthCard from "../basicinfo/cards/FingerStrengthCard";
import ClimbingBackgroundCard from "../basicinfo/cards/ClimbingBackgroundCard";
import MobilityCard from "../basicinfo/cards/MobilityCard";
import CoreEnduranceCard from "../basicinfo/cards/CoreEnduranceCard";

// ✅ Shared types
import type { HeaderViewModel } from "../basicinfo/types";

export default function BasicInfoSection({
  user,
  styles,
}: {
  user: HeaderViewModel;
  styles: any;
}) {
  const router = useRouter();
  const profile = useProfileStore((s) => s.profile);
  const insets = useSafeAreaInsets();

  const radarData = user.abilityRadar ?? {
    finger: 10,
    pull: 10,
    core: 10,
    flex: 10,
    sta: 10,
  };

  // 让底部内容不被 TabBar 遮住：
  // - insets.bottom：iPhone home indicator 安全区
  // - 72：给底部 TabBar/悬浮按钮预留空间（你可以按实际 tabbar 高度微调，比如 64/80）
  const bottomSafePadding = (insets?.bottom ?? 0)-30;

  return (
    <View style={[styles.basicInfoContainer, { paddingBottom: bottomSafePadding }]}>
      {/* 1) View Detailed Analysis */}
      <TouchableOpacity
        style={styles.analysisCard}
        onPress={() => router.push("/(tabs)/analysis")}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons name="chart-box-outline" size={24} color="#00665E" />
          <Text style={styles.analysisText}>View Detailed Analysis</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#999" />
      </TouchableOpacity>

      {/* 2) Ability Radar */}
      <AbilityRadar data={radarData} styles={styles} />

      {/* 3) Anthropometrics */}
      <AnthropometricCard styles={styles} profile={profile} user={user} />

      {/* 4) Capacity */}
      <CapacityCard styles={styles} profile={profile} user={user} />

      {/* 5) Finger Strength (FSI) */}
      <FingerStrengthCard styles={styles} profile={profile} user={user} />

      {/* 6) Climbing Background */}
      <ClimbingBackgroundCard styles={styles} profile={profile} />

      {/* 7) Mobility & Core Endurance */}
      <MobilityCard styles={styles} profile={profile} user={user} />
      <CoreEnduranceCard styles={styles} profile={profile} user={user} />
    </View>
  );
}
