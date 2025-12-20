// app/library/log-detail.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image, FlatList } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { format, parseISO } from "date-fns";

import TopBar from "../../components/TopBar"; 
import useLogsStore from "../../src/store/useLogsStore"; // [新增] 引入 Store

export default function LogDetailScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams(); // [新增] 获取日期参数 (YYYY-MM-DD)
  const insets = useSafeAreaInsets();
  const { logs } = useLogsStore(); // [新增] 获取所有日志

  // [核心] 筛选出当天的记录
  const dailyLogs = useMemo(() => {
    if (!date || typeof date !== 'string') return [];
    // 假设 logs 里的 date 也是 YYYY-MM-DD 格式
    return logs.filter(l => l.date === date);
  }, [logs, date]);

  // 计算头部统计信息
  const summary = useMemo(() => {
    const totalSends = dailyLogs.reduce((acc, curr) => acc + (curr.count || 1), 0);
    // 这里假设 date 参数是有效的日期字符串
    const displayDate = date ? format(parseISO(date as string), "EEEE, MMM dd") : "Unknown Date";
    return { totalSends, displayDate };
  }, [dailyLogs, date]);

  // 渲染单条记录
  const renderClimbCard = ({ item }: { item: any }) => {
    // 假设 Log 对象结构: { grade: "V4", attempts: 1, status: "sent", ... }
    // 如果你的 Store 数据结构不同，请在这里适配
    const status = item.status || (item.attempts === 1 ? 'flash' : 'sent'); // 简单回退逻辑
    const statusColor = status === 'flash' ? '#F59E0B' : status === 'sent' ? '#10B981' : '#EF4444';
    const statusText = status === 'flash' ? '⚡ Flash' : status === 'sent' ? '✅ Sent' : '❌ Attempt';

    return (
      <View style={styles.card}>
        {/* 左侧：照片 (如果没有照片显示 V 级占位) */}
        <View style={styles.imageContainer}>
            {item.image ? (
                <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
            ) : (
                <View style={[styles.image, styles.noImage]}>
                    {/* 如果没图，显示大大的等级 */}
                    <Text style={{fontSize: 24, fontWeight: '900', color: '#E5E7EB'}}>{item.grade}</Text>
                </View>
            )}
        </View>

        {/* 右侧：信息 */}
        <View style={styles.infoContainer}>
            <View style={styles.rowTop}>
                <View style={[styles.gradeBadge, { backgroundColor: statusColor }]}>
                    <Text style={styles.gradeText}>{item.grade}</Text>
                </View>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusText}</Text>
            </View>
            
            <View style={styles.rowBottom}>
                <Ionicons name="refresh" size={14} color="#6B7280" />
                <Text style={styles.attemptsText}>{item.attempts || 1} attempts</Text>
            </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      
      {/* 外部 View 处理安全区域 */}
      <View style={{ paddingTop: insets.top, backgroundColor: '#FFF' }}>
        <TopBar 
            routeName="log_detail" 
            title="Daily Log"
            useSafeArea={false} // 关闭 TopBar 内部 padding
            leftControls={{ mode: "back", onBack: () => router.back() }}
            rightAccessory={
                <Ionicons name="create-outline" size={24} color="#111" style={{padding: 4}} />
            }
        />
      </View>

      <View style={styles.summaryHeader}>
          <View>
            <Text style={styles.dateTitle}>{summary.displayDate}</Text>
            <Text style={styles.locationSub}>📍 The Front Climbing Gym</Text>
          </View>
          <View style={styles.summaryStats}>
              <Text style={styles.totalText}>{summary.totalSends} Sends</Text>
              <Text style={styles.durationText}>Session Total</Text>
          </View>
      </View>

      <FlatList
        data={dailyLogs}
        renderItem={renderClimbCard}
        keyExtractor={(item, index) => item.id || index.toString()}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
            <View style={{padding: 20, alignItems: 'center'}}>
                <Text style={{color: '#999'}}>No specific routes logged for this day.</Text>
            </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  summaryHeader: { backgroundColor: '#FFF', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  dateTitle: { fontSize: 20, fontWeight: '800', color: '#111' },
  locationSub: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  summaryStats: { alignItems: 'flex-end' },
  totalText: { fontSize: 16, fontWeight: '700', color: '#111' },
  durationText: { fontSize: 12, color: '#9CA3AF' },
  card: { backgroundColor: '#FFF', borderRadius: 12, marginBottom: 12, flexDirection: 'row', overflow: 'hidden', shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: {width:0, height:2} },
  imageContainer: { width: 100, height: 100 },
  image: { width: '100%', height: '100%' },
  noImage: { backgroundColor: '#F9FAFB', alignItems: 'center', justifyContent: 'center' },
  infoContainer: { flex: 1, padding: 12, justifyContent: 'space-between' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, minWidth: 40, alignItems: 'center' },
  gradeText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
  statusText: { fontSize: 12, fontWeight: '600' },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  attemptsText: { fontSize: 13, color: '#6B7280' }
});