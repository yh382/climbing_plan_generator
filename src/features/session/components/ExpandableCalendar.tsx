// src/features/session/components/ExpandableCalendar.tsx
import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";

// [新增] 引入 Store 和工具函数
// 请确保路径正确，根据你的项目结构，通常是回退 3 层找到 store
import { usePlanStore, toDateString } from "../../../store/usePlanStore";

// 开启 Android 的 LayoutAnimation
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 进度圆环组件
const ProgressRing = ({ progress, active }: { progress: number, active: boolean }) => (
  <View style={[styles.ringContainer, active && styles.ringActive]}>
    <View style={[styles.ringOuter, { borderColor: progress >= 1 ? '#10B981' : '#E5E7EB' }]}>
        {/* 0 < progress < 1 时显示内部填充（水位效果）。
           接入真实数据后，如果某天只完成了一半任务，这里依然会显示半高，
           如果不想要这种效果，可以改为 progress > 0 ? 1 : 0 
        */}
        {progress > 0 && progress < 1 && (
            <View style={[styles.ringInner, { height: `${progress * 100}%` }]} />
        )}
        {/* 100% 完成时显示全实心圆 */}
        {progress >= 1 && <View style={styles.ringFull} />}
    </View>
  </View>
);

export default function ExpandableCalendar() {
  const [expanded, setExpanded] = useState(false); // 默认周视图
  const [selectedDate, setSelectedDate] = useState(new Date());

  // [新增] 从 Store 获取数据
  const { monthMap, buildMonthMap } = usePlanStore();

  // [新增] 当选中的日期变化（比如切月份）时，重新计算该月的进度数据
  useEffect(() => {
    buildMonthMap(selectedDate);
  }, [selectedDate, buildMonthMap]);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded(!expanded);
  };

  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }); // 周一为起始
  const days = Array.from({ length: expanded ? 35 : 7 }).map((_, i) => addDays(startDate, i));

  // [修改] 真实数据逻辑
  const getProgress = (date: Date) => {
    const dateStr = toDateString(date); // 转换成 "YYYY-MM-DD"
    const percentage = monthMap[dateStr] || 0; // 获取 Store 里的进度 (0-100)
    return percentage / 100; // 转为 0-1 小数
  };

  return (
    <View style={styles.container}>
      {/* 日历网格 */}
      <View style={styles.grid}>
        {/* 星期表头 */}
        <View style={styles.row}>
            {['M','T','W','T','F','S','S'].map((d, i) => (
                <Text key={i} style={styles.weekLabel}>{d}</Text>
            ))}
        </View>
        
        {/* 日期格子 */}
        <View style={styles.datesContainer}>
            {days.map((date, i) => {
                const isSelected = isSameDay(date, selectedDate);
                const progress = getProgress(date);
                return (
                    <TouchableOpacity 
                        key={i} 
                        style={styles.dayCell} 
                        onPress={() => setSelectedDate(date)}
                    >
                        <ProgressRing progress={progress} active={isSelected} />
                        <Text style={[styles.dayText, isSelected && styles.dayTextActive]}>
                            {format(date, 'd')}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
      </View>

      {/* 底部折叠栏 & 本周摘要 */}
      <View style={styles.footer}>
        
        <TouchableOpacity onPress={toggleExpand} style={styles.expandBtn}>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#FFF', margin: 16, borderRadius: 16, padding: 12, shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: {width:0, height:2} },
  grid: { gap: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 4 },
  weekLabel: { width: 32, textAlign: 'center', fontSize: 12, color: '#9CA3AF', fontWeight: '600' },
  datesContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  dayCell: { width: '14%', alignItems: 'center', gap: 4, marginBottom: 8 },
  dayText: { fontSize: 12, color: '#374151' },
  dayTextActive: { color: '#111827', fontWeight: '700' },
  
  // 圆环样式
  ringContainer: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  ringActive: { backgroundColor: '#F3F4F6', borderRadius: 16 },
  ringOuter: { width: 24, height: 24, borderRadius: 12, borderWidth: 3, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, // overflow hidden 确保内部填充不溢出
  ringInner: { width: 24, backgroundColor: '#10B981', position: 'absolute', bottom: 0, opacity: 0.5 }, // 稍微透明一点的填充
  ringFull: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981' },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statText: { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  expandBtn: { padding: 4 }
});