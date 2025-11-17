import React from "react";
import { View, Text, FlatList, Pressable } from "react-native";
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
    <FlatList
      data={items}
      keyExtractor={(it) => it.id}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      onEndReached={() => nextCursor && loadMore()}
      renderItem={({ item }) => (
        <View style={{ backgroundColor: "#f9fafb", borderRadius: 12, padding: 12 }}>
          <Text style={{ fontWeight: "700" }}>{item.route_name ?? "(未命名路线)"} · {item.grade_value}</Text>
          <Text style={{ color: "#6b7280", marginTop: 4 }}>
            {item.date} · {item.location_type}/{item.discipline} · 尝试 {item.attempts} · 完成 {item.sends}
          </Text>
          {!!item.notes && <Text style={{ marginTop: 4 }}>{item.notes}</Text>}
        </View>
      )}
      ListFooterComponent={
        loading ? <Text style={{ textAlign: "center", padding: 12, color: "#6b7280" }}>加载中...</Text> : null
      }
    />
  );
}
