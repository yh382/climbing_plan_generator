// src/features/session/LogView.tsx
import React, { useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";

// Stores & Utils
import useLogsStore, { useSegmentsByDate } from "../../store/useLogsStore";
import { usePlanStore, toDateString } from "../../store/usePlanStore";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { colorForBoulder, colorForYDS } from "../../../lib/gradeColors";

// Components
import DualActivityRing from "../journal/DualActivityRing";

// Constants
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

type Props = {
  selectedDate: Date;
  headerHeight: number;
  // [关键] 从父组件接收 mode 和 setMode
  mode: "boulder" | "yds";
  setMode: (m: "boulder" | "yds") => void;
};

// [关键] 在函数参数里解构 mode, setMode
export default function LogView({ selectedDate, headerHeight, mode, setMode }: Props) {
  const { boulderScale, ropeScale, lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const router = useRouter();

  // 本地 UI 状态
  const [action, setAction] = useState<"add" | "sub">("add");
  const [ydsGroup, setYdsGroup] = useState<YdsGroupKey>("5.10");

  // Stores
  const { logs, upsertCount } = useLogsStore(); 
  const { percentForDate } = usePlanStore();

  // Derived Data
  const todayKey = useMemo(() => toDateString(selectedDate), [selectedDate]);
  
  // 这里现在可以直接使用 props 里的 mode
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

  // Training Pct
  const [trainingPct, setTrainingPct] = useState(0);
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      percentForDate(selectedDate).then((p: number) => {
        if (active) setTrainingPct(p);
      });
      return () => { active = false; };
    }, [selectedDate, percentForDate]) 
  );

  // Actions
  const addOne = (grade: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    upsertCount({ date: todayKey, type: logType, grade, delta: 1 });
  };
  const subOne = (grade: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    upsertCount({ date: todayKey, type: logType, grade, delta: -1 });
  };
  const onCapsulePress = (g: string) => (action === "add" ? addOne(g) : subOne(g));

  // --- Sub Components ---
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

  const ActionSwitch = () => (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <TouchableOpacity onPress={() => setAction("add")} style={[styles.actionBtn, action === "add" ? styles.actionBtnAdd : styles.actionBtnInactive]}>
        <Ionicons name="add" size={16} color={action === "add" ? "#fff" : "#6B7280"} />
        <Text style={[styles.actionText, action === "add" && {color:"#fff"}]}>{tr("添加", "Add")}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setAction("sub")} style={[styles.actionBtn, action === "sub" ? styles.actionBtnSub : styles.actionBtnInactive]}>
        <Ionicons name="remove" size={16} color={action === "sub" ? "#fff" : "#6B7280"} />
        <Text style={[styles.actionText, action === "sub" && {color:"#fff"}]}>{tr("删除", "Delete")}</Text>
      </TouchableOpacity>
    </View>
  );

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

  return (
    <ScrollView 
      style={{ flex: 1 }} 
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: headerHeight + 10, paddingBottom: 90 }}
    >
      {/* 1. Dashboard */}
      <TouchableOpacity
          onPress={() => router.push({ pathname: "/journal-ring", params: { mode, date: todayKey } })}
          activeOpacity={0.9}
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
      </TouchableOpacity>

      <ModeSwitch />

      {/* 2. Quick Log */}
      <View style={styles.controlCard}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12}}>
              <Text style={styles.cardTitle}>{lang === "zh" ? "快速录入" : "Quick Log"}</Text>
              <ActionSwitch />
          </View>
          <GradePicker />
      </View>

      {/* 3. Today's Details */}
      <View style={{ marginTop: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <Text style={styles.sectionTitle}>{lang === "zh" ? "今日记录明细" : "Today's Details"}</Text>
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
  );
}

const styles = StyleSheet.create({
  ringCard: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#fff', borderRadius: 24, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, borderWidth: 0.5, borderColor: '#F3F4F6' },
  controlCard: { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2, borderWidth: 0.5, borderColor: '#F3F4F6' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#374151' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111827' },
  modeBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10, backgroundColor: "transparent" },
  modeBtnActive: { backgroundColor: "#FFFFFF", shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: {width:0, height:2}, elevation: 2 },
  modeText: { fontWeight: "600", color: "#9CA3AF" },
  modeTextActive: { color: "#111" },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, minWidth: 80 },
  actionBtnAdd: { backgroundColor: "#16A34A" },
  actionBtnSub: { backgroundColor: "#EF4444" },
  actionBtnInactive: { backgroundColor: "#F3F4F6" },
  actionText: { marginLeft: 4, fontWeight: "700", color: "#6B7280", fontSize: 13, includeFontPadding: false },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  gridItem: { 
    width: '14.5%', 
    paddingVertical: 10, 
    justifyContent: 'center', alignItems: 'center', 
    backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 12, padding: 0 
  },
  gridText: { fontWeight: "700", color: "#111827", fontSize: 13, includeFontPadding: false, textAlign: 'center', textAlignVertical: 'center' },
  groupTab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: "#F3F4F6" },
  groupTabActive: { backgroundColor: "#111827" },
  groupText: { fontWeight: "600", color: "#6B7280", fontSize: 13 },
  listItem: { width: '31%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 0.5, borderColor: '#E5E7EB' },
});