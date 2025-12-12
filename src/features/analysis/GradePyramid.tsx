// src/features/analysis/GradePyramid.tsx
import React, { useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons"; // 引入图标库
import useLogsStore from "../../store/useLogsStore";

// --- 1. 颜色与配置 ---
const BOULDER_COLORS = {
  easy: '#FCD34D', mid: '#F97316', hard: '#EF4444',
};
const ROPE_COLORS = {
  beginner: '#22C55E', intermediate: '#3B82F6', advanced: '#A855F7', expert: '#111827', elite: '#9CA3AF',
};

// --- 2. 辅助工具 ---
const getBoulderColor = (grade: string) => {
  const match = grade.match(/V(\d+)/i);
  if (!match) return BOULDER_COLORS.easy; 
  const num = parseInt(match[1], 10);
  if (num <= 2) return BOULDER_COLORS.easy;
  if (num <= 5) return BOULDER_COLORS.mid;
  return BOULDER_COLORS.hard;
};

const getRopeColor = (grade: string) => {
  if (grade.match(/^5\.[6-9]/)) return ROPE_COLORS.beginner;
  if (grade.startsWith("5.10")) return ROPE_COLORS.intermediate;
  if (grade.startsWith("5.11")) return ROPE_COLORS.advanced;
  if (grade.startsWith("5.12")) return ROPE_COLORS.expert;
  if (grade.match(/^5\.1[3-5]/)) return ROPE_COLORS.elite;
  return ROPE_COLORS.beginner;
};

const getGradeScore = (grade: string, type: 'boulder' | 'rope'): number => {
  if (type === 'boulder') {
    const match = grade.match(/V(\d+)/i);
    return match ? parseInt(match[1], 10) : -1;
  } else {
    const match = grade.match(/^5\.(\d+)([abcd])?/);
    if (!match) return 0;
    const major = parseInt(match[1], 10);
    let minor = 0;
    if (match[2] === 'a') minor = 0.0;
    else if (match[2] === 'b') minor = 0.25;
    else if (match[2] === 'c') minor = 0.5;
    else if (match[2] === 'd') minor = 0.75;
    return major + minor;
  }
};

type TabType = 'boulder' | 'rope';

export default function GradePyramid() {
  const { logs } = useLogsStore();
  const [activeTab, setActiveTab] = useState<TabType>('boulder');

  const pyramidData = useMemo(() => {
    const targetType = activeTab === 'boulder' ? 'boulder' : 'yds';
    const counts: Record<string, number> = {};
    logs.forEach(l => {
      if (l.type !== targetType) return;
      if (!counts[l.grade]) counts[l.grade] = 0;
      counts[l.grade] += l.count;
    });

    const sorted = Object.keys(counts).sort((a, b) => {
      const scoreA = getGradeScore(a, activeTab);
      const scoreB = getGradeScore(b, activeTab);
      return scoreB - scoreA;
    });

    // 只取最高的 8 个等级，避免金字塔过长
    return sorted.map(grade => ({
      grade,
      count: counts[grade],
      color: activeTab === 'boulder' ? getBoulderColor(grade) : getRopeColor(grade)
    }));
  }, [logs, activeTab]);

  const maxCount = useMemo(() => {
     if (pyramidData.length === 0) return 1;
     return Math.max(...pyramidData.map(d => d.count));
  }, [pyramidData]);

  // [新增] 显示帮助提示
  const showHelpAlert = () => {
    Alert.alert(
      "About Grade Pyramid",
      "能力金字塔反映了你的攀爬基础结构。\n\n一个健康的结构应该是“正三角形”（底宽顶尖），意味着你有扎实的中低难度积累来支撑高难度的突破。\n\n如果是“倒T型”或柱状，说明基础不稳，强行磕红线更容易导致受伤。建议多积累金字塔中下层的路线来加固基础。",
      [{ text: "Got it" }]
    );
  };

  return (
    // [修改] 用统一的卡片样式包裹
    <View style={styles.chartCard}>
      {/* [新增] 卡片头部：标题 + 右侧控制区 */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Grade Pyramid</Text>
        
        {/* 右侧控制区：切换胶囊 + 问号按钮 */}
        <View style={styles.headerControls}>
          {/* 切换胶囊 */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity 
              style={[styles.toggleBtn, activeTab === 'boulder' && styles.toggleBtnActive]}
              onPress={() => setActiveTab('boulder')}
            >
              <Text style={[styles.toggleText, activeTab === 'boulder' && styles.toggleTextActive]}>Boulder</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.toggleBtn, activeTab === 'rope' && styles.toggleBtnActive]}
              onPress={() => setActiveTab('rope')}
            >
              <Text style={[styles.toggleText, activeTab === 'rope' && styles.toggleTextActive]}>Rope</Text>
            </TouchableOpacity>
          </View>

          {/* [新增] 问号提示按钮 */}
          <TouchableOpacity onPress={showHelpAlert} style={styles.helpBtn}>
            <Ionicons name="help-circle-outline" size={20} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- 金字塔图表主体 --- */}
      <View style={styles.container}>
        {pyramidData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No {activeTab === 'boulder' ? 'boulder' : 'rope'} climbs logged yet.
            </Text>
          </View>
        ) : (
          <View style={styles.chartBody}>
            {pyramidData.map((item) => {
              const widthPct = Math.max(12, (item.count / maxCount) * 100);
              return (
                <View key={item.grade} style={styles.row}>
                  <Text style={styles.gradeLabel}>{item.grade}</Text>
                  <View style={styles.barTrack}>
                     <View style={[styles.bar, { width: `${widthPct}%`, backgroundColor: item.color, opacity: 0.9 }]}>
                       <Text style={styles.barCount}>{item.count}</Text>
                     </View>
                  </View>
                  <View style={{width: 40}} /> 
                </View>
              );
            })}
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // [新增] 统一的卡片样式
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: '#E5E7EB',
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  // [新增] 头部样式
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12, // 胶囊和问号之间的间距
  },
  helpBtn: {
    padding: 4, // 增加点击区域
  },
  // [修改] Toggle 样式调整为适应头部
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 2,
    // 移除了 marginBottom
  },
  toggleBtn: {
    paddingVertical: 4, // 稍微减小高度
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: {width:0, height:1},
  },
  toggleText: {
    fontSize: 12, // 稍微减小字号
    fontWeight: '600',
    color: '#6B7280',
  },
  toggleTextActive: {
    color: '#111827',
  },
  
  // 图表主体样式保持不变
  container: {
    alignItems: 'center',
    width: '100%',
    paddingTop: 8,
  },
  chartBody: {
    width: '100%',
    paddingHorizontal: 10,
  },
  emptyContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    width: '100%',
    justifyContent: 'center',
  },
  gradeLabel: {
    width: 40,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginRight: 8,
  },
  barTrack: {
    flex: 1,
    alignItems: 'center',
  },
  bar: {
    height: 22,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 24,
  },
  barCount: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  }
});