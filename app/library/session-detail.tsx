// app/library/session-detail.tsx

import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import TopBar from "../../components/TopBar"; 

// --- Mock Data: 单节课的具体内容 ---
const SESSION_DATA = {
  id: 's1',
  title: 'Base Fitness A',
  type: 'Aerobic Capacity',
  duration: '45 min',
  intensity: 'Moderate',
  description: 'A mix of continuous climbing and floor exercises to build a solid aerobic base.',
  equipment: ['Pull-up Bar', 'Yoga Mat'],
  blocks: [
    {
      title: 'Warm Up',
      duration: '10 min',
      exercises: [
        { name: 'Jumping Jacks', details: '2 mins' },
        { name: 'Arm Circles', details: '1 min each way' },
        { name: 'Scapular Pull-ups', details: '2 sets x 10 reps' }
      ]
    },
    {
      title: 'Main Circuit',
      duration: '30 min',
      exercises: [
        { name: 'ARC Climbing (Traverse)', details: '10 mins continuous' },
        { name: 'Push-ups', details: '3 sets x 12 reps' },
        { name: 'Plank', details: '3 sets x 45 secs' },
        { name: 'ARC Climbing (Traverse)', details: '10 mins continuous' }
      ]
    },
    {
      title: 'Cool Down',
      duration: '5 min',
      exercises: [
        { name: 'Forearm Stretch', details: '1 min each side' },
        { name: 'Child\'s Pose', details: '2 mins' }
      ]
    }
  ]
};

export default function SessionDetailScreen() {
  const router = useRouter();
  const { title } = useLocalSearchParams(); // 接收上一页传来的标题
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#FFF' }}>
      <View style={{ paddingTop: insets.top }}>
        <TopBar 
            routeName="session_detail" 
            title="Session" 
            useSafeArea={false}
            leftControls={{ mode: "back", onBack: () => router.back() }} 
        />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
        {/* 1. Header Info */}
        <View style={styles.header}>
            <Text style={styles.title}>{title || SESSION_DATA.title}</Text>
            <Text style={styles.subTitle}>{SESSION_DATA.type} · {SESSION_DATA.duration}</Text>
            <Text style={styles.desc}>{SESSION_DATA.description}</Text>
            
            <View style={styles.tagsRow}>
                <View style={styles.tag}><Text style={styles.tagText}>{SESSION_DATA.intensity}</Text></View>
                {SESSION_DATA.equipment.map((eq, i) => (
                    <View key={i} style={styles.tag}><Text style={styles.tagText}>{eq}</Text></View>
                ))}
            </View>
        </View>

        {/* 2. Blocks List */}
        <View style={styles.blocksContainer}>
            {SESSION_DATA.blocks.map((block, index) => (
                <View key={index} style={styles.block}>
                    <View style={styles.blockHeader}>
                        <Text style={styles.blockTitle}>{block.title}</Text>
                        <Text style={styles.blockDuration}>{block.duration}</Text>
                    </View>
                    
                    <View style={styles.exerciseList}>
                        {block.exercises.map((ex, i) => (
                            <View key={i} style={styles.exerciseRow}>
                                <View style={styles.bullet} />
                                <View style={{flex: 1}}>
                                    <Text style={styles.exName}>{ex.name}</Text>
                                    <Text style={styles.exDetails}>{ex.details}</Text>
                                </View>
                                {/* 可选：显示 info 图标或视频缩略图 */}
                                <Ionicons name="information-circle-outline" size={20} color="#E5E7EB" />
                            </View>
                        ))}
                    </View>
                </View>
            ))}
        </View>
      </ScrollView>

      {/* 3. Start Button */}
      <View style={[styles.bottomFloat, { paddingBottom: insets.bottom + 12 }]}>
         <TouchableOpacity 
            style={styles.startBtn} 
            activeOpacity={0.8}
            onPress={() => {
                // 这里通常跳转到 "Log Workout" 页面或开始计时器
                // router.push("/library/log-session"); 
                console.log("Start Session");
            }}
         >
            <Text style={styles.startBtnText}>Start Workout</Text>
            <Ionicons name="play" size={18} color="#FFF" style={{marginLeft: 8}} />
         </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 24, fontWeight: '800', color: '#111', marginBottom: 6 },
    subTitle: { fontSize: 14, color: '#6B7280', marginBottom: 12, fontWeight: '600' },
    desc: { fontSize: 14, color: '#4B5563', lineHeight: 22, marginBottom: 16 },
    
    tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    tag: { backgroundColor: '#F3F4F6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
    tagText: { fontSize: 12, color: '#4B5563', fontWeight: '500' },

    blocksContainer: { padding: 20, gap: 24 },
    block: {},
    blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    blockTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
    blockDuration: { fontSize: 13, color: '#6B7280', fontWeight: '600' },

    exerciseList: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 4 },
    exerciseRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#D1D5DB', marginRight: 12 },
    exName: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 2 },
    exDetails: { fontSize: 13, color: '#6B7280' },

    bottomFloat: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingTop: 12 },
    startBtn: { backgroundColor: '#111', height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    startBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});