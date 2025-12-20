// app/community/search.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF', paddingTop: insets.top }}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput 
                style={styles.input} 
                placeholder="Search plans, climbers..." 
                autoFocus 
                value={query}
                onChangeText={setQuery}
            />
            {query.length > 0 && (
                <TouchableOpacity onPress={() => setQuery("")}>
                    <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
            )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={styles.sectionTitle}>Trending Plans 🔥</Text>
        <View style={styles.tagContainer}>
            {['Core Blaster', 'V4-V6 Transition', 'Finger Strength'].map(tag => (
                <TouchableOpacity key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></TouchableOpacity>
            ))}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Suggested Climbers</Text>
        {/* Mock List */}
        <TouchableOpacity style={styles.userRow}>
             <View style={styles.avatarPlaceholder} />
             <View>
                 <Text style={styles.username}>Sender One Gym</Text>
                 <Text style={styles.userSub}>Official Account</Text>
             </View>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 12 },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', height: 40, borderRadius: 20, paddingHorizontal: 12 },
  input: { flex: 1, marginLeft: 8, fontSize: 16, height: '100%' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  tagText: { color: '#374151', fontWeight: '500' },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  avatarPlaceholder: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E5E7EB' },
  username: { fontWeight: '700' },
  userSub: { fontSize: 12, color: '#6B7280' }
});