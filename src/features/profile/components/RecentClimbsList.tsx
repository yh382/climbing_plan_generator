import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useClimbsStore } from "../store/useClimbsStore";

export function RecentClimbsList() {
  const { items, nextCursor, loading, fetchList, loadMore } = useClimbsStore();
  React.useEffect(() => { fetchList(); }, []);

  if (!loading && items.length === 0) {
    return (
      <View style={{ padding: 16 }}>
        <Text style={{ color: "#6b7280", marginBottom: 8 }}>暂无记录</Text>
        <Pressable style={{ backgroundColor: "#111827", padding: 12, borderRadius: 10, alignItems: "center" }}>
          <Text style={{ color: "white" }}>去记录第一条攀爬</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={{ gap: 12 }}>
      {items.map((item) => (
        <View key={item.id} style={{ backgroundColor: "#f9fafb", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>{item.route_name ?? "(未命名路线)"} · {item.grade_value}</Text>
          <Text style={{ color: "#6b7280", marginTop: 4 }}>
            {item.date} · {item.location_type}/{item.discipline} · 尝试 {item.attempts} · 完成 {item.sends}
          </Text>
          {!!item.notes && <Text style={{ marginTop: 4 }}>{item.notes}</Text>}
        </View>
      ))}
      {loading && <ActivityIndicator size="small" color="#6b7280" style={{ padding: 12 }} />}
      {!loading && nextCursor && (
        <Pressable
          onPress={loadMore}
          style={{ padding: 12, alignItems: "center" }}
        >
          <Text style={{ color: "#2BB673", fontWeight: "600", fontSize: 13 }}>Load More</Text>
        </Pressable>
      )}
    </View>
  );
}
