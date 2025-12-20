// app/library/plans.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ScrollView, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar"; 
import PlanCard, { PlanProps } from "../../components/PlanCard";

// Mock Data (此处仅做示例，实际需区分 Library 和 Plaza 数据)
const MOCK_DATA: PlanProps[] = [
  { id: 'p1', title: 'Finger Strength 101', author: 'Lattice', level: 'V4-V7', duration: '6 Wks', users: 1240, type: 'Strength', rating: 4.8, color: '#4F46E5', image: 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?auto=format&fit=crop&w=800&q=80' },
  { id: 'p2', title: 'Endurance Beast', author: 'Adam Ondra', level: '5.12+', duration: '8 Wks', users: 3500, type: 'Endurance', rating: 4.9, color: '#059669', image: 'https://images.unsplash.com/photo-1601925348897-4c7595fe1423?auto=format&fit=crop&w=800&q=80' },
];

export default function PlansHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'Plaza' | 'Library'>('Plaza');
  
  // Filter State
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortType, setSortType] = useState<'Newest' | 'Highest'>('Newest');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleFilter = () => setFilterOpen(!filterOpen);
  
  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) setSelectedTags(selectedTags.filter(t => t !== tag));
    else setSelectedTags([...selectedTags, tag]);
  };

  const TAG_OPTIONS = ['Boulder', 'Sport', 'Strength', 'Endurance', 'Flexibility', 'Core'];

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar 
            routeName="plans_hub" 
            title="Plans" 
            useSafeArea={false}
            leftControls={{ mode: "back", onBack: () => router.back() }}
            rightAccessory={
                <TouchableOpacity onPress={() => router.push("/library/my-plans")}>
                    <Text style={{ fontWeight: '700', color: '#111', fontSize: 15 }}>My Plans</Text>
                </TouchableOpacity>
            }
        />
      </View>

      <View style={{ flex: 1 }}>
        {/* 1. Search Bar */}
        <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#9CA3AF" />
            <TextInput 
                placeholder="Search plans, authors..." 
                placeholderTextColor="#9CA3AF"
                style={{ flex: 1, marginLeft: 8, fontSize: 15, color: '#111' }}
            />
        </View>

        {/* 2. Full Width Tabs (Plaza / Library) */}
        <View style={styles.tabContainer}>
             {['Plaza', 'Library'].map(tab => (
                 <TouchableOpacity 
                    key={tab} 
                    style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                    onPress={() => setActiveTab(tab as any)}
                 >
                     <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                        Plan {tab}
                     </Text>
                 </TouchableOpacity>
             ))}
        </View>

        {/* 3. Filter Toggle Header */}
        <TouchableOpacity style={styles.filterHeader} onPress={toggleFilter} activeOpacity={0.7}>
            <Text style={styles.filterTitle}>
                Filter: <Text style={{fontWeight:'400'}}>{sortType}, {selectedTags.length > 0 ? `${selectedTags.length} tags` : 'All'}</Text>
            </Text>
            <Ionicons name={filterOpen ? "chevron-up" : "chevron-down"} size={16} color="#6B7280" />
        </TouchableOpacity>

        {/* 4. Expandable Filter Area */}
        {filterOpen && (
            <View style={styles.filterBody}>
                {/* Sort (Radio) */}
                <View style={styles.filterRow}>
                    <Text style={styles.filterLabel}>Sort By:</Text>
                    <View style={{flexDirection: 'row', gap: 12}}>
                        {['Newest', 'Highest'].map(opt => (
                            <TouchableOpacity 
                                key={opt} 
                                style={[styles.radioBtn, sortType === opt && styles.radioBtnActive]}
                                onPress={() => setSortType(opt as any)}
                            >
                                <Text style={[styles.radioText, sortType === opt && styles.radioTextActive]}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
                
                {/* Tags (Checkbox) */}
                <View style={[styles.filterRow, { marginTop: 12 }]}>
                    <Text style={styles.filterLabel}>Type:</Text>
                    <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1}}>
                        {TAG_OPTIONS.map(tag => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                                <TouchableOpacity 
                                    key={tag} 
                                    style={[styles.tagBtn, isSelected && styles.tagBtnActive]}
                                    onPress={() => toggleTag(tag)}
                                >
                                    <Text style={[styles.tagText, isSelected && styles.tagTextActive]}>{tag}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                </View>
            </View>
        )}

        {/* 5. Plan List */}
        <FlatList
            data={MOCK_DATA}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
                <PlanCard 
                    item={item} 
                    onPress={() => router.push({
                        pathname: "/library/plan-overview", // 原 week-detail.tsx
                        params: { 
                            planId: item.id, 
                            source: 'market' // 标记来源，用于显示 Add 按钮
                        }
                    })} 
                />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
            showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', margin: 16, paddingHorizontal: 12, height: 44, borderRadius: 12 },
    
    // Tabs
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: '#111' },
    tabText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
    tabTextActive: { color: '#111', fontWeight: '800' },

    // Filter
    filterHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    filterTitle: { fontSize: 13, fontWeight: '700', color: '#374151' },
    filterBody: { padding: 16, backgroundColor: '#FAFAFA', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    filterRow: { flexDirection: 'row', alignItems: 'flex-start' },
    filterLabel: { width: 60, fontSize: 13, color: '#9CA3AF', marginTop: 6, fontWeight: '600' },
    
    // Radio & Tags
    radioBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
    radioBtnActive: { backgroundColor: '#111', borderColor: '#111' },
    radioText: { fontSize: 12, color: '#4B5563' },
    radioTextActive: { color: '#FFF', fontWeight: '600' },

    tagBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#E5E7EB' },
    tagBtnActive: { backgroundColor: '#EEF2FF', borderColor: '#4F46E5' },
    tagText: { fontSize: 12, color: '#4B5563' },
    tagTextActive: { color: '#4F46E5', fontWeight: '600' },
});