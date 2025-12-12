// src/features/analysis/TrainingVolumeChart.tsx
import React, { useMemo, useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from "react-native";
import { BarChart, LineChart } from "react-native-gifted-charts"; // [新增] 引入 LineChart
import AsyncStorage from "@react-native-async-storage/async-storage"; 
import useLogsStore from "../../store/useLogsStore";
import { toDateString } from "../../store/usePlanStore";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// --- 1. 颜色与常量定义 ---
const BOULDER_COLORS = { easy: '#FCD34D', mid: '#F97316', hard: '#EF4444' };
const ROPE_COLORS = { beginner: '#22C55E', intermediate: '#3B82F6', advanced: '#A855F7', expert: '#111827', elite: '#9CA3AF' };
const READINESS_COLOR = "#8B5CF6"; 

const TIME_RANGES = ['W', 'M', 'Y'] as const;
type TimeRange = typeof TIME_RANGES[number];
type LogType = 'boulder' | 'yds';

// --- 辅助函数 ---
const getBoulderColor = (grade: string) => {
  const match = grade.match(/V(\d+)/i);
  if (!match) return BOULDER_COLORS.easy; 
  const num = parseInt(match[1], 10);
  if (num <= 2) return BOULDER_COLORS.easy;
  if (num <= 5) return BOULDER_COLORS.mid;
  return BOULDER_COLORS.hard;
};

const getRopeColor = (grade: string) => {
  if (grade.startsWith("5.6") || grade.startsWith("5.7") || grade.startsWith("5.8") || grade.startsWith("5.9")) return ROPE_COLORS.beginner;
  if (grade.startsWith("5.10")) return ROPE_COLORS.intermediate;
  if (grade.startsWith("5.11")) return ROPE_COLORS.advanced;
  if (grade.startsWith("5.12")) return ROPE_COLORS.expert;
  if (grade.startsWith("5.13") || grade.startsWith("5.14") || grade.startsWith("5.15")) return ROPE_COLORS.elite;
  return ROPE_COLORS.beginner;
};

const CurrentIndicator = () => (<View style={{ alignItems: 'center', marginBottom: 4 }}><View style={{width:0,height:0,backgroundColor:'transparent',borderStyle:'solid',borderLeftWidth:4,borderRightWidth:4,borderBottomWidth:6,borderLeftColor:'transparent',borderRightColor:'transparent',borderBottomColor:'#306E6F',transform:[{rotate:'180deg'}]}}/></View>);

const LegendDot = ({color, label}: {color: string, label: string}) => (
    <View style={{flexDirection:'row', alignItems:'center', gap:3}}>
        <View style={{width:6, height:6, borderRadius:3, backgroundColor:color}}/>
        <Text style={{fontSize:10, color:'#64748B'}}>{label}</Text>
    </View>
);

export default function TrainingVolumeChart() {
  const [timeRange, setTimeRange] = useState<TimeRange>('W');
  const [selectedTypes, setSelectedTypes] = useState<LogType[]>(['boulder', 'yds']);
  const { logs } = useLogsStore();
  const [readinessData, setReadinessData] = useState<Record<string, number>>({});

  useEffect(() => {
    const loadReadiness = async () => {
        try {
            const raw = await AsyncStorage.getItem("@daily_readiness");
            if (raw) setReadinessData(JSON.parse(raw));
        } catch {}
    };
    loadReadiness();
  }, []);

  const toggleType = (type: LogType) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length > 1) setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const CHART_PARENT_WIDTH = SCREEN_WIDTH - 48; 
  const Y_AXIS_WIDTH = 26;
  const INITIAL_SPACING = 12;
  const ACTUAL_CHART_WIDTH = CHART_PARENT_WIDTH - Y_AXIS_WIDTH - INITIAL_SPACING;

  // --- 核心计算 ---
  const { barData, lineData, maxValue, barWidth, slotWidth } = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    let dataPoints: any[] = [];
    let linePoints: any[] = []; 
    let maxStackValue = 0;
    const updateMax = (val: number) => { if (val > maxStackValue) maxStackValue = val; };

    // 1. Slot 计算
    let slotCount = 7;
    if (timeRange === 'M') slotCount = 4;
    if (timeRange === 'Y') slotCount = 12;

    const slotWidth = Math.floor(ACTUAL_CHART_WIDTH / slotCount);

    const showBoulder = selectedTypes.includes('boulder');
    const showRope = selectedTypes.includes('yds');
    const showBoth = showBoulder && showRope;
    
    // 2. 柱子宽度计算
    const widthRatio = slotCount === 4 ? 0.4 : 0.6; 
    let baseBarWidth = Math.floor(slotWidth * widthRatio);
    if (baseBarWidth % 2 !== 0) baseBarWidth -= 1; 
    
    let finalBarWidth = baseBarWidth;
    let finalSpacing = 0;
    const innerGap = 4;

    if (showBoth) {
        finalBarWidth = (baseBarWidth - innerGap) / 2;
        finalSpacing = slotWidth - (finalBarWidth * 2) - innerGap;
    } else {
        finalBarWidth = baseBarWidth;
        finalSpacing = slotWidth - finalBarWidth;
    }

    // --- 数据辅助 ---
    const getAvgReadiness = (dates: string[]) => {
        let sum = 0; let count = 0;
        dates.forEach(d => { if (readinessData[d]) { sum += readinessData[d]; count++; } });
        return count === 0 ? 0 : Math.round((sum / count) * 10) / 10;
    };

    const buildBoulderStack = (filteredLogs: typeof logs) => {
        let easy = 0, mid = 0, hard = 0;
        filteredLogs.forEach(l => { if (l.type !== 'boulder') return; const c = getBoulderColor(l.grade); if (c === BOULDER_COLORS.easy) easy += l.count; else if (c === BOULDER_COLORS.mid) mid += l.count; else hard += l.count; });
        const total = easy + mid + hard; updateMax(total);
        return [{ value: easy, color: BOULDER_COLORS.easy }, { value: mid, color: BOULDER_COLORS.mid }, { value: hard, color: BOULDER_COLORS.hard }];
    };
    const buildRopeStack = (filteredLogs: typeof logs) => {
        let c1=0, c2=0, c3=0, c4=0, c5=0;
        filteredLogs.forEach(l => { if (l.type !== 'yds') return; const c = getRopeColor(l.grade); if (c === ROPE_COLORS.beginner) c1 += l.count; else if (c === ROPE_COLORS.intermediate) c2 += l.count; else if (c === ROPE_COLORS.advanced) c3 += l.count; else if (c === ROPE_COLORS.expert) c4 += l.count; else c5 += l.count; });
        const total = c1 + c2 + c3 + c4 + c5; updateMax(total);
        return [{ value: c1, color: ROPE_COLORS.beginner }, { value: c2, color: ROPE_COLORS.intermediate }, { value: c3, color: ROPE_COLORS.advanced }, { value: c4, color: ROPE_COLORS.expert }, { value: c5, color: ROPE_COLORS.elite }];
    };

    const pushData = (logsForUnit: typeof logs, label: string, isCurrent: boolean, datesForAvg: string[], isFuture: boolean = false) => {
        const labelStyle = isCurrent ? { color: '#306E6F', fontWeight: '700' } : { color: '#64748B', fontSize: 10 };
        const topComponent = isCurrent ? CurrentIndicator : undefined;
        
        // 柱状图数据
        if (showBoulder) {
            dataPoints.push({ stacks: buildBoulderStack(logsForUnit), label: showBoth ? '' : label, spacing: showBoth ? innerGap : finalSpacing, labelTextStyle: labelStyle, topLabelComponent: showBoth ? undefined : topComponent });
        }
        if (showRope) {
            dataPoints.push({ stacks: buildRopeStack(logsForUnit), label: label, spacing: finalSpacing, labelTextStyle: labelStyle, topLabelComponent: topComponent });
        }

        // 折线图数据 (不再需要 shiftX，因为 LineChart 独立渲染，会自动居中)
        if (!isFuture) {
            const avg = getAvgReadiness(datesForAvg);
            linePoints.push({ value: avg, dataPointText: avg > 0 ? avg.toString() : '', hideDataPoint: avg === 0 });
        } else {
            // 未来日期填 0 并隐藏，占位用
            linePoints.push({ value: 0, hideDataPoint: true });
        }
    };

    // --- 遍历逻辑 (保持不变) ---
    if (timeRange === 'W') {
      const day = today.getDay();
      const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
      const monday = new Date(today); monday.setDate(diff);
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday); d.setDate(monday.getDate() + i);
        const dateStr = toDateString(d);
        const isToday = d.getTime() === today.getTime();
        const isFuture = d.getTime() > today.getTime();
        pushData(logs.filter(l => l.date === dateStr), ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i], isToday, [dateStr], isFuture);
      }
    } 
    else if (timeRange === 'M') {
      const year = today.getFullYear(); const month = today.getMonth();
      const weeks = [[1,7], [8,14], [15,21], [22,31]];
      weeks.forEach((range, idx) => {
        const rangeDates: string[] = [];
        for(let i=range[0]; i<=range[1]; i++) { const d = new Date(year, month, i); if (d.getMonth() === month) rangeDates.push(toDateString(d)); }
        const isCurrentWeek = today.getDate() >= range[0] && today.getDate() <= range[1];
        const isFuture = today.getDate() < range[0];
        pushData(logs.filter(l => rangeDates.includes(l.date)), `W${idx + 1}`, isCurrentWeek, rangeDates, isFuture);
      });
    } 
    else {
      const year = today.getFullYear();
      for (let i = 0; i < 12; i++) {
        const monthPrefix = `${year}-${String(i + 1).padStart(2, '0')}`;
        const isCurrentMonth = i === today.getMonth();
        const isFuture = i > today.getMonth();
        const monthDates = Object.keys(readinessData).filter(k => k.startsWith(monthPrefix));
        pushData(logs.filter(l => l.date.startsWith(monthPrefix)), ['J','F','M','A','M','J','J','A','S','O','N','D'][i], isCurrentMonth, monthDates, isFuture);
      }
    }

    const calculatedMax = Math.max(4, Math.ceil(maxStackValue / 4) * 4);
    
    return { barData: dataPoints, lineData: linePoints, maxValue: calculatedMax, barWidth: finalBarWidth, slotWidth };
  }, [logs, timeRange, selectedTypes, readinessData]);

  // 配置 LineChart 的初始间距，使其对齐柱子中心
  // 柱状图：Initial Spacing = 12
  // 柱子中心 = 12 + SlotWidth/2
  // LineChart 默认从左边开始画，InitialSpacing 应该推到第一个Slot中心
  const lineInitialSpacing = INITIAL_SPACING + (slotWidth / 2);

  return (
    <View style={styles.chartCard}>
        <View style={styles.cardHeader}>
             <View>
              <Text style={styles.cardTitle}>Training Volume</Text>
              <View style={{flexDirection: 'row', marginTop: 8, gap: 8}}>
                  <TouchableOpacity onPress={() => toggleType('boulder')} style={[styles.typePill, selectedTypes.includes('boulder') ? styles.typePillActive : styles.typePillInactive]}><Text style={[styles.typePillText, selectedTypes.includes('boulder') && {color: '#fff'}]}>Boulder</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => toggleType('yds')} style={[styles.typePill, selectedTypes.includes('yds') ? styles.typePillActive : styles.typePillInactive]}><Text style={[styles.typePillText, selectedTypes.includes('yds') && {color: '#fff'}]}>Rope</Text></TouchableOpacity>
              </View>
             </View>
             <View style={styles.segmentContainer}>
                {TIME_RANGES.map(r => (
                    <TouchableOpacity key={r} onPress={() => setTimeRange(r)} style={[styles.segmentBtn, timeRange === r && styles.segmentBtnActive]}>
                        <Text style={[styles.segmentText, timeRange === r && styles.segmentTextActive]}>{r}</Text>
                    </TouchableOpacity>
                ))}
             </View>
        </View>
        
        {/* --- 图表区域 --- */}
        <View style={{ marginLeft: -10, marginTop: 12 }}> 
          
          {/* 上层：状态曲线 (Readiness) */}
          <View style={{ height: 80, marginBottom: -10, zIndex: 10 }}>
            <LineChart
                key={`line-${timeRange}`} // 强制重绘
                data={lineData}
                width={ACTUAL_CHART_WIDTH + INITIAL_SPACING}
                height={80}
                
                // [关键] 对齐逻辑
                spacing={slotWidth}
                initialSpacing={lineInitialSpacing} 
                
                // 样式
                color={READINESS_COLOR}
                thickness={2}
                curved
                hideDataPoints={false}
                dataPointsShape='custom'
                dataPointsHeight={6} dataPointsWidth={6} dataPointsColor={READINESS_COLOR}
                strokeDashArray={[4, 4]}
                
                // Y轴
                maxValue={5} noOfSections={2}
                yAxisLabelWidth={Y_AXIS_WIDTH}
                yAxisTextStyle={{ color: READINESS_COLOR, fontSize: 10 }}
                hideRules
                xAxisThickness={0} yAxisThickness={0}
                hideAxesAndRules // 隐藏轴线，只留数据
            />
          </View>

          {/* 下层：训练量柱状图 (Volume) */}
          <View>
            <BarChart
                key={`bar-${timeRange}-${selectedTypes.join('-')}`}
                width={ACTUAL_CHART_WIDTH + INITIAL_SPACING} 
                height={160}
                
                stackData={barData}
                maxValue={maxValue}
                noOfSections={4}
                
                initialSpacing={INITIAL_SPACING}
                barWidth={barWidth}
                // spacing 由数据内部控制
                
                roundedTop roundedBottom hideRules
                xAxisThickness={0} yAxisThickness={0}
                formatYLabel={(label) => parseInt(label, 10).toString()}
                yAxisTextStyle={{ color: '#94A3B8', fontSize: 10 }}
                xAxisLabelTextStyle={{ color: '#64748B', fontSize: 10, textAlign: 'center' }}
                yAxisLabelWidth={Y_AXIS_WIDTH} 
                
                scrollAnimation={false}
                isAnimated animationDuration={400}
            />
          </View>

        </View>
        
        {/* Legend */}
        <View style={{marginTop: 16, gap: 8}}>
           {selectedTypes.includes('boulder') && (
              <View style={styles.legendRow}>
                <Text style={styles.legendTitle}>Boulder:</Text>
                <LegendDot color={BOULDER_COLORS.easy} label="V0-V2" />
                <LegendDot color={BOULDER_COLORS.mid} label="V3-V5" />
                <LegendDot color={BOULDER_COLORS.hard} label="V6+" />
              </View>
           )}
           {selectedTypes.includes('yds') && (
              <View style={styles.legendRow}>
                <Text style={styles.legendTitle}>Rope:</Text>
                <LegendDot color={ROPE_COLORS.beginner} label="Beginner" />
                <LegendDot color={ROPE_COLORS.intermediate} label="5.10" />
                <LegendDot color={ROPE_COLORS.advanced} label="5.11" />
                <LegendDot color={ROPE_COLORS.expert} label="5.12" />
                <LegendDot color={ROPE_COLORS.elite} label="5.13+" />
              </View>
           )}
           <View style={styles.legendRow}>
              <Text style={styles.legendTitle}>Status:</Text>
              <LegendDot color={READINESS_COLOR} label="1-5 Scale" />
           </View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
    chartCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 0.5, borderColor: '#E5E7EB', shadowColor: "#000", shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
    segmentContainer: { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 2 },
    segmentBtn: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 6 },
    segmentBtnActive: { backgroundColor: '#FFFFFF', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width:0, height:1} },
    segmentText: { fontSize: 12, fontWeight: '600', color: '#6B7280' },
    segmentTextActive: { color: '#111827' },
    typePill: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 12, borderWidth: 0.5, borderColor: '#E5E7EB' },
    typePillActive: { backgroundColor: '#111' },
    typePillInactive: { backgroundColor: '#F3F4F6' },
    typePillText: { fontSize: 11, fontWeight: '600', color: '#4B5563' },
    legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
    legendTitle: { fontSize: 11, fontWeight: '700', color: '#374151', marginRight: 4 }
});