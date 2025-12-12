// app/(tabs)/analysis.tsx
import React, { useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Dimensions, LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

// Components
import TopBar from "../../components/TopBar";
import TrainingVolumeChart from "../../src/features/analysis/TrainingVolumeChart";
import GradePyramid from "../../src/features/analysis/GradePyramid"; // 引入你之前的金字塔组件

// Stores
import { usePlanStore } from "../../src/store/usePlanStore";
import useLogsStore from "../../src/store/useLogsStore";

const GRADE_SCORE: Record<string, number> = {
  "VB": 0, "V0": 1, "V1": 2, "V2": 3, "V3": 4, "V4": 5,
  "V5": 6, "V6": 7, "V7": 8, "V8": 9, "V9": 10, "V10": 11,
  "5.6": 1, "5.7": 1, "5.8": 2, "5.9": 3,
  "5.10a": 3.5, "5.10b": 3.5, "5.10c": 4, "5.10d": 4,
  "5.11a": 5, "5.11b": 5.2, "5.11c": 5.5, "5.11d": 5.8,
  "5.12a": 6, "5.12b": 6.2, "5.12c": 6.5, "5.12d": 6.8,
  "5.13a": 7, "5.13b": 8, "5.13c": 9, "5.13d": 10
};

export default function AnalysisTab() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  
  React.useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  const { logs } = useLogsStore();
  const { monthMap, buildMonthMap } = usePlanStore();

  React.useEffect(() => { buildMonthMap(new Date()); }, [buildMonthMap]);

  // --- KPI 计算 ---
  const stats = useMemo(() => {
    const sessionCount = Object.values(monthMap).filter(pct => pct > 0).length;
    const boulderLogs = logs.filter(l => l.type === 'boulder');
    const ropeLogs = logs.filter(l => l.type === 'yds');

    const findMax = (list: typeof logs) => {
      let maxScore = -1;
      let maxLabel = "-";
      list.forEach(log => {
        const score = GRADE_SCORE[log.grade] || 0;
        if (score > maxScore) {
          maxScore = score;
          maxLabel = log.grade;
        }
      });
      return maxLabel;
    };

    const calcTotal = (list: typeof logs) => list.reduce((sum, l) => sum + l.count, 0);

    return {
      sessions: sessionCount,
      maxBoulder: findMax(boulderLogs),
      maxRope: findMax(ropeLogs),
      totalBoulder: calcTotal(boulderLogs),
      totalRope: calcTotal(ropeLogs),
    };
  }, [logs, monthMap]);

  // --- Snapping 逻辑 ---
  const [snapOffsets, setSnapOffsets] = useState<number[]>([]);
  
  // 动态测量第一个图表的高度，确定第二个图表的吸附位置
  const handleChartLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    // 吸附点：0 (顶部) 和 (第一个图表高度 + 间距)
    // 加上 16 是因为我们在图表之间留了 marginBottom
    setSnapOffsets([0, height + 16]);
  };

  const SplitCard = ({ title, topVal, bottomVal, iconName, iconColor }: any) => (
    <View style={styles.kpiCard}>
        <Ionicons name={iconName} size={24} color={iconColor} style={{marginBottom: 8}} />
        <View style={styles.splitRow}>
            <Text style={styles.splitLabel}>🪨</Text>
            <Text style={styles.splitValue}>{topVal}</Text>
        </View>
        <View style={styles.splitDivider} />
        <View style={styles.splitRow}>
            <Text style={styles.splitLabel}>🧗</Text>
            <Text style={styles.splitValue}>{bottomVal}</Text>
        </View>
        <Text style={styles.kpiTitle}>{title}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#F9FAFB" }}>
      
      {/* === 1. 固定头部区域 (Fixed Header) === */}
      {/* 包含 TopBar 和 KPI Cards，这一块不会随 ScrollView 滚动 */}
      <View style={{ 
        zIndex: 10, 
        backgroundColor: "#F9FAFB",
        // 下边框阴影，增加层次感，表明下面是可以滚动的
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E7EB',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
      }}>
        
        {/* TopBar 容器 (处理刘海) */}
        <View style={{ paddingTop: 0 }}>
          <TopBar routeName="analysis" titleZH="数据分析" titleEN="Analysis" />
        </View>

        {/* KPIs 容器 (固定在 TopBar 下方) */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
          <View style={styles.kpiContainer}>
             <View style={[styles.kpiCard, {justifyContent: 'center'}]}>
                <Ionicons name="flame" size={28} color="#F59E0B" />
                <Text style={{fontSize: 28, fontWeight: '800', color: '#111', marginVertical: 4}}>{stats.sessions}</Text>
                <Text style={styles.kpiTitle}>Sessions</Text>
             </View>
             <SplitCard title="Max Grade" topVal={stats.maxBoulder} bottomVal={stats.maxRope} iconName="trending-up" iconColor="#10B981" />
             <SplitCard title="Routes" topVal={stats.totalBoulder} bottomVal={stats.totalRope} iconName="layers" iconColor="#3B82F6" />
          </View>
        </View>
      </View>

      {/* === 2. 滚动图表区域 (Scrollable Body) === */}
      <ScrollView 
        contentContainerStyle={{ 
          paddingTop: 16, // 与 Header 的间距
          paddingBottom: 120, // 底部留白
          paddingHorizontal: 16 
        }}
        // [核心] 吸附配置
        snapToOffsets={snapOffsets}
        snapToAlignment="start" // 对齐顶部
        decelerationRate="fast" // 快速吸附效果
        showsVerticalScrollIndicator={false}
      >
        
        {/* 图表 1: Training Volume */}
        <View onLayout={handleChartLayout} style={{ marginBottom: 16 }}>
           <TrainingVolumeChart />
        </View>

        {/* 图表 2: Grade Pyramid */}
        <GradePyramid />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, height: 140 },
  kpiCard: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, borderWidth: 0.5, borderColor: '#E5E7EB' },
  splitRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginVertical: 2 },
  splitLabel: { fontSize: 12 },
  splitValue: { fontSize: 18, fontWeight: '800', color: '#111827' },
  splitDivider: { width: '40%', height: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  kpiTitle: { fontSize: 10, color: '#6B7280', fontWeight: '700', marginTop: 'auto', textTransform: 'uppercase', letterSpacing: 0.5 },
  // Chart Card 样式已移至各自组件内部
});