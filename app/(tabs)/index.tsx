// app/(tabs)/index.tsx
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  useColorScheme,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "@/contexts/SettingsContext";
import { I18N, useI18N } from "../../lib/i18n";
import { Button } from "../../components/ui/Button";
import { tokens } from "../../components/ui/Theme";
import { useLayoutEffect } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import TopBar from "../../components/TopBar";
import { Ionicons } from "@expo/vector-icons";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE as string;
const PLAN_JSON_URL = `${API_BASE}/plan_json`;
console.log("API_BASE =>", process.env.EXPO_PUBLIC_API_BASE);
const WD_ORDER: WeekdayKey[] = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const WD_CN: Record<WeekdayKey,string> = { Sun:"周日", Mon:"周一", Tue:"周二", Wed:"周三", Thu:"周四", Fri:"周五", Sat:"周六" };
const WD_EN: Record<WeekdayKey, string> = {
  Sun: "Sun", Mon: "Mon", Tue: "Tue", Wed: "Wed", Thu: "Thu", Fri: "Fri", Sat: "Sat",
};
const WEEK_KEYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as const;

// === Weakness options ===
const WEAKNESS_LABELS = {
  zh: {
    fingerStrength: "指力",
    power: "爆发力",
    endurance: "耐力",
    footwork: "脚法",
  },
  en: {
    fingerStrength: "Finger Strength",
    power: "Power",
    endurance: "Endurance",
    footwork: "Footwork",
  },
} as const;

// 把 "1-2次" 这种区间，按语言输出：中文=原样；英文=“1–2x”
const rangeLabel = (opt: RangeOpt, lang: "zh" | "en") => {
  if (lang === "zh") return opt;
  const [a, b] = opt.replace("次", "").split("-");
  return `${a}–${b}x`;
};
// ====== 4 步 ======
type Step = 1 | 2 | 3 | 4;

// ====== 表单类型 ======
type Gender = "男" | "女";
type RangeOpt = "1-2次" | "2-3次" | "3-4次" | "4-5次" | "5-6次" | "6-7次";
type RestDays = 1 | 2 | 3 | 4 | 5 | 6;
export type WeaknessKey = "fingerStrength" | "power" | "endurance" | "footwork";
type VScaleOpt =
  | "v1-v2" | "v2-v3" | "v3-v4" | "v4-v5" | "v5-v6"
  | "v6-v7" | "v7-v8" | "v8-v9" | "v9以上";
type WeekdayKey = "Sun"|"Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat";

type FormState = {
  // Step 1
  gender: Gender;
  height: number;     // cm
  weight: number;     // kg
  bodyfat: number;    // 5-45 %
  freq_per_week: number; // 每周训练天数（1-7）——兼容字段（由新字段派生）
  // 基础体能
  grip_kg: number | null;
  plank_sec: number | null;
  sit_and_reach_cm: number | null;
  hip_mobility_score: 0|1|2|3|4|5;

  // Step 2（保留）
  climb_freq: RangeOpt;         // ← 兼容：由新字段映射
  train_freq: RangeOpt;         // ← 兼容：由新字段映射
  rest_days: RestDays;          // ← 兼容：7 - (climb+gym)
  rest_weekdays: WeekdayKey[];  // ← 兼容：不再使用，保持空数组

  // Step 3（旧）
  bw_rep_max: number;
  weighted_pullup_1rm_kg: number;

  // Step 4（旧）
  one_arm_hang: number;
  weaknesses: WeaknessKey[];

  // Step 5（旧）
  boulder_level: VScaleOpt;
  yds_level: string;

  // Step 2: 攀岩专项（补充）
  hardest_send?: {
    type: 'boulder' | 'rope';
    grade: string;
    style: 'flash' | 'redpoint';
  } | null;
  indoor_outdoor_ratio?: number;

  // Step 3: 恢复与伤病
  pain_finger_0_3: 0|1|2|3;
  pain_shoulder_0_3: 0|1|2|3;
  pain_elbow_0_3: 0|1|2|3;
  pain_wrist_0_3: 0|1|2|3;
  stretching_freq_band: '0'|'1-2'|'3-4'|'5-7';

  // ===== 新增（Step 3：时间安排·新）=====
  climb_days_per_week: number;  // 1..7
  gym_days_per_week: number;    // 0..7
  cycle_weeks: number;          // 4..12
};

type PlanMeta = {
  cycle_weeks: number;
  freq_per_week: number;
  start_date?: string;
  progression?: number[];
  source?: "rule" | "ai" | string;
  refined?: boolean;
};

// ====== 计划结构 ======
type PlanItem = { label: I18N; target: I18N };
type PlanDay  = { title: I18N; items: PlanItem[] };
type Plan = {
  meta: PlanMeta;
  days: Record<"Sun"|"Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat", PlanDay>;
  weeks?: Array<{ week: number; days: Plan["days"] }>;
  notes?: I18N[];
};

// ====== 工具函数 ======
const FONT_RANGE_MAP: Record<VScaleOpt, string> = {
  "v1-v2": "5-5+",
  "v2-v3": "5+-6A",
  "v3-v4": "6A-6B",
  "v4-v5": "6B-6C",
  "v5-v6": "6C-7A",
  "v6-v7": "7A-7B",
  "v7-v8": "7A-7B",
  "v8-v9": "v8-v9",
  "v9以上": "7C以上",
};

const YDS_TO_FRENCH: Record<string, string> = {
  "5.6":"5a","5.7":"5b","5.8":"5c","5.9":"6a",
  "5.10a":"6a+","5.10b":"6a+","5.10c":"6b","5.10d":"6b+",
  "5.11a":"6c","5.11b":"6c+","5.11c":"7a","5.11d":"7a+",
  "5.12a":"7b","5.12b":"7b+","5.12c":"7c","5.12d":"7c+",
  "5.13a":"7c+","5.13b":"8a","5.13c":"8a+","5.13d":"8b",
  "5.14a":"8b+","5.14b":"8c","5.14c":"8c+","5.14d":"9a",
};

const midOfRange = (s: RangeOpt): number => {
  const num = s.replace("次", "");
  const [a, b] = num.split("-").map((x) => parseInt(x, 10));
  return Math.max(1, Math.min(7, Math.round((a + b) / 2)));
};

const vScaleToNumeric = (v: VScaleOpt): string => {
  if (v === "v9以上") return "9-10";
  return v.replace(/^v/i, "");
};

// —— 单位换算（显示/回写用）——
const cmToFtIn = (cm: number) => {
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.floor(totalIn / 12);
  const inch = totalIn - ft * 12;
  return { ft, inch };
};
const formatFtIn = (cm: number) => {
  const { ft, inch } = cmToFtIn(cm);
  return `${ft}'${inch}"`;
};
const kgToLb = (kg: number) => Math.round(kg * 2.20462);
const lbToKg = (lb: number) => Math.round(lb / 2.20462);

