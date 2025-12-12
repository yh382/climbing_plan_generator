import React, { useMemo, useCallback } from "react";
import { View, FlatList, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// Components
import { Button } from "../../../components/ui/Button";
import { tokens } from "../../../components/ui/Theme";

// Types
import { PlanV3, PlanV3Session, PlanV3SessionItem } from "../../types/plan";

// --- 常量定义 ---
const READINESS_MAP: Record<number, { icon: string; en: string; zh: string }> = {
  1: { icon: "😫", en: "Tired", zh: "疲劳" },
  2: { icon: "😮‍💨", en: "Low", zh: "需恢复" },
  3: { icon: "🙂", en: "Ok", zh: "正常" },
  4: { icon: "💪", en: "Strong", zh: "不错" },
  5: { icon: "🔥", en: "Peak", zh: "极佳" },
};

// --- 子组件：Header ---
interface PlanHeaderProps {
  currentReadiness?: number;
  onOpenStatus: () => void;
  dayCompletion?: number;
  isZH: boolean;
  paddingTop: number; 
}

const PlanHeader = React.memo((props: PlanHeaderProps) => {
  const { currentReadiness = 3, onOpenStatus, dayCompletion = 0, isZH, paddingTop } = props;
  const status = READINESS_MAP[currentReadiness] || READINESS_MAP[3];
  const percent = Math.round((isNaN(dayCompletion) ? 0 : dayCompletion) * 100);

  return (
    <View>
      <View style={{ height: paddingTop + 16 }} />
      
      <View style={styles.dashboardContainer}>
        <TouchableOpacity onPress={onOpenStatus} style={styles.statusButton} activeOpacity={0.7}>
          <Text style={{ fontSize: 24 }}>{status.icon}</Text>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.statusLabelTitle}>{isZH ? "今日状态" : "STATUS"}</Text>
            <Text style={styles.statusLabelValue}>{isZH ? status.zh : status.en}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.progressContainer}>
           <View style={styles.progressTextRow}>
              <Text style={styles.progressLabel}>{isZH ? "完成进度" : "Progress"}</Text>
              <Text style={styles.progressValue}>{percent}%</Text>
           </View>
           <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
           </View>
        </View>
      </View>
    </View>
  );
});

// --- 主组件 Props ---
type Props = {
  planV3: PlanV3 | null;
  todaySession: PlanV3Session | null;
  selectedDate: string;
  progress: boolean[];
  toggleProgress: (index: number) => void;
  headerHeight?: number;
  onOpenPicker: () => void;
  onOpenDetail: (item: PlanV3SessionItem) => void;
  onGenerate: () => void;
  currentReadiness: number;
  onOpenStatus: () => void;
  dayCompletion: number;
  
  // [新增] 从父组件接收 i18n 能力
  isZH: boolean;
  tt: (v: any) => string;
};

