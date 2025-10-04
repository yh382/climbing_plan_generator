import React from "react";
import { ScrollView, View, Text, StyleSheet, Pressable, TouchableOpacity } from "react-native";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { useFocusEffect } from 'expo-router';
// ✅ 片段1：imports（放到文件顶部）
import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import TopBar from "../../components/TopBar";


// ===== 日志类型与计算工具（模块级，组件外） =====
type ClimbEntry = {
  date: string;           // ISO 时间，如 "2025-09-21T10:00:00Z" 或 "2025-09-21"
  kind: string;           // "boulder" / "toprope" / "top-rope" / "top_rope" / ...
  grade?: string;         // 例如 "V5" / "VB" / "5.11a" / "6b+"
};

function inLast7Days(iso: string) {
  const d = new Date(iso);
  if (isNaN(+d)) return false;
  const now = new Date();
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - 6); // 含今天共7天
  return d >= start && d <= now;
}

function isBoulder(kind: string) {
  const k = (kind || "").toLowerCase();
  return k.includes("boulder");
}

function isTopRope(kind: string) {
  const k = (kind || "").toLowerCase();
  // 只统计「顶绳」，不含先攀；你若想把 "rope" 也并入，可追加 k.includes("rope")
  return k.includes("toprope") || k.includes("top-rope") || k.includes("top_rope") || k === "top";
}

// —— 等级数值化：V 系（VB=0，V0=1，V1=2 ...）——
function vValue(g?: string): number | null {
  if (!g) return null;
  const m = /^v(\d+|b)$/i.exec(g.trim());
  if (!m) return null;
  return m[1].toLowerCase() === "b" ? 0 : 1 + parseInt(m[1], 10);
}

