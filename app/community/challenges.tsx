// app/community/challenges.tsx

import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ImageBackground, Alert, Dimensions } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar"; 

const { width } = Dimensions.get('window');
const CARD_HEIGHT = 140; // [修改] 压缩高度

// 状态定义
type ChallengeStatus = 'active' | 'upcoming' | 'past';

const CHALLENGES = [
  {
    id: 'c1',
    title: 'January Vertical Limit',
    description: 'Climb 1,000m vertical.',
    participants: 3420,
    status: 'active' as ChallengeStatus, // [新增] 状态字段
    daysLeft: 12,
    goal: 1000, current: 450, unit: 'm',
    image: 'https://images.unsplash.com/photo-1516592673881-b6366551750e?auto=format&fit=crop&w=800&q=80',
    joined: true,
    color: '#059669' 
  },
  {
    id: 'c2',
    title: 'Spring Bouldering Comp',
    description: 'Registration opens soon.',
    participants: 0,
    status: 'upcoming' as ChallengeStatus,
    startDate: 'Apr 01',
    goal: 0, current: 0, unit: '',
    image: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=800&q=80',
    joined: false,
    color: '#D97706' 
  },
  {
    id: 'c3',
    title: '2024 Year Starter',
    description: 'Log 20 sessions in Jan.',
    participants: 5600,
    status: 'past' as ChallengeStatus,
    daysLeft: 0,
    goal: 20, current: 20, unit: 'sessions',
    image: 'https://images.unsplash.com/photo-1601925348897-4c7595fe1423?auto=format&fit=crop&w=800&q=80',
    joined: true,
    color: '#4F46E5' 
  }
];

export default function ChallengesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'Discover' | 'My Challenges'>('Discover');

  // [逻辑] 筛选数据
  const sourceData = filter === 'Discover' 
    ? CHALLENGES 
    : CHALLENGES.filter(c => c.joined);

  // [逻辑] 分组
  const groupedData = {
      active: sourceData.filter(c => c.status === 'active'),
      upcoming: sourceData.filter(c => c.status === 'upcoming'),
      past: sourceData.filter(c => c.status === 'past'),
  };

  const renderSection = (title: string, data: typeof CHALLENGES) => {
      if (data.length === 0) return null;
      return (
          <View style={styles.section}>
              <Text style={styles.sectionTitle}>{title}</Text>
              {data.map(item => renderCard(item))}
          </View>
      );
  };

  const renderCard = (item: typeof CHALLENGES[0]) => {
    const progressPercent = item.goal ? Math.min((item.current / item.goal) * 100, 100) : 0;
    
    return (
      <TouchableOpacity 
        key={item.id}
        style={styles.card} 
        activeOpacity={0.9}
        onPress={() => Alert.alert(item.title, "Challenge Details...")}
      >
        <ImageBackground source={{ uri: item.image }} style={styles.cardBg} imageStyle={{ borderRadius: 12 }}>
           <View style={styles.overlay} />
           
           <View style={styles.cardContent}>
               <View style={{flex: 1}}>
                   {/* Badges */}
                   <View style={styles.badgeRow}>
                       <View style={[styles.tag, { backgroundColor: item.color }]}>
                           <Text style={styles.tagText}>{item.status.toUpperCase()}</Text>
                       </View>
                       {item.status === 'upcoming' && (
                           <View style={styles.infoBadge}>
                               <Ionicons name="calendar-outline" size={10} color="#E5E7EB" />
                               <Text style={styles.infoText}>Starts {item.startDate}</Text>
                           </View>
                       )}
                       {item.status === 'active' && (
                           <View style={styles.infoBadge}>
                               <Ionicons name="time-outline" size={10} color="#E5E7EB" />
                               <Text style={styles.infoText}>{item.daysLeft}d left</Text>
                           </View>
                       )}
                   </View>

                   <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                   <Text style={styles.cardDesc} numberOfLines={1}>{item.description}</Text>
               </View>

               {/* Right Side / Bottom Action */}
               <View style={styles.cardBottom}>
                   {item.joined && item.status !== 'upcoming' ? (
                       <View style={{width: '100%'}}>
                           <View style={{flexDirection:'row', justifyContent:'space-between', marginBottom: 4}}>
                               <Text style={styles.progText}>{item.current}/{item.goal} {item.unit}</Text>
                               <Text style={styles.progText}>{Math.round(progressPercent)}%</Text>
                           </View>
                           <View style={styles.track}><View style={[styles.fill, { width: `${progressPercent}%`, backgroundColor: item.color }]} /></View>
                       </View>
                   ) : (
                       <View style={styles.statsRow}>
                           <Ionicons name="people" size={14} color="#D1D5DB" />
                           <Text style={styles.statsText}>{item.participants} joined</Text>
                       </View>
                   )}
               </View>
           </View>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar 
            routeName="challenges" 
            title="Challenges" 
            useSafeArea={false}
            leftControls={{ mode: "back", onBack: () => router.back() }} 
            rightAccessory={
                <TouchableOpacity onPress={() => Alert.alert("Leaderboard", "Global Ranking")}>
                    <Ionicons name="podium-outline" size={24} color="#111" />
                </TouchableOpacity>
            }
        />
      </View>

      {/* Full Width Tabs */}
      <View style={styles.tabs}>
          {['Discover', 'My Challenges'].map(tab => {
              const isActive = filter === tab;
              return (
                  <TouchableOpacity 
                    key={tab} 
                    style={[styles.tabItem, isActive && styles.tabItemActive]}
                    onPress={() => setFilter(tab as any)}
                  >
                      <Text style={[styles.tabText, isActive && styles.tabTextActive]}>{tab}</Text>
                  </TouchableOpacity>
              )
          })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {/* [修改] 分组渲染 */}
          {renderSection('Active Now', groupedData.active)}
          {renderSection('Coming Soon', groupedData.upcoming)}
          {renderSection('Past Challenges', groupedData.past)}
          
          {Object.values(groupedData).every(arr => arr.length === 0) && (
              <View style={{padding: 40, alignItems: 'center'}}>
                  <Text style={{color:'#9CA3AF'}}>No challenges found.</Text>
              </View>
          )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
    tabs: { flexDirection: 'row', width: '100%', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    tabItem: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabItemActive: { borderBottomColor: '#111' },
    tabText: { fontSize: 15, fontWeight: '600', color: '#9CA3AF' },
    tabTextActive: { color: '#111', fontWeight: '800' },

    section: { marginBottom: 24 },
    sectionTitle: { fontSize: 18, fontWeight: '800', color: '#111', marginBottom: 12 },

    // Compact Card
    card: { height: CARD_HEIGHT, marginBottom: 12, borderRadius: 12, overflow: 'hidden' },
    cardBg: { flex: 1 },
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    
    cardContent: { flex: 1, padding: 14, justifyContent: 'space-between' },
    
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    tagText: { fontSize: 10, fontWeight: '800', color: '#FFF' },
    infoBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    infoText: { color: '#E5E7EB', fontSize: 11, fontWeight: '500' },

    cardTitle: { fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 2 },
    cardDesc: { fontSize: 13, color: '#D1D5DB' },

    cardBottom: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statsText: { color: '#D1D5DB', fontSize: 12 },

    progText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    track: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, width: '100%' },
    fill: { height: '100%', borderRadius: 2 },
});