// === 兼容：把数值映射为旧的 RangeOpt 档位 ===
const numToRangeOpt = (n: number): RangeOpt => {
  if (n <= 2) return "1-2次";
  if (n === 3 || n === 4) return "3-4次";
  if (n === 5) return "5-6次";
  return "6-7次"; // 6 或 7
};

  // === Typewriter：一行行、一字字打字 ===
  function TypewriterLines({
    lines,
    charInterval = 18,
    linePause = 260,
    onDone,
    textStyle,
    lineStyle,
  }: {
    lines: string[];
    charInterval?: number;
    linePause?: number;
    onDone?: () => void;
    textStyle?: any;
    lineStyle?: any;
  }) {
    const [doneLines, setDoneLines] = useState<string[]>([]);
    const [current, setCurrent] = useState<string>("");
    const [idx, setIdx] = useState(0);

    useEffect(() => {
      setDoneLines([]);
      setCurrent("");
      setIdx(0);
    }, [JSON.stringify(lines)]);

    useEffect(() => {
      if (!lines || idx >= lines.length) {
        onDone?.();
        return;
      }
      const target = lines[idx] ?? "";

      let char = 0;
      const timer = setInterval(() => {
        char++;
        setCurrent(target.slice(0, char));
        if (char >= target.length) {
          clearInterval(timer);
          setTimeout(() => {
            setDoneLines((prev) => [...prev, target]);
            setCurrent("");
            setIdx((n) => n + 1);
          }, linePause);
        }
      }, Math.max(1, charInterval));

      return () => clearInterval(timer);
    }, [idx, lines, charInterval, linePause, onDone]);

    return (
      <View>
        {doneLines.map((ln, i) => (
          <Text key={`ln-${i}`} style={[{ color: "#374151", lineHeight: 20, marginBottom: 4 }, textStyle, lineStyle]}>
            {ln}
          </Text>
        ))}
        {idx < lines.length && (
          <Text style={[{ color: "#374151", lineHeight: 20, marginBottom: 4 }, textStyle, lineStyle]}>
            {current}
            <Text style={{ opacity: 0.5 }}>▋</Text>
          </Text>
        )}
      </View>
    );
  }


// === 将后端 PlanV2（meta + pools）拼成要“逐行打字”的纯文本行 ===
function buildPreviewLines({
  preview,
  form,
  tr,
  tt,
}: any): string[] {
  // -------- 类型/工具 --------
  type I18N = { zh: string; en: string };
  type PlanItem = { label: I18N; target: I18N };
  type ClimbBlock = { name: "offwall" | "onwall" | "main" | "stretch"; label: I18N; target: I18N };
  type GymWarmOrStretchBlock = { name: "warmup" | "stretch"; label: I18N; target: I18N };
  type GymMainItemsBlock = { name: "main_items"; items: PlanItem[] };
  type ClimbTemplate = { id: string; type: "climb_endurance" | "climb_power"; title: I18N; blocks: ClimbBlock[] };
  type GymTemplate = { id: string; type: "gym_upper_finger" | "gym_lower_core"; title: I18N; blocks: (GymWarmOrStretchBlock | GymMainItemsBlock)[] };
  type PlanV2 = {
    meta?: {
      cycle_weeks?: number;
      start_date?: string;
      weekly_quota?: { climb?: number; gym?: number; rest?: number };
      progression?: number[];
    };
    pools?: { climb?: ClimbTemplate[]; gym?: GymTemplate[] };
    notes?: I18N[];
    selection_rules?: I18N;
  };

  const lines: string[] = [];
  const isI18N = (x: any): x is I18N => x && typeof x === "object" && typeof x.zh === "string" && typeof x.en === "string";
  const T = (x: any): string => {
    try {
      if (!x) return "";
      if (typeof x === "string") return x;
      if (isI18N(x)) return tt ? tt(x) : (x.zh || x.en || "");
      return String(x?.zh ?? x?.en ?? "");
    } catch {
      return typeof x === "string" ? x : "";
    }
  };

  const p: PlanV2 = (preview || {}) as PlanV2;
  if (!p || typeof p !== "object") {
    return [tr("暂无预览，请点“生成计划”。", "No preview. Tap 'Generate plan'.")];
    }

  // -------- Meta 摘要 --------
  const cw = p.meta?.cycle_weeks ?? form?.cycle_weeks ?? "";
  const sd = p.meta?.start_date ?? "";
  const quota = p.meta?.weekly_quota || {};
  const prog = Array.isArray(p.meta?.progression) ? p.meta!.progression! : null;

  lines.push(`${tr("开始日期", "Start")}: ${sd || tr("未提供", "N/A")} · ${tr("周期", "Cycle")}: ${cw}${cw ? tr("周", " wks") : ""}`);

  if (prog && prog.length) {
    lines.push(
      `${tr("每周强度：", "Weekly load: ")}${prog
        .map((p: number, i: number) => `${tr("第", "W")}${i + 1}${tr("周", "")} ${Math.round((p ?? 1) * 100)}%`)
        .join(" / ")}`
    );
  }

  const climbTimes = quota.climb ?? form?.climb_days_per_week ?? 0;
  const gymTimes = quota.gym ?? form?.gym_days_per_week ?? 0;
  const restTimes = quota.rest ?? Math.max(0, 7 - (Number(climbTimes) + Number(gymTimes)));
  lines.push(
    tr(
      `每周配额：攀岩 ${climbTimes} 次，健身 ${gymTimes} 次，休息 ${restTimes} 天。`,
      `Weekly quota: Climb ${climbTimes}x, Gym ${gymTimes}x, Rest ${restTimes}d.`
    )
  );

  // -------- 输入摘要（可选） --------
  if (form) {
    const pains = [
      { zh: "手指", en: "Finger", v: form?.pain_finger_0_3 },
      { zh: "肩部", en: "Shoulder", v: form?.pain_shoulder_0_3 },
      { zh: "肘部", en: "Elbow", v: form?.pain_elbow_0_3 },
      { zh: "手腕", en: "Wrist", v: form?.pain_wrist_0_3 },
    ].filter((x) => (x.v ?? 0) > 0);
    const painStr = pains.length === 0
      ? tr("无", "None")
      : pains.map((p) => `${tr(p.zh, p.en)} ${p.v}`).join(tr("、", ", "));
    const stretchLabel = (() => {
      const b = form?.stretching_freq_band;
      if (!b) return tr("未填写", "Not provided");
      return b === "0" ? tr("每周 0 次", "0 /wk") : tr(`${b} 次/周`, `${b} /wk`);
    })();
    const sleepLabel = form?.sleep_hours_avg ? `${form.sleep_hours_avg} ${tr("小时", "h")}` : tr("未填写", "Not provided");

    lines.push(`— ${tr("本次生成依据（摘要）", "Inputs summary")} —`);
    lines.push(`• ${tr("疼痛分布（0–3）", "Pain (0–3)")}${tr("：", ": ")}${painStr}`);
    lines.push(`• ${tr("拉伸/理疗频率", "Stretching/Recovery")}${tr("：", ": ")}${stretchLabel}`);
  }

  // -------- 模板池：攀岩 --------
  const climbPool: ClimbTemplate[] = Array.isArray(p.pools?.climb) ? (p.pools!.climb as ClimbTemplate[]) : [];
  if (climbPool.length) {
    lines.push(tr("—— 攀岩日模板 ——", "— Climb templates —"));
    climbPool.forEach((tpl, idx) => {
      const title = T(tpl.title);
      const tag = tpl.type === "climb_power" ? tr("（爆发）", " (Power)") : tr("（耐力）", " (Endurance)");
      lines.push(`${idx + 1}. ${title}${tag}  #${tpl.id}`);
      // 必须是 4 段：offwall/onwall/main/stretch
      (tpl.blocks || []).forEach((b) => {
        if (!b) return;
        lines.push(`• ${T(b.label)}${tr(":", ":")} ${T(b.target)}`);
      });
    });
  }

  // -------- 模板池：健身 --------
  const gymPool: GymTemplate[] = Array.isArray(p.pools?.gym) ? (p.pools!.gym as GymTemplate[]) : [];
  if (gymPool.length) {
    lines.push(tr("—— 健身日模板 ——", "— Gym templates —"));
    gymPool.forEach((tpl, idx) => {
      const title = T(tpl.title);
      const tag = tpl.type === "gym_upper_finger" ? tr("（上肢+指力）", " (Upper+Fingers)") : tr("（下肢+核心）", " (Lower+Core)");
      lines.push(`${idx + 1}. ${title}${tag}  #${tpl.id}`);
      (tpl.blocks || []).forEach((b) => {
        if (!b) return;
        if (b.name === "main_items") {
          const items = (b as GymMainItemsBlock).items || [];
          items.forEach((it, k) => {
            lines.push(`   - ${T(it.label)}${tr(":", ":")} ${T(it.target)}`);
          });
        } else {
          const bb = b as GymWarmOrStretchBlock;
          lines.push(`• ${T(bb.label)}${tr(":", ":")} ${T(bb.target)}`);
        }
      });
    });
  }

  // -------- 规则 / 备注 --------
  if (p.selection_rules) {
    lines.push(tr("选择规则", "Selection rules"));
    lines.push(`• ${T(p.selection_rules)}`);
  }
  if (Array.isArray(p.notes) && p.notes.length) {
    lines.push(tr("备注", "Notes"));
    p.notes.forEach((n) => lines.push(`• ${T(n)}`));
  }

  // 若两个池都为空，给出兜底提示
  if (!climbPool.length && !gymPool.length) {
    lines.push(tr("（后端返回缺少 pools.climb/gym 或结构异常）", "(Response missing pools.climb/gym or malformed)"));
  }

  return lines;
}