export default function PlanView(props: Props) {
  // 1. 解构 Props
  const {
    planV3, todaySession, selectedDate, progress = [], toggleProgress,
    headerHeight = 0, onOpenPicker, onOpenDetail, onGenerate,
    currentReadiness, onOpenStatus, dayCompletion,
    isZH, tt // 使用传入的 helper
  } = props;

  const safePadding = (typeof headerHeight === 'number' && !isNaN(headerHeight)) ? headerHeight : 0;

    // 2. 数据处理
    // 3. 数据处理 (核心修复：正确分离中英文)
    const displayItems = useMemo(() => {
    if (!todaySession?.blocks) return [];
    
    const items: any[] = [];
    todaySession.blocks.forEach(b => {
      if (!b.items) return;
      b.items.forEach(it => {
        // [修复] 分别获取中英文名字
        // 如果后端没传 name_override，回退显示 action_id
        const nameZH = it.name_override?.zh || it.action_id;
        const nameEN = it.name_override?.en || it.action_id;
        
        // [修复] 分别构建中英文的“目标”描述 (Sets/Reps)
        let detailZH = "";
        let detailEN = "";
        
        if (it.sets) {
            detailZH += `${it.sets}组`;
            detailEN += `${it.sets} sets`;
        }
        
        if (it.reps) {
            detailZH += ` × ${it.reps}次`;
            detailEN += ` × ${it.reps} reps`;
        } else if (it.seconds) {
            detailZH += ` × ${it.seconds}秒`;
            detailEN += ` × ${it.seconds}s`;
        }
        
        // 追加备注 (Notes)
        if (it.notes?.zh) detailZH += ` | ${it.notes.zh}`;
        if (it.notes?.en) detailEN += ` | ${it.notes.en}`;

        // 构造符合 renderItem 预期的 I18N 对象
        items.push({
            label: { zh: nameZH, en: nameEN }, // ✅ 中英分离
            target: { zh: detailZH, en: detailEN }, // ✅ 中英分离
            raw: it
        });
      });
    });
    
    return items;
  }, [todaySession]);

  // 3. Render Item
  const renderItem = useCallback(({ item, index }: { item: any; index: number }) => {
    const done = !!progress[index];
    
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => toggleProgress(index)} style={{ padding: 8 }}>
          <View style={[styles.checkbox, done ? styles.checkboxChecked : styles.checkboxUnchecked]} />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.cardContent} onPress={() => onOpenDetail(item.raw)}>
          <Text style={styles.cardTitle}>{tt(item.label)}</Text>
          <Text style={styles.cardSubtitle}>{tt(item.target)}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity onPress={() => onOpenDetail(item.raw)} style={{ padding: 8 }}>
          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
        </TouchableOpacity>
      </View>
    );
  }, [progress, toggleProgress, onOpenDetail, tt]);

  // 4. Header 渲染
  const ListHeader = useCallback(() => (
    <PlanHeader 
      currentReadiness={currentReadiness}
      onOpenStatus={onOpenStatus}
      dayCompletion={dayCompletion}
      isZH={isZH}
      paddingTop={safePadding}
    />
  ), [currentReadiness, onOpenStatus, dayCompletion, isZH, safePadding]);

  // --- 空状态 ---
  if (!todaySession) {
    return (
      <View style={[styles.emptyContainer, { paddingTop: safePadding + 16 }]}>
         {planV3 ? (
           <>
             <Text style={styles.mutedText}>{isZH ? "今日暂无训练计划" : "No session planned today"}</Text>
             <TouchableOpacity onPress={onOpenPicker} style={styles.addButton}>
                <Ionicons name="add" size={32} color="#fff" />
                <Text style={styles.addButtonText}>{isZH ? "添加训练" : "Add Session"}</Text>
             </TouchableOpacity>
           </>
         ) : (
           <View style={{ alignItems: 'center' }}>
              <Text style={styles.mutedText}>{isZH ? "还没有生成训练计划" : "No active plan found"}</Text>
              <Button title={isZH ? "去生成" : "Generate Plan"} onPress={onGenerate} variant="secondary" />
           </View>
         )}
      </View>
    );
  }

  // --- 列表 ---
  return (
    <FlatList
      data={displayItems}
      renderItem={renderItem}
      keyExtractor={(item, i) => `${selectedDate}_${i}`}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={ListHeader}
      removeClippedSubviews={false}
    />
  );
}

const styles = StyleSheet.create({
  listContent: { paddingBottom: 80 },
  dashboardContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 20, gap: 12 },
  statusButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', padding: 8, paddingRight: 16, borderRadius: 20, minWidth: 110, borderWidth: 0.5, borderColor: '#E5E7EB' },
  statusLabelTitle: { fontSize: 9, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase' },
  statusLabelValue: { fontSize: 13, fontWeight: '600', color: '#111' },
  progressContainer: { flex: 1, justifyContent: 'center' },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontSize: 12, fontWeight: '600', color: '#374151' },
  progressValue: { fontSize: 12, fontWeight: '700', color: '#306E6F' },
  progressBarTrack: { height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#A5D23D', borderRadius: 4 },
  card: { marginHorizontal: 16, marginBottom: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20, borderWidth: 0.6, borderColor: "#E5E7EB", padding: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 1 },
  checkboxChecked: { borderColor: "#A5D23D", backgroundColor: "#A5D23D" },
  checkboxUnchecked: { borderColor: "#d1d5db", backgroundColor: "#FFFFFF" },
  cardContent: { flex: 1, paddingLeft: 8, paddingVertical: 8 },
  cardTitle: { fontWeight: "600", marginBottom: 4, color: tokens.color.text },
  cardSubtitle: { color: tokens.color.text },
  emptyContainer: { flex: 1, padding: 20, alignItems: "center", justifyContent: "center", paddingBottom: 100 },
  mutedText: { fontSize: 16, color: tokens.color.muted, marginBottom: 24 },
  addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#306E6F', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, elevation: 6, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  addButtonText: { color: "#fff", fontSize: 18, fontWeight: "600", marginLeft: 8 },
});