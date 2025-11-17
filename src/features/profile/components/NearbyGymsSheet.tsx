// src/features/profile/components/NearbyGymsSheet.tsx
import React, { useMemo } from "react";
import { View, Text, FlatList, Pressable } from "react-native";
import { useUserStore } from "@/store/useUserStore";

export type GymItem = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  city?: string | null;
};

type Props = {
  /** 当前定位（若无则显示引导） */
  currentLocation?: { lat: number; lng: number } | null;
  /** 待排序的附近岩馆列表（提供经纬度） */
  gyms?: GymItem[] | null;
  /** 选择某家岩馆（通常用于设置 Home Gym） */
  onSelectGym?: (gym: GymItem) => void;
  /** 无定位时的请求回调（例如触发权限申请） */
  onRequestLocation?: () => void;
  /** 关闭面板 */
  onClose?: () => void;
};

export default function NearbyGymsSheet({
  currentLocation,
  gyms,
  onSelectGym,
  onRequestLocation,
}: Props) {
  const { user } = useUserStore();
  const isImperial = user?.units === "imperial";

  const sorted = useMemo(() => {
    if (!currentLocation || !gyms?.length) return [];
    const withDist = gyms.map((g) => ({
      ...g,
      distanceKm: haversineKm(currentLocation.lat, currentLocation.lng, g.lat, g.lng),
    }));
    withDist.sort((a, b) => a.distanceKm - b.distanceKm);
    return withDist;
  }, [currentLocation, gyms]);

  const formatDistance = (km: number) => {
    if (isImperial) {
      const mi = km * 0.621371;
      return `${mi.toFixed(mi < 10 ? 1 : 0)} mi`;
    }
    return `${km.toFixed(km < 10 ? 1 : 0)} km`;
  };

  // 无定位或无数据的空态
  if (!currentLocation) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>附近岩馆</Text>
        <Text style={{ color: "#6b7280", marginBottom: 12 }}>
          无法获取当前位置。请开启定位以按距离排序显示附近岩馆。
        </Text>
        <Pressable
          onPress={onRequestLocation}
          style={{
            alignSelf: "flex-start",
            backgroundColor: "#111827",
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "600" }}>使用当前位置</Text>
        </Pressable>
      </View>
    );
  }

  if (!sorted.length) {
    return (
      <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12 }}>附近岩馆</Text>
        <Text style={{ color: "#6b7280" }}>暂无可用的岩馆数据。</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
        <Text style={{ fontSize: 18, fontWeight: "700" }}>附近岩馆</Text>
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(it) => it.id}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => onSelectGym?.(item)}
            style={({ pressed }) => ({
              paddingHorizontal: 16,
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: "#f1f5f9",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ fontSize: 16, fontWeight: "700" }}>{item.name}</Text>
            <Text style={{ color: "#6b7280", marginTop: 4 }}>
              {item.city ? `${item.city} · ` : ""}{formatDistance(item.distanceKm!)}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

/** Haversine 直线距离（公里） */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // 地球半径 km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
