// app/library/my-plans.tsx
import React, { useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Animated, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar"; 
import PlanCard, { PlanProps } from "../../components/PlanCard";

// Mock Data
const MY_PLANS: PlanProps[] = [
    { id: 'm1', title: 'My Weakness Fix', author: 'Me', level: 'V5', duration: '4 Wks', users: 1, type: 'Custom', rating: 0, color: '#DB2777', image: 'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?auto=format&fit=crop&w=800&q=80' }
];

export default function MyPlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'Others' | 'Custom'>('Others');
  
  // FAB State
  const [fabOpen, setFabOpen] = useState(false);

  // FAB Actions
  const handleFabAction = (action: 'AI' | 'Custom') => {
      setFabOpen(false);
      if (action === 'AI') Alert.alert("AI Pick", "Navigating to AI Generator...");
      if (action === 'Custom') Alert.alert("Create", "Navigating to Plan Creator...");
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar 
            routeName="my_plans" 
            title="My Plans" 
            useSafeArea={false}
            leftControls={{ mode: "back", onBack: () => router.back() }}
            rightAccessory={
                <TouchableOpacity onPress={() => router.push("/library/plan-history")}>
                     <Ionicons name="time-outline" size={24} color="#111" />
                </TouchableOpacity>
            }
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
           {['From Others', 'My Custom'].map(tab => {
               // 简单映射一下 Tab 名字到 State
               const key = tab === 'From Others' ? 'Others' : 'Custom';
               const isActive = activeTab === key;
               return (
                <TouchableOpacity 
                   key={tab} 
                   style={[styles.tabItem, isActive && styles.tabItemActive]}
                   onPress={() => setActiveTab(key as any)}
                >
                    <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                </TouchableOpacity>
            )
           })}
      </View>

      <FlatList
        data={MY_PLANS} // 根据 activeTab 切换数据
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
            <PlanCard 
                item={item} 
                onPress={() => router.push({
                    pathname: "/library/plan-overview",
                    params: { planId: item.id, source: 'user' } // source='user' 意味着不显示 Add 按钮
                })} 
            />
        )}
        contentContainerStyle={{ padding: 16 }}
      />

      {/* FAB Overlay (Simple Version) */}
      {fabOpen && (
          <TouchableOpacity 
            style={styles.fabOverlay} 
            activeOpacity={1} 
            onPress={() => setFabOpen(false)}
          >
              <View style={[styles.fabActions, { bottom: insets.bottom + 80 }]}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleFabAction('Custom')}>
                      <Text style={styles.actionText}>Customize</Text>
                      <View style={[styles.miniFab, { backgroundColor: '#4F46E5' }]}>
                          <Ionicons name="construct" size={20} color="#FFF" />
                      </View>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionBtn} onPress={() => handleFabAction('AI')}>
                      <Text style={styles.actionText}>AI Pick</Text>
                      <View style={[styles.miniFab, { backgroundColor: '#10B981' }]}>
                          <Ionicons name="sparkles" size={20} color="#FFF" />
                      </View>
                  </TouchableOpacity>
              </View>
          </TouchableOpacity>
      )}

      {/* Main FAB */}
      <TouchableOpacity 
        style={[styles.fab, { bottom: insets.bottom + 20 }]} 
        activeOpacity={0.8}
        onPress={() => setFabOpen(!fabOpen)}
      >
          <Ionicons name={fabOpen ? "close" : "add"} size={32} color="#FFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: '#111' },
    tabText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
    tabTextActive: { color: '#111', fontWeight: '800' },

    // FAB
    fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 8, elevation: 5, zIndex: 100 },
    
    // FAB Overlay
    fabOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 90 },
    fabActions: { position: 'absolute', right: 24, alignItems: 'flex-end', gap: 16 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    actionText: { fontSize: 14, fontWeight: '700', color: '#111' },
    miniFab: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 5 },
});