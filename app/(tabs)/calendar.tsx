// app/(tabs)/calendar.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useLayoutEffect } from "react";

// Components
import CollapsibleCalendarOverlay from "../../components/CollapsibleCalendarOverlay";
import TopBar from "../../components/TopBar";
import SessionPicker from "../../src/features/calendar/SessionPicker";
import ActionDetailModal from "../../src/features/calendar/ActionDetailModal";
import DualMiniRings from "../../components/DualMiniRings";
import SegmentedControl from "../../components/ui/SegmentedControl";
import { Button } from "../../components/ui/Button"; 
import { tokens } from "../../components/ui/Theme";

// Features
import PlanView from "../../src/features/session/PlanView";
import LogView from "../../src/features/session/LogView";

// Stores & Utils
import useLogsStore from "../../src/store/useLogsStore";
import { usePlanStore, toDateString } from "../../src/store/usePlanStore";
import { useI18N } from "../../lib/i18n";
import { PlanV3, PlanV3Session, PlanV3SessionItem } from "../../src/types/plan";

const READINESS_KEY = "@daily_readiness";
const weekdayCN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const weekdayEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function parseISO(s?: string) {
  if (!s) return null;
  const [y, m, dd] = s.split("-");
  const d = new Date(Number(y), Number(m) - 1, Number(dd));
  return isNaN(d.getTime()) ? null : d;
}

// 状态选项
const READINESS_OPTS = [
  { val: 1, icon: "😫", label: "Tired" },
  { val: 2, icon: "😮‍💨", label: "Low" },
  { val: 3, icon: "🙂", label: "Ok" },
  { val: 4, icon: "💪", label: "Strong" },
  { val: 5, icon: "🔥", label: "Peak" },
];

// 奖章弹窗组件
const AwardModal = ({ visible, onClose, isZH }: { visible: boolean; onClose: () => void; isZH: boolean }) => (
  <Modal visible={visible} transparent animationType="fade">
    <View style={styles.modalOverlay}>
      <View style={styles.awardCard}>
        <View style={styles.awardIconBg}>
           <Ionicons name="medal" size={48} color="#F59E0B" />
        </View>
        <Text style={styles.awardTitle}>{isZH ? "周期目标达成！" : "Cycle Completed!"}</Text>
        <Text style={styles.awardSub}>
          {isZH ? "你已完成本周期的所有训练计划，太棒了！" : "You've crushed all sessions in this cycle!"}
        </Text>
        <Button 
           title={isZH ? "继续保持" : "Keep going"} 
           onPress={onClose} 
           style={{ width: '100%', marginTop: 20, backgroundColor: '#10B981' }} 
        />
      </View>
    </View>
  </Modal>
);

