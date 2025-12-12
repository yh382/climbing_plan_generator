// app/(tabs)/journal.tsx
import React, { useEffect, useMemo, useState, useCallback, useLayoutEffect } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View, Pressable, StyleSheet, Dimensions } from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

// Store
import useLogsStore, { useSegmentsByDate } from "../../src/store/useLogsStore";
import { usePlanStore, toDateString } from "../../src/store/usePlanStore";
import { useSettings } from "src/contexts/SettingsContext";

// Components
import TopDateHeader from "../../components/TopDateHeader";
import CollapsibleCalendarOverlay from "../../components/CollapsibleCalendarOverlay";
import TopBar from "../../components/TopBar";
import DualActivityRing from "../../src/features/journal/DualActivityRing";
import DualMiniRings from "../../components/DualMiniRings";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Utils & Colors
import { colorForBoulder, colorForYDS } from "../../lib/gradeColors";

const V_GRADES = ["VB", "V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10"];

const YDS_GROUPS = {
  "Beginner": ["5.6","5.7","5.8","5.9"],
  "5.10": ["5.10a","5.10b","5.10c","5.10d"],
  "5.11": ["5.11a","5.11b","5.11c","5.11d"],
  "5.12": ["5.12a","5.12b","5.12c","5.12d"],
  "Elite": ["5.13a","5.13b","5.13c","5.13d","5.14a"],
};
type YdsGroupKey = keyof typeof YDS_GROUPS;

const YDS_TO_FRENCH: Record<string, string> = {
  "5.6":"5a","5.7":"5b","5.8":"5c","5.9":"6a",
  "5.10a":"6a+","5.10b":"6a+","5.10c":"6b","5.10d":"6b+",
  "5.11a":"6c","5.11b":"6c+","5.11c":"7a","5.11d":"7a+",
  "5.12a":"7b","5.12b":"7b+","5.12c":"7c","5.12d":"7c+",
  "5.13a":"7c+","5.13b":"8a","5.13c":"8a+","5.13d":"8b",
  "5.14a":"8b+","5.14b":"8c","5.14c":"8c+","5.14d":"9a",
};

const V_TO_FONT: Record<string, string> = {
  VB:"3", V0:"4", V1:"5", V2:"5+", V3:"6A", V4:"6B",
  V5:"6C", V6:"7A", V7:"7A+", V8:"7B", V9:"7C", V10:"7C+",
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function dateStr(d: Date) {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  return `${y}-${m}-${da}`;
}
function shiftDay(d: Date, delta: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + delta);
  return x;
}
const formatBarLabel = (d: Date, isZH: boolean) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const wCN = ["周日","周一","周二","周三","周四","周五","周六"][d.getDay()];
  const wEN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()];
  return isZH ? `${mm}/${dd} · ${wCN}` : `${wEN}, ${mm}/${dd}`;
};
function formatDateLabel(d: Date, lang: "zh" | "en") {
  const w = ["周日","周一","周二","周三","周四","周五","周六"];
  const base = dateStr(d);
  return lang === "zh" ? `${base}（${w[d.getDay()] }）` : base;
}

