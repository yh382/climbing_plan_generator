// app/community/activities.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, FlatList } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { NATIVE_HEADER_LARGE } from "@/lib/nativeHeaderOptions";

// --- Mock Data: 岩馆活动 ---
const ACTIVITIES = [
  {
    id: "a1",
    gymName: "Hanger Brno",
    eventName: "Winter Cup 2025",
    date: "Dec 24, 10:00 AM",
    type: "Competition",
    image: "https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80",
    registered: true,
    location: "Brno, CZ",
    distance: "1.2 km",
  },
  {
    id: "a2",
    gymName: "Flash Boulder Bar",
    eventName: "Community Night: BBQ & Climb",
    date: "Dec 28, 18:00 PM",
    type: "Social",
    image: "https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=800&q=80",
    registered: false,
    location: "Olomouc, CZ",
    distance: "45 km",
  },
  {
    id: "a3",
    gymName: "Vertigo Climbing",
    eventName: "New Set Circuit Opening",
    date: "Jan 02, 09:00 AM",
    type: "Circuit",
    image: "https://images.unsplash.com/photo-1601925348897-4c7595fe1423?auto=format&fit=crop&w=800&q=80",
    registered: false,
    location: "Bratislava, SK",
    distance: "120 km",
  },
];

type Activity = (typeof ACTIVITIES)[0];
type FilterKey = "Nearby" | "My Gyms" | "Competitions" | "Social";

export default function ActivitiesScreen() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("Nearby");

  // 渲染活动卡片
  const renderActivityCard = ({ item }: { item: Activity }) => (
    <View style={{ paddingHorizontal: 16 }}>
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() => {
          // router.push(`/community/activity-detail?id=${item.id}`);
          console.log("Open Activity", item.eventName);
        }}
      >
        <Image source={{ uri: item.image }} style={styles.cardImage} />

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.gymTag}>
              <MaterialCommunityIcons name="office-building-marker" size={12} color="#4F46E5" />
              <Text style={styles.gymName}>{item.gymName}</Text>
            </View>

            {item.registered && (
              <View style={styles.registeredBadge}>
                <Ionicons name="ticket" size={10} color="#059669" />
                <Text style={styles.regText}>Registered</Text>
              </View>
            )}
          </View>

          <Text style={styles.eventName}>{item.eventName}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={12} color="#6B7280" />
              <Text style={styles.metaText}>{item.date}</Text>
            </View>
            <View style={styles.dot} />
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color="#6B7280" />
              <Text style={styles.metaText}>{item.distance}</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.typeText}>{item.type}</Text>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.btnText}>{item.registered ? "Scorecard" : "Details"}</Text>
              <Ionicons name="chevron-forward" size={14} color="#111" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const RightActions = (
    <TouchableOpacity style={styles.cityBtn} activeOpacity={0.7}>
      <Text style={styles.cityText}>Brno</Text>
      <Ionicons name="chevron-down" size={14} color="#111" />
    </TouchableOpacity>
  );

  const ListHeader = (
    <View>
      {/* Filter Tabs */}
      <View style={styles.filterTabs}>
        {(["Nearby", "My Gyms", "Competitions", "Social"] as FilterKey[]).map((f) => {
          const isActive = activeFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[styles.chip, isActive && styles.chipActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.75}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Section title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Happening Around You</Text>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{
        ...NATIVE_HEADER_LARGE,
        title: "Activities",
        headerRight: () => RightActions,
      }} />
      <FlatList
        style={{ backgroundColor: "#FFF" }}
        data={ACTIVITIES}
        keyExtractor={(item) => item.id}
        renderItem={renderActivityCard as any}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 40 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      />
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  cityBtn: { flexDirection: "row", alignItems: "center", gap: 4, height: 40, paddingHorizontal: 6 },
  cityText: { fontWeight: "700", fontSize: 13, color: "#111" },

  largeTitle: { fontSize: 32, fontWeight: "800", color: "#111", lineHeight: 38 },
  largeSubtitle: { fontSize: 14, color: "#6B7280", marginTop: 2 },

  filterTabs: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "transparent",
  },
  chipActive: { backgroundColor: "#111", borderColor: "#111" },
  chipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  chipTextActive: { color: "#FFF" },

  sectionHeader: { paddingHorizontal: 16, marginBottom: 12, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#111" },

  // Activity Card (Ticket Style)
  card: {
    flexDirection: "row",
    height: 130,
    backgroundColor: "#FFF",
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardImage: { width: 100, height: "100%", backgroundColor: "#F3F4F6" },
  cardContent: { flex: 1, padding: 12, justifyContent: "space-between" },

  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  gymTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  gymName: { fontSize: 11, fontWeight: "700", color: "#4F46E5" },
  registeredBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#ECFDF5", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  regText: { fontSize: 9, fontWeight: "700", color: "#059669" },

  eventName: { fontSize: 16, fontWeight: "700", color: "#111", lineHeight: 22 },

  metaRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: "#6B7280" },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: "#D1D5DB" },

  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  typeText: { fontSize: 11, fontWeight: "600", color: "#9CA3AF", textTransform: "uppercase" },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  btnText: { fontSize: 13, fontWeight: "700", color: "#111" },
});
