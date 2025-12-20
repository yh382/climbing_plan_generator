// app/library/exercises.tsx
import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar";

const CATEGORIES = ["All", "Finger", "Core", "Upper Body", "Legs", "Mobility", "Pull"];

// 模拟动作数据
const EXERCISES = [
  { id: '1', name: 'Max Hang (20mm)', category: 'Finger', level: 'Adv' },
  { id: '2', name: 'Deadlift', category: 'Legs', level: 'Int' },
  { id: '3', name: 'Front Lever', category: 'Core', level: 'Elite' },
  { id: '4', name: 'Scapular Pull-ups', category: 'Upper Body', level: 'Beg' },
  { id: '5', name: '90/90 Hip Stretch', category: 'Mobility', level: 'All' },
];

export default function ExercisesLibraryScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const [filter, setFilter] = useState("All");

  React.useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  const filteredData = filter === "All" 
    ? EXERCISES 
    : EXERCISES.filter(e => e.category === filter);

  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.itemRow}>
        <View style={styles.iconBox}>
            <Ionicons name="barbell-outline" size={24} color="#4B5563" />
        </View>
        <View style={{flex: 1}}>
            <Text style={styles.itemTitle}>{item.name}</Text>
            <Text style={styles.itemSub}>{item.category} · {item.level}</Text>
        </View>
        <Ionicons name="add-circle-outline" size={24} color="#D1D5DB" />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      <TopBar 
        routeName="exercises_lib" 
        titleZH="动作库" 
        titleEN="Exercise Library" 
        leftControls={{ mode: "back", onBack: () => router.back() }}
      />

      {/* Category Filter */}
      <View style={{ height: 50 }}>
        <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center', gap: 8 }}
        >
            {CATEGORIES.map(cat => (
                <TouchableOpacity 
                    key={cat} 
                    style={[styles.chip, filter === cat && styles.chipActive]}
                    onPress={() => setFilter(cat)}
                >
                    <Text style={[styles.chipText, filter === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
  chipActive: { backgroundColor: '#111827', borderColor: '#111827' },
  chipText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  chipTextActive: { color: '#FFF' },
  itemRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 12, borderRadius: 12, marginBottom: 8, gap: 12 },
  iconBox: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  itemSub: { fontSize: 12, color: '#6B7280' },
});