export default function CalendarTab() {
  const { tt, tr, isZH } = useI18N();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const headerHeight = insets.top + 48 + 52; 

  const [viewMode, setViewMode] = useState(0); 
  const [logMode, setLogMode] = useState<"boulder" | "yds">("boulder");

  const [planV3, setPlanV3] = useState<PlanV3 | null>(null);
  const [todaySession, setTodaySession] = useState<PlanV3Session | null>(null);
  const [selected, setSelected] = useState<string>(() => toDateString(new Date()));
  const [progress, setProgress] = useState<boolean[]>([]);
  
  const [pickerVisible, setPickerVisible] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PlanV3SessionItem | null>(null);
  const [readinessMap, setReadinessMap] = useState<Record<string, number>>({});
  const [overlayMonthAnchor, setOverlayMonthAnchor] = useState<Date | null>(null);
  const [statusPopupVisible, setStatusPopupVisible] = useState(false);
  
  const [awardVisible, setAwardVisible] = useState(false);

  const { monthMap, buildMonthMap, syncProgress, readProgress } = usePlanStore();
  const { logs } = useLogsStore();

  useLayoutEffect(() => { navigation.setOptions({ headerShown: false }); }, [navigation]);

  const loadPlan = useCallback(async () => {
      try {
        const rawV3 = await AsyncStorage.getItem("@current_plan_v3");
        setPlanV3(rawV3 ? JSON.parse(rawV3) : null);
        const dailyKey = `@daily_plan_${selected}`;
        const rawDaily = await AsyncStorage.getItem(dailyKey);
        setTodaySession(rawDaily ? JSON.parse(rawDaily) : null);
      } catch {
        setPlanV3(null);
        setTodaySession(null);
      }
  }, [selected]);

  const loadReadinessMap = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(READINESS_KEY);
      setReadinessMap(raw ? JSON.parse(raw) : {});
    } catch {
      setReadinessMap({});
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlan();
      loadReadinessMap();
    }, [loadPlan, loadReadinessMap])
  );

  const currentReadiness = readinessMap[selected] ?? 3;
  const selectedDateObj = parseISO(selected) ?? new Date();
  
  const mm = pad(selectedDateObj.getMonth() + 1);
  const dd = pad(selectedDateObj.getDate());
  const weekdayShort = (isZH ? weekdayCN : weekdayEN)[selectedDateObj.getDay()];
  const barDateLabel = isZH ? `${mm}/${dd} · ${weekdayShort}` : `${weekdayShort}, ${mm}/${dd}`;

  const displayItems = useMemo(() => {
    if (!todaySession) return [];
    return todaySession.blocks.flatMap(b => b.items);
  }, [todaySession]);

  const totalCount = displayItems.length;
  const doneCount = useMemo(() => {
    if (!totalCount) return 0;
    return progress.slice(0, totalCount).filter(Boolean).length;
  }, [totalCount, progress]);
  const dayCompletion = totalCount > 0 ? doneCount / totalCount : 0; 

  const shiftDay = (delta: number) => {
    const cur = parseISO(selected) ?? new Date();
    const next = new Date(cur);
    next.setDate(cur.getDate() + delta);
    setSelected(toDateString(next));
  };

  const saveReadiness = (val: number) => {
    const next = { ...readinessMap, [selected]: val };
    setReadinessMap(next);
    AsyncStorage.setItem(READINESS_KEY, JSON.stringify(next));
    setStatusPopupVisible(false);
  };

  const loadProgressForDate = useCallback(async (dateStr: string, count: number) => {
    const d = parseISO(dateStr) ?? new Date();
    const arr = await readProgress(d, count);
    setProgress(arr);
  }, [readProgress]);

  const toggleProgress = useCallback((idx: number) => {
      setProgress((prev) => {
        const next = [...prev];
        next[idx] = !next[idx];
        const nextDoneCount = next.filter(Boolean).length;
        const currentTotal = next.length;
        const d = parseISO(selected) ?? new Date();
        syncProgress(d, currentTotal, nextDoneCount, next);
        return next;
      });
    }, [selected, syncProgress]
  );

  useEffect(() => {
    const count = displayItems.length;
    if (count > 0) loadProgressForDate(selected, count);
    else setProgress([]);
  }, [selected, displayItems, loadProgressForDate]);

  useEffect(() => {
    if (!calendarOpen) return;
    const anchor = overlayMonthAnchor ?? selectedDateObj;
    buildMonthMap(anchor);
  }, [calendarOpen, overlayMonthAnchor, selected, buildMonthMap]);

  const renderDayExtra = (d: Date) => {
    const k = toDateString(d);
    const outerPct = (monthMap[k] ?? 0) / 100;
    const dayLogsCount = logs.filter(l => l.date === k).reduce((s, l) => s + l.count, 0);
    const innerVal = dayLogsCount / 10;
    if (outerPct === 0 && dayLogsCount === 0) return null;
    return (
      <View style={{ position: 'absolute', top: -4, left: 0, right: 0, alignItems: 'center' }}>
        <DualMiniRings size={20} outerValue={outerPct} innerValue={innerVal} outerColor="#A5D23D" innerColor="#3B82F6" outerThickness={2} innerThickness={2} gap={1} />
      </View>
    );
  };

  // [修改] 核心逻辑：领取并扣减库存 + 完赛判定
  const handleClaimSession = async (session: PlanV3Session) => {
    if (!planV3) return;

    try {
      // 1. 保存到今日计划
      const dailyKey = `@daily_plan_${selected}`;
      await AsyncStorage.setItem(dailyKey, JSON.stringify(session));
      setTodaySession(session);

      // 2. 更新 Plan 库 (从 Bank 中移除该 Session)
      const newPlan = { ...planV3 };
      
      // 判断类型并扣减配额和列表
      if (session.type === 'climb') {
          newPlan.quotas.climb = Math.max(0, newPlan.quotas.climb - 1);
          newPlan.session_bank.climb_sessions = newPlan.session_bank.climb_sessions.filter(s => s.id !== session.id);
      } else {
          newPlan.quotas.train = Math.max(0, newPlan.quotas.train - 1);
          newPlan.session_bank.train_sessions = newPlan.session_bank.train_sessions.filter(s => s.id !== session.id);
      }

      // 3. 写回存储
      await AsyncStorage.setItem("@current_plan_v3", JSON.stringify(newPlan));
      setPlanV3(newPlan); 

      // 4. 关闭选择器
      setPickerVisible(false);

      // 5. [新增] 检查是否全部完成 (Bank 空了)
      const remainingClimb = newPlan.session_bank.climb_sessions.length;
      const remainingTrain = newPlan.session_bank.train_sessions.length;

      if (remainingClimb === 0 && remainingTrain === 0) {
          // 延迟一点弹出，让用户先看到选择器关闭的动画
          setTimeout(() => setAwardVisible(true), 500); 
      }

    } catch (e) { console.error("Claim failed", e); }
  };

  const bottomPanelOffset = headerHeight + 60; // Just for popup positioning reference if needed

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      {/* 1. Header */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100, backgroundColor: "#FFFFFF", borderBottomWidth: 0.5, borderBottomColor: '#E5E7EB' }}>
        <TopBar 
          routeName="calendar" titleZH="训练会话" titleEN="Session" 
          rightControls={{ mode: "date", dateLabel: barDateLabel, onPrevDate: () => shiftDay(-1), onNextDate: () => shiftDay(1), onOpenPicker: () => setCalendarOpen((v) => !v), maxWidthRatio: 0.60 }} 
        />
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <SegmentedControl
            values={[isZH ? "计划" : "Plan", isZH ? "记录" : "Log"]}
            selectedIndex={viewMode}
            onChange={setViewMode}
          />
        </View>
      </View>

      {/* 2. Calendar Overlay */}
      <CollapsibleCalendarOverlay
        visible={calendarOpen} onClose={() => setCalendarOpen(false)} date={selectedDateObj}
        onSelect={(d) => { setSelected(toDateString(d)); setCalendarOpen(false); }}
        lang={isZH ? "zh" : "en"} firstDay={1} topOffset={headerHeight} renderDayExtra={renderDayExtra}
        onMonthChange={(d) => setOverlayMonthAnchor(d)}
      />

      {/* 3. Main Content */}
      <View style={{ flex: 1 }}>
         {viewMode === 0 ? (
           <PlanView
             planV3={planV3}
             todaySession={todaySession}
             selectedDate={selected}
             progress={progress}
             toggleProgress={toggleProgress}
             headerHeight={headerHeight}
             onOpenPicker={() => setPickerVisible(true)}
             onOpenDetail={(item) => { setSelectedItem(item); setDetailModalVisible(true); }}
             onGenerate={() => navigation.navigate("index" as never)}
             
             currentReadiness={currentReadiness}
             onOpenStatus={() => setStatusPopupVisible(true)}
             dayCompletion={dayCompletion}
             
             isZH={isZH}
             tt={tt}
           />
         ) : (
           <LogView 
             selectedDate={selectedDateObj}
             headerHeight={headerHeight}
             mode={logMode}
             setMode={setLogMode}
           />
         )}
      </View>

      {/* 4. Status Popup */}
      {statusPopupVisible && viewMode === 0 && (
        <>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setStatusPopupVisible(false)} />
          {/* 这里我们简单地把它定位在屏幕上方偏下的位置，或者你可以根据 layout 计算 */}
          <View style={[styles.statusPopupContent, { top: headerHeight + 60 }]}>
            {READINESS_OPTS.map((opt) => (
              <TouchableOpacity key={opt.val} onPress={() => saveReadiness(opt.val)} style={{ padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 28 }}>{opt.icon}</Text>
                <Text style={{ fontSize: 10, color: currentReadiness === opt.val ? '#111' : '#9CA3AF', fontWeight: '600' }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Modals */}
      <SessionPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} planV3={planV3} onSelect={handleClaimSession} isZH={isZH} />
      <ActionDetailModal visible={detailModalVisible} onClose={() => setDetailModalVisible(false)} item={selectedItem} isZH={isZH} />
      
      {/* 奖章弹窗 */}
      <AwardModal visible={awardVisible} onClose={() => setAwardVisible(false)} isZH={isZH} />
    </View>
  );
}

const styles = StyleSheet.create({
  statusPopupContent: { position: 'absolute', left: 24, backgroundColor: '#fff', borderRadius: 16, padding: 8, flexDirection: 'row', gap: 4, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 20, borderWidth: 0.5, borderColor: '#E5E7EB', zIndex: 200 },
  
  // Award Modal Styles
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: 'center', justifyContent: 'center' },
  awardCard: { backgroundColor: '#fff', width: 280, padding: 24, borderRadius: 24, alignItems: 'center', shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10, elevation: 10 },
  awardIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#FFFBEB', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  awardTitle: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 8 },
  awardSub: { fontSize: 14, color: '#6B7280', textAlign: 'center' }
});