export default function Journal() {
  const { boulderScale, ropeScale, lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const router = useRouter();
  const navigation = useNavigation();
  
  const [mode, setMode] = useState<"boulder" | "yds">("boulder");
  const [action, setAction] = useState<"add" | "sub">("add");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [overlayMonthAnchor, setOverlayMonthAnchor] = useState<Date | null>(null);
  const [ydsGroup, setYdsGroup] = useState<YdsGroupKey>("5.10");

  // Store
  const { logs, upsertCount } = useLogsStore(); 
  const { percentForDate, monthMap, buildMonthMap } = usePlanStore();

  const todayKey = useMemo(() => dateStr(selectedDate), [selectedDate]);
  const logType = mode === "boulder" ? "boulder" : "yds";

  const todayTotal = useMemo(() => {
    return logs
      .filter(l => l.date === todayKey && l.type === logType)
      .reduce((acc, cur) => acc + cur.count, 0);
  }, [logs, todayKey, logType]);

  const daySegments = useSegmentsByDate(todayKey, logType);
  
  const dayParts = useMemo(() => {
    const total = daySegments.reduce((sum, seg) => sum + seg.count, 0);
    return { total, parts: daySegments };
  }, [daySegments]); 

  const ringParts = useMemo(() => {
    return dayParts.parts.map((p) => ({
      grade: p.grade,
      count: p.count,
      color: (mode === "boulder" ? colorForBoulder : colorForYDS)(p.grade),
    }));
  }, [dayParts.parts, mode]);

  // --- Plan 进度 (外环) ---
  const [trainingPct, setTrainingPct] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      percentForDate(selectedDate).then((p) => {
        if (active) setTrainingPct(p);
      });
      return () => { active = false; };
    }, [selectedDate, percentForDate]) 
  );

  const addOne = (grade: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    upsertCount({ date: todayKey, type: logType, grade, delta: 1 });
  };

  const subOne = (grade: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    upsertCount({ date: todayKey, type: logType, grade, delta: -1 });
  };

  const onCapsulePress = (g: string) => {
    if (action === "add") addOne(g);
    else subOne(g);
  };

  const insets = useSafeAreaInsets();
  // TopDateHeader 默认高度约 40-44，加上 padding 大概 50 左右
  // 这里我们给它一个固定容器高度，比如 54 (加上刘海)
  const headerContentHeight = 54; 
  const totalHeaderHeight = insets.top + headerContentHeight;
  // [修改] 渲染日历格子的小环 (与 Calendar 页面保持一致)
  const renderDayExtra = (d: Date) => {
    const k = toDateString(d);
    
    // 1. 外环 (Plan Completion)
    const outerPct = (monthMap[k] ?? 0) / 100;

    // 2. 内环 (Log Count)
    // 注意：这里直接用 logs 算，确保实时性
    const dayLogsCount = logs.filter(l => l.date === k).reduce((s, l) => s + l.count, 0);
    const climbGoal = 10; // 保持一致
    const innerVal = dayLogsCount / climbGoal;

    if (outerPct === 0 && dayLogsCount === 0) return null;

    return (
      <View style={{ 
        position: 'absolute',
        top: 40,       // 向上微调，不挡数字
        left: 0, 
        right: 0,
        alignItems: 'center', // 水平居中
        justifyContent: 'flex-start'
      }}>
        <DualMiniRings
          size={34}                  
          outerValue={outerPct}     
          innerValue={innerVal}     
          outerColor="#A5D23D"
          innerColor="#3B82F6"
          outerThickness={3}
          innerThickness={3}
          gap={2}
        />
      </View>
    );
  };

  // --- UI 组件 ---

  const ModeSwitch = () => (
    <View style={{ flexDirection: "row", marginTop: 12, marginBottom: 16, backgroundColor: "#F3F4F6", borderRadius: 12, padding: 4 }}>
      <TouchableOpacity onPress={() => setMode("boulder")} style={[styles.modeBtn, mode === "boulder" && styles.modeBtnActive]}>
        <Text style={[styles.modeText, mode === "boulder" && styles.modeTextActive]}>{tr("抱石", "Bouldering")}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setMode("yds")} style={[styles.modeBtn, mode === "yds" && styles.modeBtnActive]}>
        <Text style={[styles.modeText, mode === "yds" && styles.modeTextActive]}>{tr("绳索", "Rope")}</Text>
      </TouchableOpacity>
    </View>
  );

