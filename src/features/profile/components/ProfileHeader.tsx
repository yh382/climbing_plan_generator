// src/features/profile/ProfileHeader.tsx
import React from "react";
import { View, Text, Image, Pressable } from "react-native";
import { UserLite } from "@/store/useUserStore";

type Summary = {
  bio_from_profile?: string | null;
  count_total?: number | null;
  best_grade_label?: string | null;
};

export function ProfileHeader({
  user,
  summary,
  onEditAvatar,
  onEditUsername,
  loading,
}: {
  user?: UserLite;
  summary?: Summary;
  loading?: boolean;
  onEditAvatar?: () => void;
  onEditUsername?: () => void;
}) {
  const total = summary?.count_total ?? 0;
  const best = summary?.best_grade_label ?? "-";

  // 公共：右侧小卡片
  const StatsCard = () => (
    <View
      style={{
        backgroundColor: "#f3f4f6",
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        minWidth: 120,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#6b7280", marginRight: 8 }}>累计</Text>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>{total}</Text>
      </View>

      <View
        style={{
          marginTop: 4,
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#6b7280", marginRight: 8 }}>最佳</Text>
        <Text style={{ fontSize: 16, fontWeight: "700" }}>{best}</Text>
      </View>
    </View>
  );

  // ===================== loading / no user =====================
  if (loading || !user) {
    return (
      <View
        style={{
          padding: 16,
          flexDirection: "row",
          gap: 12,
        }}
      >
        {/* 左侧头像 + “加载用户中…” */}
        <View style={{ alignItems: "center" }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: "#e5e7eb",
            }}
          />
          <Text style={{ marginTop: 6, color: "#9ca3af" }}>加载用户中…</Text>
        </View>

        {/* 右侧小卡片，靠右 */}
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "flex-end",
          }}
        >
          <StatsCard />
        </View>
      </View>
    );
  }

  // ===================== normal user =====================
  const bio = user.bio ?? summary?.bio_from_profile ?? null;

  return (
    <View
      style={{
        padding: 16,
        flexDirection: "row",
        gap: 12,
      }}
    >
      {/* 左侧头像 + 用户名 + bio */}
      <View style={{ alignItems: "center" }}>
        <Pressable onPress={onEditAvatar}>
          {user.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url }}
              style={{ width: 80, height: 80, borderRadius: 40 }}
            />
          ) : (
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: "#111827",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ color: "white", fontWeight: "600", fontSize: 32 }}>
                {user.username?.slice(0, 1)?.toUpperCase() ?? "U"}
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={onEditUsername}>
          <Text style={{ marginTop: 6, fontSize: 16, fontWeight: "700" }}>
            {user.username}
          </Text>
        </Pressable>

        {!!bio && (
          <Text
            numberOfLines={2}
            style={{
              color: "#374151",
              marginTop: 4,
              textAlign: "center",
              maxWidth: 90,
            }}
          >
            {bio}
          </Text>
        )}
      </View>

      {/* 右侧小卡片，靠右 */}
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "flex-end",
        }}
      >
        <StatsCard />
      </View>
    </View>
  );
}