// —— YDS（5.11a 等），粗略映射：整数×4 + a/b/c/d —— 
const LETTERS: Record<string, number> = { a: 0, b: 1, c: 2, d: 3 };
function ydsValue(g?: string): number | null {
  if (!g) return null;
  const m = /^5\.(\d{1,2})([abcd])?$/i.exec(g.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const l = m[2] ? LETTERS[m[2].toLowerCase()] : 0;
  return n * 4 + l;
}

// —— French 简表（常用段位），如果你的顶绳记录是法式等级 —— 
const FRENCH_ORDER: Record<string, number> = (() => {
  const seq = [
    "4","4+","5a","5a+","5b","5b+","5c","5c+",
    "6a","6a+","6b","6b+","6c","6c+",
    "7a","7a+","7b","7b+","7c","7c+",
    "8a","8a+","8b","8b+","8c","8c+","9a","9a+","9b","9b+"
  ];
  const m: Record<string, number> = {};
  seq.forEach((k, i) => (m[k] = i));
  return m;
})();
function frenchValue(g?: string): number | null {
  if (!g) return null;
  const k = g.trim().toLowerCase().replace(/\s+/g, "");
  return FRENCH_ORDER[k] ?? null;
}

function ropeValue(g?: string): number | null {
  return ydsValue(g) ?? frenchValue(g);
}

function maxBy<T>(arr: T[], get: (t: T) => number | null): T | null {
  let best: T | null = null;
  let bestVal = -Infinity;
  for (const it of arr) {
    const v = get(it);
    if (v != null && v > bestVal) {
      bestVal = v;
      best = it;
    }
  }
  return best;
}

function computeWeeklySummaries(entries: ClimbEntry[]) {
  const week = entries.filter((e) => inLast7Days(e.date));
  const boulders = week.filter((e) => isBoulder(e.kind));
  const topropes  = week.filter((e) => isTopRope(e.kind));

  const bestB = maxBy(boulders, (e) => vValue(e.grade));
  const bestT = maxBy(topropes, (e) => ropeValue(e.grade));

  return {
    boulder: { count: boulders.length, highest: bestB?.grade ?? "—" },
    toprope: { count: topropes.length,  highest: bestT?.grade ?? "—" },
  };
}



export default function Profile() {
  const scheme = useColorScheme();
  const bg = scheme === "dark" ? "#000000" : "#F2F2F7";
  const { tr } = useSettings();
  const [profile, setProfile] = useState<any>(null);
  const [plan, setPlan] = useState<any>(null);
  const [peek, setPeek] = useState<"basics" | "capacity" | "health" | "summary" | null>("summary");
  const [entries, setEntries] = useState<ClimbEntry[]>([]);
  const navigation = useNavigation();
    const router = useRouter();
    const isDark = scheme === "dark";
  const styles = StyleSheet.create({
    peekChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 0.6,
        borderColor: "#E5E7EB",
        backgroundColor: "#4271cdff",
        shadowColor: "#000",
        shadowOpacity: isDark ? 0.04 : 0.06,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: isDark ? 2 : 3,

    },
    peekCard: {
        marginTop: 8,
        marginHorizontal: 16,
        backgroundColor: "#fff",
        borderRadius: 20,
        borderWidth: 0.4,
        borderColor: "#E5E7EB",
        padding: 14,
        shadowColor: "#000",
        shadowOpacity: isDark ? 0.04 : 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: isDark ? 3 : 4,
    },
    peekTitle: { fontSize: 16, fontWeight: "700", marginBottom: 10 },
    peekRow: { flexDirection: "row", gap: 12 },
    peekCol: { flex: 1 },
    peekLabel: { fontSize: 12, color: "#6B7280" },
    peekValue: { fontSize: 14, fontWeight: "600" },
    peekMiniCard: {
        flex: 1,
        flexBasis: 0,                                      // 等宽
        padding: 12,
        borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: "#E5E7EB",
        backgroundColor: "#fff",                   // 或 "#fff" 与全站风格统一
        alignSelf: "stretch",                         // 等高（随较高的卡片拉伸）
        minHeight: 108,                               // 可选：给个下限更整齐
        shadowColor: "#000",
        shadowOpacity: isDark ? 0.04 : 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: isDark ? 3 : 4,
    },
    });


    useLayoutEffect(() => {
    navigation.setOptions({
        header: () => (
        <TopBar
            routeName="profile"
            titleZH="个人资料"
            titleEN="Profile"
            // 不需要日期/stepper，就不传 rightControls
            // 给右侧加“设置”按钮
            rightAccessory={
            <TouchableOpacity
                onPress={() => router.push("/(tabs)/settings")}
                hitSlop={12}
            >
                <Ionicons
                name="settings-outline"
                size={20}
                color={isDark ? "#F8FAFC" : "#111827"}
                />
            </TouchableOpacity>
            }
        />
        ),
    });
    }, [navigation, router, isDark]);

    useFocusEffect(
    React.useCallback(() => {
        let cancelled = false;
        (async () => {
        try {
            const kv = await AsyncStorage.multiGet(['@profile_form', '@plan_json']);
            const pf = kv.find(([k]) => k === '@profile_form')?.[1] ?? null;
            const pj = kv.find(([k]) => k === '@plan_json')?.[1] ?? null;
            if (!cancelled) {
            setProfile(pf ? JSON.parse(pf) : null);
            setPlan(pj ? JSON.parse(pj) : null);
            }
        } catch (e) {
            console.warn('Profile load failed:', e);
        }
        })();
        return () => { cancelled = true; };
    }, [])
    );

    useFocusEffect(
    React.useCallback(() => {
        let cancelled = false;
        (async () => {
        try {
            // 日志的存储 key 按你的实现改；这里假设 '@journal_entries'
            const raw = await AsyncStorage.getItem('@journal_entries');
            if (!cancelled) {
            setEntries(raw ? JSON.parse(raw) : []);
            }
        } catch (e) {
            console.warn('Load entries failed:', e);
        }
        })();
        return () => { cancelled = true; };
    }, [])
    );

  useEffect(() => {
    (async () => {
        const [pf, pj] = await Promise.all([
        AsyncStorage.getItem("@profile_form"),
        AsyncStorage.getItem("@plan_json"),
        ]);
        setProfile(pf ? JSON.parse(pf) : null);
        setPlan(pj ? JSON.parse(pj) : null);
    })();
    }, []);

  // TODO: 从你存储 index 表单结果的地方读取（Context / Zustand / AsyncStorage）
  // 例如：const { height, weight, boulderGrade, topRopeGrade, injuries, fingerForce, pullups } = useYourStore()

  return (

    <ScrollView style={{ flex: 1, backgroundColor: "#FFFFFF" }} contentInsetAdjustmentBehavior="automatic">
                    {/* chip包含基础档案，能力指标，健康与恢复 */}
        <View style={{ paddingHorizontal: 16, paddingTop: 8, flexDirection: "row", gap: 8 }}>
        <Pressable
            onPress={() => setPeek(peek === "summary" ? null : "summary")}
            style={({ pressed }) => [
            styles.peekChip,
            { backgroundColor: peek === "summary" ? "#111827" : "#f3f4f6", opacity: pressed ? 0.85 : 1 },

            ]}
        >
            <Text style={{ fontSize: 13, fontWeight: "700", color: peek === "summary" ? "#fff" : "#111" }}>
            {tr("摘要", "Summary")}
            </Text>
        </Pressable>
        <Pressable
            onPress={() => setPeek(peek === "basics" ? null : "basics")}
            style={({ pressed }) => [
            styles.peekChip,
            { backgroundColor: peek === "basics" ? "#111827" : "#f3f4f6", opacity: pressed ? 0.85 : 1 },
            ]}
        >
            <Text style={{ fontSize: 13, fontWeight: "700", color: peek === "basics" ? "#fff" : "#111" }}>
            {tr("基础档案", "Basics")}
            </Text>
        </Pressable>

        <Pressable
            onPress={() => setPeek(peek === "capacity" ? null : "capacity")}
            style={({ pressed }) => [
            styles.peekChip,
            { backgroundColor: peek === "capacity" ? "#111827" : "#f3f4f6", opacity: pressed ? 0.85 : 1 },
            ]}
        >
            <Text style={{ fontSize: 13, fontWeight: "700", color: peek === "capacity" ? "#fff" : "#111" }}>
            {tr("能力指标", "Capacity")}
            </Text>
        </Pressable>

        <Pressable
            onPress={() => setPeek(peek === "health" ? null : "health")}
            style={({ pressed }) => [
                styles.peekChip,
                { backgroundColor: peek === "health" ? "#111827" : "#f3f4f6", opacity: pressed ? 0.85 : 1 },
            ]}
            >
            <Text style={{ fontSize: 13, fontWeight: "700", color: peek === "health" ? "#fff" : "#111" }}>
                {tr("健康与恢复", "Health")}
            </Text>
            </Pressable>

        </View>
                {/* 计划摘要 */}
        {peek === "summary" && (
        <View style={[styles.peekCard, { marginTop: 12 }]}>
        <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>{tr("计划摘要","Plan Summary")}</Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("开始日期","Start Date")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {plan?.meta?.start_date ?? "—"}
            </Text>
            </View>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("周期长度","Cycle Weeks")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {plan?.meta?.cycle_weeks ?? "—"}
            </Text>
            </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("每周频次","Freq / week")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {plan?.meta?.freq_per_week ?? "—"}
            </Text>
            </View>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("前 3 周进度","Progression (wk1-3)")}</Text>
            <View style={{ marginTop: 6, gap: 6 }}>
                {(plan?.progression?.slice?.(0,3) ?? []).map((p: number, idx: number) => (
                <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ width: 22, fontSize: 12, color: "#6B7280" }}>W{idx+1}</Text>
                    <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: "#EEF2FF", overflow: "hidden" }}>
                    <View style={{ width: `${Math.min(Math.max(p,0),100)}%`, height: "100%", backgroundColor: "#60A5FA" }} />
                    </View>
                    <Text style={{ width: 38, textAlign: "right", fontSize: 12, color: "#374151" }}>{Math.round(p)}%</Text>
                </View>
                ))}
                {!plan?.progression && <Text style={{ fontSize: 14, fontWeight: "600" }}>—</Text>}
            </View>
            </View>
        </View>
        </View>
        )}
            {/* 日志摘要 */}
        {peek === "summary" && (() => {
        const s = computeWeeklySummaries(entries);
        return (
            <View style={{ marginTop: 12, marginHorizontal: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "stretch" }}>
                {/* 左：抱石摘要 */}
                <View style={styles.peekMiniCard}>
                <Text style={styles.peekTitle}>{tr("抱石摘要", "Bouldering")}</Text>
                <View style={{ marginTop: 2 }}>
                    <Text style={styles.peekLabel}>{tr("近一周数量", "Sessions (7d)")}</Text>
                    <Text style={styles.peekValue}>{s.boulder.count}</Text>
                </View>
                <View style={{ marginTop: 6 }}>
                    <Text style={styles.peekLabel}>{tr("最高等级", "Highest grade")}</Text>
                    <Text style={styles.peekValue}>{s.boulder.highest}</Text>
                </View>
                </View>

                {/* 固定间距，避免 gap 取整误差 */}
                <View style={{ width: 16 }} />

                {/* 右：顶绳摘要 */}
                <View style={styles.peekMiniCard}>
                <Text style={styles.peekTitle}>{tr("顶绳摘要", "Top-rope")}</Text>
                <View style={{ marginTop: 2 }}>
                    <Text style={styles.peekLabel}>{tr("近一周数量", "Sessions (7d)")}</Text>
                    <Text style={styles.peekValue}>{s.toprope.count}</Text>
                </View>
                <View style={{ marginTop: 6 }}>
                    <Text style={styles.peekLabel}>{tr("最高等级", "Highest grade")}</Text>
                    <Text style={styles.peekValue}>{s.toprope.highest}</Text>
                </View>
                </View>
            </View>
            </View>
        );
        })()}





        {/* 攀岩水平与偏好 */}
        {peek === "summary" && (
        <View style={[styles.peekCard, { marginTop: 12 }]}>
        <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>{tr("攀岩水平与偏好","Climbing Level & Preferences")}</Text>

        {/* 抱石 / 顶绳 等级 */}
        <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("抱石等级","Boulder Grade")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {/* TODO: 用你的等级映射工具替换 displayBoulder */}
                {profile?.boulder_level ? /* displayBoulder(profile.boulder_level) */ profile.boulder_level : "—"}
            </Text>
            </View>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("顶绳等级","Top-rope Grade")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {/* TODO: 用你的等级映射工具替换 displayRope */}
                {profile?.yds_level ? /* displayRope(profile.yds_level) */ profile.yds_level : "—"}
            </Text>
            </View>
        </View>

        {/* 室内/户外比例 */}
        <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("室内/户外比例","Indoor/Outdoor Ratio")}</Text>
            {(() => {
            const v = profile?.indoor_outdoor_ratio;
            const p = typeof v === "number" ? (v <= 1 ? Math.round(v * 100) : Math.round(v)) : null;
            if (p == null) return <Text style={{ fontSize: 14, fontWeight: "600" }}>—</Text>;
            return (
                <View style={{ marginTop: 6 }}>
                <View style={{ height: 8, borderRadius: 999, backgroundColor: "#EEF2FF", overflow: "hidden" }}>
                    <View style={{ width: `${Math.min(Math.max(p,0),100)}%`, height: "100%", backgroundColor: "#93C5FD" }} />
                </View>
                <Text style={{ marginTop: 4, fontSize: 12, color: "#374151" }}>
                    {tr("室内","Indoor")} {p}% · {tr("户外","Outdoor")} {100 - p}%
                </Text>
                </View>
            );
            })()}
        </View>

        {/* 频次 / 休息日 */}
        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("每周攀爬 / 训练","Climb / Train per week")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {(profile?.climb_freq ?? "—")} / {(profile?.train_freq ?? "—")}
            </Text>
            </View>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("休息天数","Rest Days")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {profile?.rest_days ?? "—"}
            </Text>
            </View>
        </View>

        {/* 休息日分布 */}
        <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>{tr("休息日分布","Rest Weekdays")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map((d, i) => {
                const zh = ["一","二","三","四","五","六","日"][i];
                const inRest = Array.isArray(profile?.rest_weekdays) && profile.rest_weekdays.includes(i); // 0=Mon
                return (
                <View key={d}
                    style={{
                    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
                    backgroundColor: inRest ? "#111827" : "#F3F4F6",
                    }}
                >
                    <Text style={{ fontSize: 11, color: inRest ? "#fff" : "#374151" }}>
                    {tr(`周${zh}`, d)}
                    </Text>
                </View>
                );
            })}
            </View>
        </View>

        {/* 历史最好完成（可选） */}
        {(profile?.hardest_send?.grade || profile?.hardest_send?.type) && (
            <View style={{ marginTop: 10 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("历史最好完成","Hardest Send")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {profile?.hardest_send?.type ?? ""} {profile?.hardest_send?.grade ?? ""} {profile?.hardest_send?.style ? `· ${profile.hardest_send.style}` : ""}
            </Text>
            </View>
        )}
        </View>
        )}

        {peek === "basics" && (
        <View style={styles.peekCard}>
            <Text style={styles.peekTitle}>{tr("基础档案", "Basics")}</Text>
            <View style={styles.peekRow}>
            <View style={styles.peekCol}>
                <Text style={styles.peekLabel}>{tr("身高", "Height")}</Text>
                <Text style={styles.peekValue}>
                {profile?.height ?? "—"}{profile?.height ? " cm" : ""}
                </Text>
            </View>
            <View style={styles.peekCol}>
                <Text style={styles.peekLabel}>{tr("体重", "Weight")}</Text>
                <Text style={styles.peekValue}>
                {profile?.weight ?? "—"}{profile?.weight ? " kg" : ""}
                </Text>
            </View>
            </View>
            <View style={[styles.peekRow, { marginTop: 10 }]}>
            <View style={styles.peekCol}>
                <Text style={styles.peekLabel}>{tr("性别", "Gender")}</Text>
                <Text style={styles.peekValue}>{profile?.gender ?? "—"}</Text>
            </View>
            <View style={styles.peekCol}>
                <Text style={styles.peekLabel}>{tr("体脂率", "Body fat")}</Text>
                <Text style={styles.peekValue}>
                {profile?.bodyfat ?? "—"}{profile?.bodyfat ? "%" : ""}
                </Text>
            </View>
            </View>
        </View>
        )}


        {/* 能力指标 */}
        {peek === "capacity" && (
            <View style={[styles.peekCard, { marginTop: 12 }]}>
                <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>{tr("能力指标","Capacity")}</Text>

        <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("握力","Grip")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {/* TODO: 替换为你的单位换算显示 */}
                {profile?.grip_kg ?? "—"}{profile?.grip_kg ? " kg" : ""}
            </Text>
            </View>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("平板支撑","Plank")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {profile?.plank_sec ?? "—"}{profile?.plank_sec ? " s" : ""}
            </Text>
            </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("单臂悬挂","1-arm Hang")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {profile?.one_arm_hang ?? "—"}{profile?.one_arm_hang ? " s" : ""}
            </Text>
            </View>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("引体向上（单组极限）","Pull-ups (max reps)")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {profile?.bw_rep_max ?? "—"}
            </Text>
            </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("负重引体 1RM","Weighted PU 1RM")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {/* TODO: 替换为你的单位换算显示 */}
                {profile?.weighted_pullup_1rm_kg ?? "—"}{profile?.weighted_pullup_1rm_kg ? " kg" : ""}
            </Text>
            </View>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("挂板训练","Hangboard")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {(profile?.hb_protocol ?? "—")}{profile?.hb_total_reps ? ` · ${profile.hb_total_reps}${tr("次"," reps")}` : ""}
            </Text>
            </View>
        </View>
        </View>
        )}

        {/* 健康与恢复 */}
        {peek === "health" && (
        <View style={[styles.peekCard, { marginTop: 12 }]}>
        <Text style={{ fontSize: 16, fontWeight: "700", marginBottom: 10 }}>{tr("健康与恢复","Health & Recovery")}</Text>

        {/* 疼痛摘要（仅显示 >0 的部位） */}
        <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 6 }}>{tr("疼痛部位（0-3）","Pain (0-3)")}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {[
                { k: "pain_finger_0_3", zh: "手指", en: "Finger" },
                { k: "pain_shoulder_0_3", zh: "肩", en: "Shoulder" },
                { k: "pain_elbow_0_3", zh: "肘", en: "Elbow" },
                { k: "pain_wrist_0_3", zh: "腕", en: "Wrist" },
            ].map(({ k, zh, en }) => {
                const val = profile?.[k];
                if (!val || val <= 0) return null;
                return (
                <View key={k} style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, backgroundColor: "#FEF3C7" }}>
                    <Text style={{ fontSize: 12, color: "#92400E" }}>
                    {tr(zh, en)} · {val}
                    </Text>
                </View>
                );
            })}
            {/* 若都没有疼痛，显示占位 */}
            {(!profile || [profile?.pain_finger_0_3, profile?.pain_shoulder_0_3, profile?.pain_elbow_0_3, profile?.pain_wrist_0_3].every((v)=>!v || v<=0)) && (
                <Text style={{ fontSize: 14, fontWeight: "600" }}>—</Text>
            )}
            </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("拉伸频率","Stretching Freq")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {profile?.stretching_freq_band ?? "—"}
            </Text>
            </View>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("平均睡眠（小时）","Avg Sleep (h)")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {profile?.sleep_hours_avg ?? "—"}
            </Text>
            </View>
        </View>

        <View style={{ flexDirection: "row", gap: 12, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("坐姿体前屈","Sit & Reach (cm)")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {profile?.sit_and_reach_cm ?? "—"}{profile?.sit_and_reach_cm ? " cm" : ""}
            </Text>
            </View>
            <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: "#6B7280" }}>{tr("髋灵活度（0-5）","Hip Mobility (0-5)")}</Text>
            <Text style={{ fontSize: 14, fontWeight: "600" }}>
                {profile?.hip_mobility_score ?? "—"}
            </Text>
            </View>
        </View>
        </View>
        )}

    </ScrollView>
  );
}