// ====== 组件 ======
export default function Generator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [preview, setPreview] = useState<Plan | null>(null);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const containerHeight = Dimensions.get("window").height;
  const slideAnim = useRef(new Animated.Value(containerHeight)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);

  // 等级系统
  const { boulderScale: bScale, ropeScale: rScale } = useSettings();

  // 语言 & 单位
  const { unit } = useSettings();
  const { lang, tt, tr } = useI18N();

  const heightUnit = unit === "metric" ? "cm" : "ft";
  const weightUnit = unit === "metric" ? "kg" : "lbs";

  const [shouldType, setShouldType] = useState(false);
  const [typedSig, setTypedSig] = useState<string | null>(null);

  const planSig = (p: Plan | null) =>
    p ? `${p.meta?.start_date}|${p.meta?.cycle_weeks}|${p.meta?.freq_per_week}|${p.weeks?.length||0}` : "";

  useFocusEffect(
    useCallback(() => {
      isClosingRef.current = false;
      slideAnim.setValue(containerHeight);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start();
      return () => {
        slideAnim.setValue(containerHeight);
        overlayOpacity.setValue(0);
      };
    }, [containerHeight, slideAnim, overlayOpacity])
  );

  const exitIndex = useCallback(
    (target: string = "calendar") => {
      if (isClosingRef.current) return;
      isClosingRef.current = true;
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: containerHeight,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        navigation.navigate(target as never);
      });
    },
    [containerHeight, navigation, overlayOpacity, slideAnim]
  );

  useEffect(() => {
    (async () => {
      try {
        const [savedPreview, savedSig, typed, savedForm] = await Promise.all([
          AsyncStorage.getItem("@preview_json"),
          AsyncStorage.getItem("@preview_sig"),
          AsyncStorage.getItem("@preview_typed"),
          AsyncStorage.getItem("@profile_form"),
        ]);
        if (savedPreview) {
          const p: Plan = JSON.parse(savedPreview);
          setPreview(p);
          setTypedSig(savedSig);
          setShouldType(typed !== "1");
        }
        // 同步表单（如果有）
        if (savedForm) {
          const f = JSON.parse(savedForm);
          setForm((s) => ({ ...s, ...f }));
        }
      } catch {}
    })();
  }, []);

  // Step3 用到的负重单位切换（本地 UI 状态）
  const [wpUnit, setWpUnit] = useState<"kg"|"lb">("kg");

  // —— 新：Step3 时间安排的提示（超过 7 次时提示自动收敛）——
  const [scheduleTip, setScheduleTip] = useState<string | null>(null);
  const showScheduleTip = (msg: string) => {
    setScheduleTip(msg);
    setTimeout(() => setScheduleTip(null), 2200);
  };

  const [form, setForm] = useState<FormState>({
    // Step1
    gender: "男",
    height: 175,
    weight: 70,
    bodyfat: 18,
    freq_per_week: 4, // 兼容字段，运行时由新字段回填

    // 基础体能默认值
    grip_kg: null,
    plank_sec: 60,
    sit_and_reach_cm: 0,
    hip_mobility_score: 3,

    // Step2（兼容）
    climb_freq: "3-4次",
    train_freq: "3-4次",
    rest_days: 2,
    rest_weekdays: [],

    // Step3（旧）
    bw_rep_max: 8,
    weighted_pullup_1rm_kg: 20,

    // Step4（旧）
    one_arm_hang: 5,
    weaknesses: [],

    // Step5（旧）
    boulder_level: "v4-v5",
    yds_level: "5.11a",

    // Step2 补充
    hardest_send: null,
    indoor_outdoor_ratio: 50,

    // 恢复与伤病
    pain_finger_0_3: 0,
    pain_shoulder_0_3: 0,
    pain_elbow_0_3: 0,
    pain_wrist_0_3: 0,
    stretching_freq_band: '1-2',

    // —— 新：Step3 时间安排·新 —— //
    climb_days_per_week: 3,
    gym_days_per_week: 2,
    cycle_weeks: 12,
  });

  // 用 function 声明，避免 TSX 对箭头泛型解析问题
  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // ---- 校验每一步 ----
  const canNext = useMemo(() => {
    switch (step) {
      case 1:
      case 2:
        return true;
      case 3: {
        const c = form.climb_days_per_week;
        const g = form.gym_days_per_week;
        const cyc = form.cycle_weeks;
        const total = c + g;
        return (
          c >= 1 && c <= 7 &&
          g >= 0 && g <= 7 &&
          total <= 7 &&
          cyc >= 4 && cyc <= 12
        );
      }
      default:
        return true;
    }
  }, [step, form]);

  // --- 若后端未返回 meta，前端兜底补齐 ---
  const ensureMeta = (plan: Plan): Plan => {
    const todayISO = new Date(
      new Date().getTime() - new Date().getTimezoneOffset() * 60000
    ).toISOString().slice(0, 10);

    const meta = plan.meta || {};
    const cycle_weeks = form.cycle_weeks || meta.cycle_weeks || 12;

    // 简单的 progression 兜底（长度对齐 cycle_weeks）
    const makeProg = (len: number): number[] => {
      const base = [0.9,1.0,1.05,1.1,1.15,0.95,1.1,1.15,1.2,1.25,0.95,1.15];
      if (len <= base.length) return base.slice(0, len);
      const out = [...base];
      while (out.length < len) out.push(1.0);
      return out;
    };

    const totalPerWeek = form.climb_days_per_week + form.gym_days_per_week;

    return {
      ...plan,
      meta: {
        cycle_weeks,
        freq_per_week: totalPerWeek,
        start_date: meta.start_date || todayISO,
        progression: (meta.progression && meta.progression.length)
          ? meta.progression
          : makeProg(cycle_weeks),
        source: meta.source,
        refined: meta.refined,
      },
      notes: plan.notes || [
        `计划周期：${cycle_weeks} 周；含 1–2 次恢复周。`,
        "每周包含量练与突破；核心/腿部/指力按日区分安排，条目 6–10 个。",
        "若疲劳明显，可将某条目组数-1 或时长/次数下调 10–20%。",
      ],
    };
  };

  // ✅ 点击“生成预览”：发后端
  const requestAndPreview = async () => {
    try {
      if (loading) return;
      setLoading(true);

      // —— 由新字段派生兼容旧字段 —— //
      const weekly_total = form.climb_days_per_week + form.gym_days_per_week;
      const compat_climb_freq = numToRangeOpt(form.climb_days_per_week);
      const compat_train_freq = numToRangeOpt(weekly_total);
      const compat_rest_days = (7 - weekly_total) as RestDays;

      // 将 weaknesses 稳定 key 转换为当前语言展示文案
      const weaknessLabels = form.weaknesses.map((k) => WEAKNESS_LABELS[lang][k]).join("、");

      // 替换这段：const payload = { ... }
      const payload = {
        // —— 基础体征 —— //
        gender: form.gender,
        height: form.height,             // cm
        weight: form.weight,             // kg
        bodyfat: form.bodyfat,           // %

        // —— 新的时间安排（核心）—— //
        climb_days_per_week: form.climb_days_per_week,  // 1..7
        gym_days_per_week: form.gym_days_per_week,      // 0..7
        weekly_total,                                   // = climb + gym
        cycle_weeks: form.cycle_weeks,                  // 4..12
        weekly_template: true,
        no_weekday_specific: true,

        // —— 兼容旧后端字段（后续可删除）—— //
        freq_per_week: weekly_total,
        climb_freq: compat_climb_freq,
        train_freq: compat_train_freq,
        rest_days: compat_rest_days,
        rest_weekdays: [],
        cycle_months: Math.round(form.cycle_weeks / 4),

        // —— 体能 / 力量 —— //
        grip_kg: form.grip_kg,                 // 可能为 null
        plank_sec: form.plank_sec,             // 可能为 null
        sit_and_reach_cm: form.sit_and_reach_cm,
        hip_mobility_score: form.hip_mobility_score,
        bw_pullups: `${form.bw_rep_max} 次 × 5 组`,
        weighted_pullups: `${form.weighted_pullup_1rm_kg} kg 1 次 × 3 组`,
        bw_max_reps: form.bw_rep_max,
        w_max_weight_kg: form.weighted_pullup_1rm_kg,
        one_arm_hang: form.one_arm_hang,

        // —— 恢复与伤病 —— //
        pain_finger_0_3: form.pain_finger_0_3,
        pain_shoulder_0_3: form.pain_shoulder_0_3,
        pain_elbow_0_3: form.pain_elbow_0_3,
        pain_wrist_0_3: form.pain_wrist_0_3,
        stretching_freq_band: form.stretching_freq_band,

        // —— 弱项 —— //
        finger_weakness: weaknessLabels, // 人类可读
        weaknesses: form.weaknesses,     // 机器可读 key

        // —— 攀岩水平 —— //
        boulder_level: vScaleToNumeric(form.boulder_level),
        yds_level: form.yds_level,

        // —— 专项补充 —— //
        hardest_send: form.hardest_send,                // { type, grade, style } | null
        indoor_outdoor_ratio: form.indoor_outdoor_ratio // 0..100
      };


      const { data } = await axios.post(PLAN_JSON_URL, payload, { timeout: 120000 });
      const p: Plan = data.plan;
      const withMeta = ensureMeta(p);

      // 把兼容字段也写回 form（保证 Profile 等使用旧字段的页面不崩）
      setForm((s) => ({
        ...s,
        freq_per_week: weekly_total,
        climb_freq: compat_climb_freq,
        train_freq: compat_train_freq,
        rest_days: compat_rest_days,
        rest_weekdays: [],
      }));

      setPreview(withMeta);
      setStep(4);
      const sig = planSig(withMeta);
      setTypedSig(sig);
      setShouldType(true);

      await AsyncStorage.multiSet([
        ["@preview_json", JSON.stringify(withMeta)],
        ["@preview_sig", sig],
        ["@preview_typed", "0"],
        ["@profile_form", JSON.stringify({
          ...form,
          // 同步最新的兼容派生
          freq_per_week: weekly_total,
          climb_freq: compat_climb_freq,
          train_freq: compat_train_freq,
          rest_days: compat_rest_days,
          rest_weekdays: [],
        })],
      ]);

    } catch (e: any) {
      console.log("Generate error:", e?.response?.data || e?.message);
      Alert.alert("出错了", e?.response?.data?.detail || e?.message || "请检查后端/网络");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 导入到训练日历
  const confirmImport = async () => {
    if (!preview) return;
    await AsyncStorage.setItem("@plan_json", JSON.stringify(preview));
    await AsyncStorage.setItem("@profile_form", JSON.stringify(form));
    exitIndex("calendar");
  };

  // ---- 可复用 UI ----
  const Section = ({
    title, children, onHelp, helpLabel = tr("帮助", "Help")
  }: {
    title: string;
    children: React.ReactNode;
    onHelp?: () => void;
    helpLabel?: string;
  }) => (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          marginHorizontal: 16,
          borderWidth: 0.6,
          borderColor: "#e5e7eb",
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4, // ✅ Android 阴影
        }}
      >
        {/* ✅ 标题与 onHelp 移到卡片内部 */}
        <View
          style={{
            paddingTop: 12,
            paddingHorizontal: 16,
            paddingBottom: 2,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "bold" }}>
            {title}
          </Text>

          {onHelp && (
            <Pressable
              onPress={onHelp}
              hitSlop={8}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: "#e5f5f0",
              }}
            >
              <Text style={{ color: "#245556", fontWeight: "600" }}>
                {helpLabel}
              </Text>
            </Pressable>
          )}
        </View>

        {/* ✅ 统一内容留白 */}
        <View style={{ padding: 4, paddingTop: 0 }}>
          {children}
        </View>
      </View>
    </View>
  );


  const Row = ({ children }: { children: React.ReactNode }) => (
    <View style={{ flexDirection: "row", alignItems: "center" }}>{children}</View>
  );

  const Col = ({
    label,
    labelNode,
    children,
    flex = 1,
  }: {
    label?: string;
    labelNode?: React.ReactNode;
    children: React.ReactNode;
    flex?: number;
  }) => (
    <View style={{ flex, paddingVertical: 6 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 12, paddingTop: 6, paddingRight: 12 }}>
        {labelNode ? (
          labelNode
        ) : (
          <Text style={{ color: "#6b7280", fontSize: 12 }}>{label}</Text>
        )}
      </View>
      {children}
    </View>
  );

