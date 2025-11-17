import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useProfileStore } from "@/features/profile/store/useProfileStore";
import { useUserStore } from "@/store/useUserStore";
import { kgToLb, cmToIn } from "@lib/units";

export function UserPersonaSection() {
  const { profile } = useProfileStore();
  const { user } = useUserStore();

  const isImperial = user?.units === "imperial";

  const strength = profile?.strength ?? {};
  const mobility = profile?.mobility ?? {};
  const recovery = profile?.recovery ?? {};
  const pain = recovery?.pain ?? {};
  const anthropometrics = profile?.anthropometrics ?? {};

  // === 力量 / 能力：以引体 PR 作为主数字，其他做小统计 ===
  const pullupsReps = strength.pullups?.max_reps ?? 0;
  const weighted1rmKg = strength.weighted_pullup_1rm_kg ?? 0;
  const weighted1rmText = isImperial
    ? `${Math.round(kgToLb(weighted1rmKg))} lb`
    : `${weighted1rmKg} kg`;
  const oneArmHangSeconds = strength.one_arm_hang_s ?? 0;
  const oneArmHangText = `${oneArmHangSeconds}s`;

  // === 机动性：整体髋部评分作为主数字 ===
  const sitReachVal = mobility.sit_and_reach_cm ?? 0;
  const sitReachText = `${sitReachVal} cm`;
  const hipScoreVal = mobility.hip_mobility_score ?? 0;
  const shoulderFlexText = mobility.shoulder_flex ?? "未评估";

  // === 基础信息：等级作为主数字（可以是 V5 / 5.12 等） ===
  const heightCm = anthropometrics.height_cm ?? 0;
  const heightText = isImperial
    ? `${Math.round(cmToIn(heightCm))} in`
    : `${heightCm} cm`;
  const weightKg = anthropometrics.weight_kg ?? 0;
  const weightText = isImperial
    ? `${Math.round(kgToLb(weightKg))} lb`
    : `${weightKg} kg`;
  const levelText = anthropometrics.level ?? "未设置";

  // === 受伤与恢复：平均睡眠作为主数字 ===
  const sleepVal = recovery.sleep_hours_avg ?? 0;
  const sleepText = `${sleepVal} h / night`;
  const stretchFreqText = recovery.stretching_freq_band ?? "未设置";

  const painFinger = pain?.finger ?? 0;
  const painShoulder = pain?.shoulder ?? 0;
  const painElbow = pain?.elbow ?? 0;
  const painWrist = pain?.wrist ?? 0;
  const painScore = painFinger + painShoulder + painElbow + painWrist;
  const painText = `${painScore} pts`;

  return (
    <View style={{ marginTop: 24 }}>
      <Text
        style={{
          fontSize: 18,
          fontWeight: "700",
          marginBottom: 12,
          color: "#111827",
        }}
      >
        用户画像
      </Text>

      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
        }}
      >
        {/* 力量 / 能力 */}
        <PersonaMiniCard title="力量 / 能力">
          <BigStat
            value={pullupsReps.toString()}
            suffix="x"
            label="引体 PR"
          />
          <SmallStat value={weighted1rmText} label="负重引体 1RM" />
          <SmallStat value={oneArmHangText} label="单手悬挂" />
        </PersonaMiniCard>

        {/* 机动性 */}
        <PersonaMiniCard title="机动性">
          <BigStat
            value={hipScoreVal.toString()}
            suffix="/10"
            label="整体机动性评分"
          />
          <SmallStat value={sitReachText} label="坐姿体前屈" />
          <SmallStat value={shoulderFlexText} label="肩关节灵活度" />
        </PersonaMiniCard>

        {/* 基础信息 */}
        <PersonaMiniCard title="基础信息">
          <BigStat value={levelText} label="当前水平" />
          <SmallStat value={heightText} label="身高" />
          <SmallStat value={weightText} label="体重" />
        </PersonaMiniCard>

        {/* 受伤 & 恢复 */}
        <PersonaMiniCard title="受伤与恢复">
          <BigStat
            value={sleepVal.toString()}
            suffix="h"
            label="平均睡眠"
          />
          <SmallStat value={stretchFreqText} label="拉伸频率" />
          <SmallStat value={painText} label="疼痛总分" />
        </PersonaMiniCard>
      </View>
    </View>
  );
}

function PersonaMiniCard(props: { title: string; children: React.ReactNode }) {
  return (
    <View
      style={{
        width: "48%",
        backgroundColor: "#f4f4f5",
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 14,
        marginBottom: 14,
      }}
    >
      {/* 头部：左标题 + 右箭头 */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <Text
          style={{
            fontSize: 14,
            fontWeight: "600",
            color: "#111827",
          }}
        >
          {props.title}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
      </View>

      {props.children}
    </View>
  );
}

function BigStat(props: { value: string; suffix?: string; label: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-end" }}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: "700",
            color: "#6366f1",
          }}
        >
          {props.value}
        </Text>
        {props.suffix ? (
          <Text
            style={{
              fontSize: 16,
              fontWeight: "600",
              color: "#6366f1",
              marginLeft: 2,
              marginBottom: 2,
            }}
          >
            {props.suffix}
          </Text>
        ) : null}
      </View>
      <Text
        style={{
          marginTop: 2,
          fontSize: 12,
          color: "#6b7280",
        }}
      >
        {props.label}
      </Text>
    </View>
  );
}

function SmallStat(props: { value: string; label: string }) {
  return (
    <View style={{ marginTop: 4 }}>
      <Text
        style={{
          fontSize: 13,
          color: "#4b5563",
        }}
      >
        {props.value} {props.label}
      </Text>
    </View>
  );
}

