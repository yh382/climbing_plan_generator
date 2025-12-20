// src/components/MiniWorkoutPlayer.tsx

import React, { useEffect } from 'react'; // 引入 useEffect
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import useActiveWorkoutStore from '../store/useActiveWorkoutStore';

export default function MiniWorkoutPlayer() {
  const router = useRouter();
  
  // [新增] 引入 tick 方法
  const { isActive, isMinimized, isPaused, seconds, tick, maximizeWorkout } = useActiveWorkoutStore();

  // [核心修复] 当悬浮窗显示时，由它来负责“心跳”
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    // 只有在 (训练中 + 已最小化 + 未暂停) 时才计时
    // 这样避免和 PlanView 里的计时器冲突（因为 PlanView 显示时 isMinimized 为 false，这里组件会 return null，effect 也会清除）
    if (isActive && isMinimized && !isPaused) {
      interval = setInterval(() => {
        tick();
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isActive, isMinimized, isPaused]);

  // 只有在 "训练中" 且 "已最小化" 时才显示
  if (!isActive || !isMinimized) return null;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const handlePress = () => {
    maximizeWorkout();
    router.push("/library/plan-view"); 
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.9}>
      <View style={styles.iconBox}>
         <Ionicons name="barbell" size={20} color="#FFF" />
      </View>
      <View style={styles.content}>
         <Text style={styles.label}>Active Workout</Text>
         <Text style={styles.timer}>{formatTime(seconds)}</Text>
      </View>
      <View style={styles.arrow}>
         <Ionicons name="chevron-up" size={20} color="#6B7280" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 100, right: 20, 
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF', borderRadius: 30, padding: 8, paddingRight: 16,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: {width:0, height:4}, elevation: 10
  },
  iconBox: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#22C55E', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  content: { marginRight: 10 },
  label: { fontSize: 10, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  timer: { fontSize: 16, color: '#111', fontWeight: '800', fontVariant: ['tabular-nums'] },
  arrow: { opacity: 0.5 }
});