// [修改] ActionSwitch: 去掉 marginBottom，优化按钮尺寸逻辑
  const ActionSwitch = () => (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <TouchableOpacity
        onPress={() => setAction("add")}
        style={[
          styles.actionBtn, 
          action === "add" ? styles.actionBtnAdd : styles.actionBtnInactive
        ]}
      >
        <Ionicons name="add" size={16} color={action === "add" ? "#fff" : "#6B7280"} />
        <Text style={[styles.actionText, action === "add" && {color:"#fff"}]}>
          {tr("添加", "Add")}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setAction("sub")}
        style={[
          styles.actionBtn, 
          action === "sub" ? styles.actionBtnSub : styles.actionBtnInactive
        ]}
      >
        <Ionicons name="remove" size={16} color={action === "sub" ? "#fff" : "#6B7280"} />
        <Text style={[styles.actionText, action === "sub" && {color:"#fff"}]}>
          {tr("删除", "Delete")}
        </Text>
      </TouchableOpacity>
    </View>
  );
  // 解决 Issue 4: 6列布局 + 居中
  const GradePicker = () => {
    const labelOf = (g: string) => {
        if (mode === "boulder") return (boulderScale === "Font" ? (V_TO_FONT[g] || g) : g);
        return (ropeScale === "French" ? (YDS_TO_FRENCH[g] || g) : g);
    };

    if (mode === "boulder") {
      return (
        <View style={styles.gridContainer}>
          {V_GRADES.map((g) => (
            <TouchableOpacity key={g} onPress={() => onCapsulePress(g)} style={styles.gridItem}>
              <Text style={styles.gridText}>{labelOf(g)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    } else {
      // Rope 保持分组逻辑
      return (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
            {(Object.keys(YDS_GROUPS) as YdsGroupKey[]).map(group => {
                const isActive = ydsGroup === group;
                return (
                    <TouchableOpacity key={group} onPress={() => setYdsGroup(group)} style={[styles.groupTab, isActive && styles.groupTabActive]}>
                        <Text style={[styles.groupText, isActive && {color: "#fff"}]}>{group}</Text>
                    </TouchableOpacity>
                )
            })}
          </ScrollView>
          <View style={styles.gridContainer}>
            {YDS_GROUPS[ydsGroup].map((g) => (
              <TouchableOpacity key={g} onPress={() => onCapsulePress(g)} style={styles.gridItem}>
                <Text style={styles.gridText}>{labelOf(g)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }
  };

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, // [核心修改] 关掉系统 Header，防止双重显示
    });
  }, [selectedDate, lang, setCalendarOpen, navigation]);

  // 计算 Header 高度
  const headerHeight = insets.top + 48; 

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      
      {/* 1. 固定在顶部的 Header (使用 TopBar 而不是 TopDateHeader) */}
      <View style={{ 
        position: 'absolute', 
        top: 0, left: 0, right: 0, 
        zIndex: 100, 
        backgroundColor: "#FFFFFF",
        borderBottomWidth: 0.5,
        borderBottomColor: '#E5E7EB',
      }}>
        {/* ✅ 使用 TopBar，这样才有 "Journal" 标题 */}
        <TopBar
          routeName="journal"
          titleZH="训练日志"
          titleEN="Journal"
          rightControls={{
            mode: "date",
            dateLabel: formatBarLabel(selectedDate, lang === "zh"),
            onPrevDate: () => setSelectedDate(d => shiftDay(d, -1)),
            onNextDate: () => setSelectedDate(d => shiftDay(d, +1)),
            onOpenPicker: () => setCalendarOpen((v) => !v),
            maxWidthRatio: 0.60,
          }}
        />
      </View>

      {/* 2. 日历遮罩层 (紧贴 TopBar) */}
      <CollapsibleCalendarOverlay
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        date={selectedDate}
        onSelect={(d) => { setSelectedDate(d); setCalendarOpen(false); }}
        lang={lang === "zh" ? "zh" : "en"}
        firstDay={1}
        topOffset={headerHeight} // ✅ 完美贴合
        renderDayExtra={renderDayExtra}
        onMonthChange={(d) => setOverlayMonthAnchor(d)}
      />

      {/* 3. 可滚动的内容区域 */}
      <ScrollView 
        contentContainerStyle={{ 
          paddingHorizontal: 16, 
          paddingBottom: 80,
          // ✅ 给顶部留出 Header 的空间
          paddingTop: headerHeight + 16 
        }}
      >
        {/* ... 下面的 DualActivityRing 等内容保持不变 ... */}
        <Pressable
            onPress={() => router.push({ pathname: "/journal-ring", params: { mode, date: dateStr(selectedDate) } })}
            style={styles.ringCard}
        >
            <DualActivityRing
                size={160}
                thickness={14}
                trainingPct={trainingPct}
                climbCount={todayTotal}
                parts={ringParts}
                climbGoal={10}
                outerColor="#A5D23D"
                innerColor="#3B82F6"
            />
        </Pressable>

        <ModeSwitch />

        {/* ... Quick Log 和 List ... */}
        <View style={styles.controlCard}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
                <Text style={styles.cardTitle}>{lang === "zh" ? "快速录入" : "Quick Log"}</Text>
                <ActionSwitch />
            </View>
            <GradePicker />
        </View>

        <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <Text style={styles.sectionTitle}>
                    {lang === "zh" ? "今日记录明细" : "Today's Details"}
                </Text>
                <Text style={{color: '#9CA3AF', fontSize: 12}}>{todayTotal} sends</Text>
            </View>

            {dayParts.parts.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {dayParts.parts.map((p) => {
                    const label = mode === "boulder" 
                        ? (boulderScale === "Font" ? (V_TO_FONT[p.grade] ?? p.grade) : p.grade)
                        : (ropeScale === "French" ? (YDS_TO_FRENCH[p.grade] ?? p.grade) : p.grade);
                    
                    return (
                        <View key={`item-${p.grade}`} style={styles.listItem}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: (mode==="boulder"?colorForBoulder:colorForYDS)(p.grade), marginRight: 6 }} />
                                <Text style={{ fontWeight: "600", fontSize: 13 }}>{label}</Text>
                            </View>
                            <Text style={{ color: "#6B7280", fontWeight: "500", fontSize: 13 }}>×{p.count}</Text>
                        </View>
                    );
                })}
              </View>
            ) : (
              <View style={{ padding: 20, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12 }}>
                 <Text style={{ color: "#9CA3AF" }}>{lang === "zh" ? "暂无记录" : "No climbs yet"}</Text>
              </View>
            )}
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  ringCard: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#fff', borderRadius: 24, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, borderWidth: 0.5, borderColor: '#F3F4F6' },
  controlCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, borderWidth: 0.5, borderColor: '#F3F4F6' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  
  // Mode Switch
  modeBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10, backgroundColor: "transparent" },
  modeBtnActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: {width:0, height:2}, elevation: 2 },
  modeText: { fontWeight: "600", color: "#9CA3AF" },
  modeTextActive: { color: "#111" },

  // Action Switch (Add/Delete)
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 12,minWidth: 80, },
  actionBtnAdd: { backgroundColor: "#16A34A" },
  actionBtnSub: { backgroundColor: "#EF4444" },
  actionBtnInactive: { backgroundColor: "#F3F4F6" },
  actionText: { marginLeft: 4, fontWeight: "700", color: "#6B7280", fontSize: 14 },

  // Grid (6 cols)
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
// 列表项 (Grid) -> 改为仿 Capsule 样式
  gridItem: { 
    // 1. 宽度依然保持 14.5% (适配 6 列)
    width: '14.5%', 
    
    // 2. 【核心改变】去掉 aspectRatio，改用 padding 撑开高度
    // aspectRatio: 1, // <--- 删除这行
    paddingVertical: 10, // <--- 加这行，上下留白相等，自然居中
    
    // 3. 保持居中对齐配置
    alignItems: 'center',
    justifyContent: 'center',
    
    // 4. 外观
    backgroundColor: "#F9FAFB", 
    borderWidth: 1, 
    borderColor: "#E5E7EB", 
    borderRadius: 12, // 圆角可以稍微小一点适应扁长形状，或者保持 12
  },
  
  gridText: { 
    fontWeight: "700", 
    color: "#111827", 
    fontSize: 13,
    
    // 仍然建议加上这个，消除 Android 字体自带的怪异边距
    includeFontPadding: false, 
    
    // 这里的 textAlign 此时其实不起决定性作用了，因为容器宽度是固定的
    textAlign: 'center',
  },
  // Group Tabs (Rope)
  groupTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#F3F4F6" },
  groupTabActive: { backgroundColor: "#111827" },
  groupText: { fontWeight: "600", color: "#6B7280", fontSize: 13,
    
    // [新增] 强制文字居中，防止某些字体偏移
    textAlign: 'center',
    includeFontPadding: false, // Android 修正
    lineHeight: 18, // 给一个固定行高 
  },
  // List Item (3 cols)
  listItem: {
    width: '31%', // 3列
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8, paddingHorizontal: 10,
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 0.5, borderColor: '#E5E7EB',
  },
});