// —— 中间代码保持不变 ——

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

const Chip = ({
  label,
  active,
  onPress,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) => {
  // ✅ 统一去掉 label 的前导空格（半角/全角/不换行空格）
  const displayLabel = label.replace(/^[\s\u00A0\u3000]+/, "");

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 0.3,
        borderColor: active ? "#111827" : "#e5e7eb",
        backgroundColor: active ? "#111827" : "#f3f4f6",
        marginRight: 8,
        marginBottom: 8,
        opacity: disabled ? 0.5 : 1,
        shadowColor: "#000",
        shadowOpacity: active ? 0.04 : 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: active ? 3 : 0,  
      }}
    >
      <Text style={{ color: active ? "#FFFFFF" : tokens.color.text }}>
        {displayLabel}
      </Text>
    </Pressable>
  );
};



  const Progress = () => (
    <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 16, marginTop: 12 }}>
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={{
            height: 6, flex: 1, borderRadius: 999,
            backgroundColor: step >= (n as Step) ? "#4f46e5" : "#e5e7eb",
          }}
        />
      ))}
    </View>
  );

  // ---- 步骤内容 ----
  const StepContent = () => {
    switch (step) {
      // Step 1：基础信息
      case 1:
        return (
          <>
            <Section title={tr("基础信息", "Basics")}>
              {/* 性别 */}
              <Row>
                <Col label={tr("性别", "Sex")}>
                  <Picker
                    selectedValue={form.gender}
                    onValueChange={(v) => set("gender", v as "男" | "女")}
                  >
                    <Picker.Item label={tr("男", "Male")} value="男" />
                    <Picker.Item label={tr("女", "Female")} value="女" />
                  </Picker>
                </Col>
                
                <Col label={tr(`身高（${heightUnit})`, `Height (${heightUnit})`)}>
                  <Picker
                    selectedValue={form.height}
                    onValueChange={(v) => set("height", Number(v))}
                  >
                    {Array.from({ length: 111 }, (_, i) => 120 + i).map((cm) => (
                      <Picker.Item
                        key={cm}
                        label={heightUnit === "cm" ? `${cm}` : formatFtIn(cm)}
                        value={cm}
                      />
                    ))}
                  </Picker>
                </Col>
              </Row>

              {/* 身高/体重 */}
              <Row>
                <Col label={tr(`体重（${weightUnit})`, `Weight (${weightUnit})`)}>
                  <Picker
                    selectedValue={weightUnit === "kg" ? form.weight : kgToLb(form.weight)}
                    onValueChange={(v) => {
                      const val = Number(v);
                      if (weightUnit === "kg") set("weight", val);
                      else set("weight", lbToKg(val));
                    }}
                  >
                    {weightUnit === "kg"
                      ? Array.from({ length: 171 }, (_, i) => 30 + i).map((n) => (
                          <Picker.Item key={n} label={`${n}`} value={n} />
                        ))
                      : Array.from({ length: 266 }, (_, i) => 66 + i).map((n) => (
                          <Picker.Item key={n} label={`${n}`} value={n} />
                        ))}
                  </Picker>
                </Col>

                <Col label={tr("体脂率（%)", "Body fat (%)")}>
                  <Picker
                    selectedValue={form.bodyfat}
                    onValueChange={(v) => set("bodyfat", Number(v))}
                  >
                    {Array.from({ length: 41 }, (_, i) => 5 + i).map((n) => (
                      <Picker.Item key={n} label={`${n}`} value={n} />
                    ))}
                  </Picker>
                </Col>
              </Row>
            </Section>

            <Section
              title={tr("力量 & 耐力", "Strength & Endurance")}
              onHelp={() =>
                openHelp({
                  title: tr("如何测试这些数值？", "How to test these metrics?"),
                  content: tr(
                    "握力：用握力计，双手各 2–3 次取最高；\n平板支撑：脊柱中立，不塌腰/不过高，到力竭停止计时；\n引体PR：全程标准（起始肘伸直、下巴过杠，摆动最小）。",
                    "Grip: dynamometer, best of 2–3 tries per hand;\nPlank: neutral spine, no sag/pike, stop at true failure;\nPull-up PR: full ROM (elbows locked at start, chin over bar, minimal kipping)."
                  ),
                })
              }
            >
              {/* 行 1：握力 + 平板支撑 */}
              <Row>
                <Col label={tr("握力（kg）", "Grip strength (kg)")}>
                  <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
                    <Picker
                      style={{ flex: 1 }}
                      selectedValue={form.grip_kg ?? 30}
                      enabled={form.grip_kg !== null}
                      onValueChange={(v) => set("grip_kg", Number(v))}
                    >
                      {Array.from({ length: 91 }, (_, i) => 10 + i).map((n) => (
                        <Picker.Item key={n} label={`${n}`} value={n} />
                      ))}
                    </Picker>
                    <Chip
                      label={tr("未知", "Unknown")}
                      active={form.grip_kg === null}
                      onPress={() => set("grip_kg", form.grip_kg === null ? 30 : null)}
                    />
                  </View>
                </Col>

                <Col label={tr("平板支撑（秒）", "Plank (sec)")}>
                  <Picker
                    selectedValue={form.plank_sec ?? 60}
                    enabled={form.plank_sec !== null}
                    onValueChange={(v) => set("plank_sec", Number(v))}
                  >
                    {Array.from({ length: 291 }, (_, i) => 10 + i).map((n) => (
                      <Picker.Item key={n} label={`${n}`} value={n} />
                    ))}
                  </Picker>
                </Col>
              </Row>

              {/* 行 3：引体 PR（临时放在 Step1） */}
              <Row>
                <Col label={tr("引体向上单组极限（次）", "Pull-up max reps")}>
                  <Picker
                    selectedValue={form.bw_rep_max}
                    onValueChange={(v) => set("bw_rep_max", Number(v))}
                  >
                    {Array.from({ length: 41 }, (_, i) => i).map((n) => (
                      <Picker.Item key={n} label={`${n}`} value={n} />
                    ))}
                  </Picker>
                </Col>
              </Row>
            </Section>

            <Section
              title={tr("柔韧 & 髋灵活", "Flexibility & Hip mobility")}
              onHelp={() =>
                openHelp({
                  title: tr("髋关节灵活度（0–5）如何评分？", "How to rate Hip Mobility (0–5)"),
                  content: tr(
                    "0 严重受限（深蹲/盘腿困难且疼痛/代偿明显）\n1 明显受限（开髋、内外旋幅度不足）\n2 轻度受限（日常可做，高脚点吃力）\n3 正常（多数动作可做，偶有紧张）\n4 良好（幅度大，开髋高脚点轻松）\n5 优秀（深蹲贴地、开髋接近劈叉且稳定）\n\n小提示：先热身 3–5 分钟；若两侧不一致，按较差一侧评分。",
                    "0 Severely limited (pain/compensation in deep squat/cross-leg)\n1 Markedly limited (restricted ER/IR/abduction)\n2 Mildly limited (daily OK, high footholds feel hard)\n3 Typical (most moves OK, occasional tightness)\n4 Good (large ROM, open-hip/high feet are easy)\n5 Excellent (ass-to-grass squat, near-split without compensation)\n\nTips: warm up 3–5 min; if sides differ, rate the worse side."
                  ),
                })
              }
            >
              <Row>
                <Col label={tr("坐姿体前屈（cm）", "Sit & reach (cm)")}>
                  <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12 }}>
                    <Picker
                      style={{ flex: 1 }}
                      selectedValue={form.sit_and_reach_cm ?? 0}
                      enabled={form.sit_and_reach_cm !== null}
                      onValueChange={(v) => set("sit_and_reach_cm", Number(v))}
                    >
                      {Array.from({ length: 41 }, (_, i) => i - 20).map((n) => (
                        <Picker.Item key={n} label={`${n}`} value={n} />
                      ))}
                    </Picker>
                    <Chip
                      label={tr("未知", "Unknown")}
                      active={form.sit_and_reach_cm === null}
                      onPress={() => set("sit_and_reach_cm", form.sit_and_reach_cm === null ? 0 : null)}
                    />
                  </View>
                </Col>

                <Col label={tr("髋关节灵活度（0–5）", "Hip mobility (0–5)")}>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingTop: 6 }}>
                    {[0,1,2,3,4,5].map((n) => (
                      <Chip
                        key={`hip-${n}`}
                        label={String(n)}
                        active={form.hip_mobility_score === n}
                        onPress={() => set("hip_mobility_score", n as 0|1|2|3|4|5)}
                      />
                    ))}
                  </View>
                </Col>
              </Row>
            </Section>
          </>
        );

      // Step 2：弱项 + 水平评估 + 攀岩专项补充
      case 2:
        return (
          <>
            <Section title={tr("攀岩弱项","Weaknesses")}>
              <View style={{ padding: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {(["fingerStrength","power","endurance","footwork"] as WeaknessKey[]).map((k) => {
                  const active = form.weaknesses.includes(k);
                  const label = WEAKNESS_LABELS[lang][k];
                  return (
                    <Pressable
                      key={k}
                      onPress={() => {
                        set(
                          "weaknesses",
                          active ? form.weaknesses.filter((x) => x !== k) : [...form.weaknesses, k]
                        );
                      }}
                      style={{
                        paddingVertical: 8,
                        paddingHorizontal: 12,
                        borderRadius: 999,
                        borderWidth: 0.6,
                        borderColor: active ? "#111827" : "#e5e7eb",     // ✅ 选中：黑色描边
                        backgroundColor: active ? "#111827" : "#f3f4f6",   // ✅ 选中：黑底
                        shadowColor: "#000",
                        shadowOpacity: active ? 0.04 : 0.06,
                        shadowRadius: 6,
                        shadowOffset: { width: 0, height: 2 },
                        elevation: active ? 3 : 0,                       // ✅ Android 阴影
                      }}
                    >
                      <Text style={{ color: active ? "#FFFFFF" : "#111827", fontWeight: "600" }}>
                        {label}
                      </Text>
                    </Pressable>

                  );
                })}
              </View>
            </Section>

            <Section title={tr("水平评估","Level Assessment")}>
              <Row>
                <Col label={`${tr("抱石","Boulder")}（${bScale === "V" ? "V-SCALE" : "FONT.SCALE"}）`}>
                  <Picker
                    selectedValue={form.boulder_level}
                    onValueChange={(v) => set("boulder_level", v as VScaleOpt)}
                  >
                    {(["v1-v2","v2-v3","v3-v4","v4-v5","v5-v6","v6-v7","v7-v8","v8-v9","v9以上"] as VScaleOpt[])
                      .map((s) => (
                        <Picker.Item
                          key={s}
                          value={s}
                          label={bScale === "V" ? s.toUpperCase() : (FONT_RANGE_MAP[s] || s.toUpperCase())}
                        />
                    ))}
                  </Picker>
                </Col>

                <Col label={`${tr("难度","Rope")}(${rScale})`}>
                  <Picker
                    selectedValue={form.yds_level}
                    onValueChange={(v) => set("yds_level", String(v))}
                  >
                    {[
                      "5.6","5.7","5.8","5.9",
                      "5.10a","5.10b","5.10c","5.10d",
                      "5.11a","5.11b","5.11c","5.11d",
                      "5.12a","5.12b","5.12c","5.12d",
                      "5.13a","5.13b","5.13c","5.13d",
                      "5.14a","5.14b","5.14c","5.14d",
                    ].map((s) => (
                      <Picker.Item
                        key={s}
                        value={s}
                        label={rScale === "French" ? (YDS_TO_FRENCH[s] || s) : s}
                      />
                    ))}
                  </Picker>
                </Col>
              </Row>
            </Section>

            {/* —— 攀岩专项（补充） —— */}
            <Section
              title={tr("攀岩专项（补充）", "Climb-specific (extras)")}
              onHelp={() =>
                openHelp({
                  title: tr("补充信息的用途", "What these are used for"),
                  content: tr(
                    "「历史最好完成」用于判断你的峰值能力与稳定输出差；「室内/户外占比」会影响动作类型与强度安排。",
                    "“Hardest send” helps calibrate peak vs. stable output; indoor/outdoor ratio nudges exercise selection and intensity."
                  ),
                })
              }
            >
              {(() => {
                const V_GRADES = ["V0","V1","V2","V3","V4","V5","V6","V7","V8","V9","V10"];
                const YDS_LIST = [
                  "5.6","5.7","5.8","5.9",
                  "5.10a","5.10b","5.10c","5.10d",
                  "5.11a","5.11b","5.11c","5.11d",
                  "5.12a","5.12b","5.12c","5.12d",
                  "5.13a","5.13b","5.13c","5.13d",
                  "5.14a","5.14b","5.14c","5.14d",
                ];
                return (
                  <>
                    <Row>
                      <Col label={tr("室内/户外占比（室内%）", "Indoor / Outdoor ratio (indoor %)")}>
                        <Picker
                          selectedValue={form.indoor_outdoor_ratio ?? 50}
                          onValueChange={(v) => set("indoor_outdoor_ratio", Number(v))}
                        >
                          {Array.from({ length: 11 }, (_, i) => i * 10).map((p) => (
                            <Picker.Item key={p} value={p} label={`${p}%`} />
                          ))}
                        </Picker>
                      </Col>
                    </Row>
                  </>
                );
              })()}
            </Section>
          </>
        );

      case 3:
        return (
          <>
            {/* ============ 新：时间安排（完全替换旧板块） ============ */}
            <Section title={tr("时间安排", "Scheduling")}>
              <View style={{ padding: 12 }}>
                {/* 提示行（超 7 自动收敛） */}
                {!!scheduleTip && (
                  <View style={{ paddingVertical: 6, paddingHorizontal: 10, marginBottom: 6, borderRadius: 8, backgroundColor: "#f5f7ff" }}>
                    <Text style={{ color: "#4f46e5" }}>{scheduleTip}</Text>
                  </View>
                )}

                {/* A. 一周几次攀岩？ */}
                <Text style={{ color: "#6b7280", marginBottom: 6 }}>
                  {tr("一周几次攀岩？", "Climbing sessions per week")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {Array.from({ length: 7 }, (_, i) => i + 1).map((n) => (
                    <Chip
                      key={`climb-${n}`}
                      label={tr(`${n}`, `${n}`)}
                      active={form.climb_days_per_week === n}
                      onPress={() => {
                        const g = form.gym_days_per_week;
                        const total = n + g;
                        if (total > 7) {
                          const newGym = Math.max(0, 7 - n);
                          setForm((s) => ({ ...s, climb_days_per_week: n, gym_days_per_week: newGym }));
                          showScheduleTip(tr(`总次数上限为 7，已自动调整健身房次数为 ${7 - n}。`, `Weekly total cannot exceed 7. Gym sessions adjusted to ${7 - n}.`));
                        } else {
                          set("climb_days_per_week", n);
                        }
                      }}
                    />
                  ))}
                </View>

                {/* B. 一周几次健身房？ */}
                <Text style={{ color: "#6b7280", marginBottom: 6, marginTop: 6 }}>
                  {tr("一周几次健身房？", "Gym sessions per week")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {Array.from({ length: 8 }, (_, i) => i).map((n) => (
                    <Chip
                      key={`gym-${n}`}
                      label={tr(`${n}`, `${n}`)}
                      active={form.gym_days_per_week === n}
                      onPress={() => {
                        const c = form.climb_days_per_week;
                        const total = c + n;
                        if (total > 7) {
                          const newGym = Math.max(0, 7 - c);
                          set("gym_days_per_week", newGym);
                          showScheduleTip(tr(`总次数上限为 7，已自动调整健身房次数为 ${7 - c}。`, `Weekly total cannot exceed 7. Gym sessions adjusted to ${7 - c}.`));
                        } else {
                          set("gym_days_per_week", n);
                        }
                      }}
                    />
                  ))}
                </View>

                {/* 总览 */}
                <View style={{ marginTop: 8, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: "#f9fafb", flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: "#374151" }}>
                    {tr("每周总次数", "Weekly total")}: {form.climb_days_per_week + form.gym_days_per_week}
                  </Text>
                  <Text style={{ color: "#6b7280" }}>
                    {tr("休息日", "Rest days")}: {7 - (form.climb_days_per_week + form.gym_days_per_week)}
                  </Text>
                </View>

                {/* C. 计划周期时长 */}
                <Text style={{ color: "#6b7280", marginBottom: 6, marginTop: 12 }}>
                  {tr("计划周期时长", "Plan cycle length")}
                </Text>

                {/* 快捷：1/2/3 个月 */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 4 }}>
                  {[
                    { m: 1, w: 4 },
                    { m: 2, w: 8 },
                    { m: 3, w: 12 },
                  ].map(({ m, w }) => (
                    <Chip
                      key={`m-${m}`}
                      label={tr(`${m} 个月（${w} 周）`, `${m} month (${w} wks)`)}
                      active={form.cycle_weeks === w}
                      onPress={() => set("cycle_weeks", w)}
                    />
                  ))}
                </View>
              </View>
            </Section>

            {/* —— 恢复与伤病（保持原样） —— */}
            <Section
              title={tr("恢复与伤病", "Recovery & Injury")}
              onHelp={() =>
                openHelp({
                  title: tr("如何使用这组开关", "How to use these fields"),
                  content: tr(
                    "疼痛分级：0=无 / 1=轻度 / 2=中度 / 3=重度。等级≥2 时，生成计划会降低相关部位负荷并插入恢复动作；“拉伸频率”用于确定每周恢复条目的占比。",
                    "Pain scale: 0=None / 1=Mild / 2=Moderate / 3=Severe. If ≥2, the plan will down-regulate loads for that area and add recovery work. Stretching frequency sets weekly recovery allocation."
                  ),
                })
              }
            >
              {(() => {
                const PainChips = ({value, onChange}: {value: 0|1|2|3; onChange: (n:0|1|2|3)=>void}) => (
                  <View style={{ flexDirection: "row", paddingHorizontal: 12, paddingTop: 6 }}>
                    {[0,1,2,3].map((n) => (
                      <Chip key={n} label={String(n)} active={value === n} onPress={() => onChange(n as 0|1|2|3)} />
                    ))}
                  </View>
                );
                return (
                  <>
                    <Row>
                      <Col label={tr("手指疼痛（0–3）", "Finger pain (0–3)")}>
                        <PainChips
                          value={form.pain_finger_0_3}
                          onChange={(n)=>set("pain_finger_0_3", n)}
                        />
                      </Col>
                      <Col label={tr("肩部疼痛（0–3）", "Shoulder pain (0–3)")}>
                        <PainChips
                          value={form.pain_shoulder_0_3}
                          onChange={(n)=>set("pain_shoulder_0_3", n)}
                        />
                      </Col>
                    </Row>

                    <Row>
                      <Col label={tr("肘部疼痛（0–3）", "Elbow pain (0–3)")}>
                        <PainChips
                          value={form.pain_elbow_0_3}
                          onChange={(n)=>set("pain_elbow_0_3", n)}
                        />
                      </Col>
                      <Col label={tr("手腕疼痛（0–3）", "Wrist pain (0–3)")}>
                        <PainChips
                          value={form.pain_wrist_0_3}
                          onChange={(n)=>set("pain_wrist_0_3", n)}
                        />
                      </Col>
                    </Row>
                  </>
                );
              })()}
            </Section>
          </>
        );

      // Step 4：训练计划预览
      case 4:
        return (
          <>
            <Section title={tr("训练计划预览","Plan Preview")}>
              <ScrollView style={{ maxHeight: 540, padding: 12 }}>
                {preview ? (
                  shouldType ? (
                    <TypewriterLines
                      key={(typedSig || "no-sig") + "-typing"}
                      lines={buildPreviewLines({ preview, form, tr, tt, rScale, YDS_TO_FRENCH })}
                      charInterval={18}
                      linePause={220}
                      onDone={async () => {
                        setShouldType(false);
                        await AsyncStorage.setItem("@preview_typed", "1");
                      }}
                    />
                  ) : (
                    <View key={(typedSig || "no-sig") + "-static"}>
                      {buildPreviewLines({ preview, form, tr, tt, rScale, YDS_TO_FRENCH }).map((ln, i) => (
                        <Text key={i} style={{ color: "#374151", lineHeight: 20, marginBottom: 4 }}>{ln}</Text>
                      ))}
                    </View>
                  )
                ) : (
                  <Text style={{ color: "#9ca3af" }}>{tr("暂无预览，请点“生成预览”。","No preview. Tap 'Generate plan'.")}</Text>
                )}
              </ScrollView>
            </Section>
          </>
        );
    }
  };

  const sheetRef = useRef<BottomSheet>(null);
  const [help, setHelp] = useState<{ title: string; content: string } | null>(null);
  const snapPoints = useMemo(() => ["45%", "85%"], []);
  const openHelp = (h: { title: string; content: string }) => {
    setHelp(h);
    requestAnimationFrame(() => sheetRef.current?.snapToIndex(0));
  };
  const closeHelp = () => sheetRef.current?.close();

  return (
    <Animated.View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", opacity: overlayOpacity }}>
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "#FFFFFF",
          paddingTop: 0,
          transform: [{ translateY: slideAnim }],
        }}
      >
        <TopBar
          routeName="index"
          titleZH="计划生成"
          titleEN="Plan Generator"
          rightControls={{
            mode: "stepper",
            step,
            total: 4,
            canPrevStep: step > 1,
            canNextStep: step < 4 && (step < 3 || (step === 3 && canNext)),
            onPrevStep: () => setStep((s) => Math.max(1, (s as number) - 1) as Step),
            onNextStep: () => {
              if (step === 4) return;
              if (step === 3 && !canNext) {
                Alert.alert(tr("请先完成选择", "Complete required fields"));
                return;
              }
              setStep((s) => Math.min(4, (s as number) + 1) as Step);
            },
            maxWidthRatio: 0.6,
          }}
        />
      {/* step=4 在顶部栏下方显示操作胶囊 */}
      {step === 4 && (
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button
              title={loading ? tr("生成中…","Generating…") : tr("生成训练计划","Generate plan")}
              onPress={requestAndPreview}
              style={{ flex: 1, opacity: loading ? 0.7 : 1 }}
            />
            <Button
              title={tr("导入到训练日历","Import to calendar")}
              onPress={confirmImport}
              variant="secondary"
              style={{ flex: 1, opacity: !preview || loading ? 0.7 : 1 }}
            />
          </View>
        </View>
      )}

      {/* 内容区 */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView style={{ flex: 1, paddingTop: 10, paddingBottom: 72 }} contentContainerStyle={{ paddingBottom: 80 }}>
          <StepContent />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 生成中遮罩 */}
      <Modal visible={loading} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "center", alignItems: "center" }}>
          <View style={{ backgroundColor: "white", paddingVertical: 20, paddingHorizontal: 24, borderRadius: 12, alignItems: "center", minWidth: 160 }}>
            <ActivityIndicator size="large" />
            <Text style={{ marginTop: 12, fontSize: 16 }}>{tr("生成中，请稍候…","Generating, please wait…")}</Text>
          </View>
        </View>
      </Modal>

      {/* 底部抽屉（帮助） */}
      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={["45%", "85%"]}
        enablePanDownToClose
        backdropComponent={(props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 , borderRadius: 20}}>
          {!!help && (
            <>
              <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>{help.title}</Text>
              <Text style={{ color: "#374151", lineHeight: 20 }}>{help.content}</Text>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
        <Pressable
          accessibilityLabel={tr("关闭生成器", "Close generator")}
          onPress={() => exitIndex("calendar")}
          style={{
            position: "absolute",
            bottom: Math.max(insets.bottom + 24, 32),
            left: "50%", // ✅ 从右侧改成居中
            transform: [{ translateX: -24 }], // ✅ 按钮宽度一半，向左平移实现真正居中
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "#111827",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#000",
            shadowOpacity: 0.25,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Ionicons name="close" size={20} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}
