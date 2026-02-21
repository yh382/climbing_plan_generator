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
import { useSettings } from "src/contexts/SettingsContext";
import { I18N, useI18N } from "../../lib/i18n";
import { Button } from "../../components/ui/Button";
import { tokens } from "../../components/ui/Theme";
import { useLayoutEffect } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import TopBar from "../../components/TopBar";
import { Ionicons } from "@expo/vector-icons";
import { PlanV3, PlanV3Session } from "../../src/types/plan";
import { Section, Progress } from "../../src/features/planGenerator/components/FormPrimitives";
import { HelpSheet } from "../../src/features/planGenerator/components/HelpSheet";
import { Step1Basics } from "../../src/features/planGenerator/components/steps/Step1Basics";
// 后续 Step2/3/4 也类似引入
import { Step2Assessment } from "src/features/planGenerator/components/steps/Step2Assessment";
import { Step3SchedulingRecovery } from "src/features/planGenerator/components/steps/Step3SchedulingRecovery";
import { Step4Preview } from "src/features/planGenerator/components/steps/Step4Preview";

import type { Step, FormState } from "../../src/features/planGenerator/types";
import { FONT_RANGE_MAP, YDS_TO_FRENCH, vScaleToNumeric } from "../../src/features/planGenerator/utils/grades";
import { numToRangeOpt } from "../../src/features/planGenerator/utils/conversions";

// [新增] 引入 Profile Store 用于同步数据
import { useProfileStore } from "../../src/features/profile/store/useProfileStore";

const API_BASE = process.env.EXPO_PUBLIC_API_BASE as string;
const PLAN_JSON_URL = `${API_BASE}/plans/build`;
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


// ====== 表单类型 ======
type Gender = "男" | "女";
type RangeOpt = "1-2次" | "2-3次" | "3-4次" | "4-5次" | "5-6次" | "6-7次";
type RestDays = 1 | 2 | 3 | 4 | 5 | 6;
export type WeaknessKey = "fingerStrength" | "power" | "endurance" | "footwork";
type VScaleOpt =
  | "v1-v2" | "v2-v3" | "v3-v4" | "v4-v5" | "v5-v6"
  | "v6-v7" | "v7-v8" | "v8-v9" | "v9以上";
type WeekdayKey = "Sun"|"Mon"|"Tue"|"Wed"|"Thu"|"Fri"|"Sat";

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


const midOfRange = (s: RangeOpt): number => {
  const num = s.replace("次", "");
  const [a, b] = num.split("-").map((x) => parseInt(x, 10));
  return Math.max(1, Math.min(7, Math.round((a + b) / 2)));
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

const adapterV3ToPreview = (v3: PlanV3): Plan => {
  const previewDays: any = {};
  const daysKey = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // 把攀岩和训练的 Session 混合在一起展示
  const allSessions = [
    ...v3.session_bank.train_sessions.map(s => ({ ...s, title: "训练 (Train)" })),
    ...v3.session_bank.climb_sessions.map(s => ({ ...s, title: "攀岩 (Climb)" }))
  ];

  daysKey.forEach((d, idx) => {
    if (idx < allSessions.length) {
      const sess = allSessions[idx];
      const items: any[] = [];
      
      sess.blocks.forEach(b => {
        b.items.forEach(it => {
          const name = it.name_override?.zh || it.action_id;
          let detail = "";
          if (it.sets) detail += `${it.sets}组`;
          if (it.reps) detail += `×${it.reps}`;
          else if (it.seconds) detail += `×${it.seconds}s`;
          if (it.notes?.zh) detail += ` | ${it.notes.zh}`;

          items.push({
            label: { zh: name, en: name },
            target: { zh: detail, en: detail }
          });
        });
      });

      previewDays[d] = { 
        title: { zh: `${sess.title} #${idx+1}`, en: sess.title }, 
        items 
      };
    } else {
      previewDays[d] = { title: { zh: "待定", en: "TBD" }, items: [] };
    }
  });

  return {
    meta: v3.meta,
    days: previewDays,
    notes: [{ zh: "此预览仅展示生成的训练模块，具体日期请在日历中安排。", en: "Preview modules only. Schedule freely in Calendar." }]
  };
};

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
  const [rawV3Data, setRawV3Data] = useState<PlanV3 | null>(null);

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
    gender: null,
    height: null,
    weight: null,
    bodyfat: null,

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
      case 1: {
        return (
          form.gender !== null &&
          form.height !== null &&
          form.weight !== null &&
          form.bodyfat !== null
        );
      }

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

    const previewLines = useMemo(() => {
        return buildPreviewLines({ preview, form, tr, tt });
      }, [preview, form, tr, tt]);
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

      // [修改] 构造符合后端 PlanV3 Schema 的 Payload
      // 1. 准备 Performance 数据 (对应后端 schemas.py/Performance)
      const performance = {
        // 映射引体向上
        pullup_max_reps: { value: form.bw_rep_max },
        // 映射平板支撑
        plank_sec: { value: form.plank_sec || 0 },
        // 映射抱石等级
        boulder_grade: { value: vScaleToNumeric(form.boulder_level) },
        // 映射难度等级
        lead_grade: { value: form.yds_level },
        // 映射最大悬挂 (如果有对应字段，这里暂时用 grip_kg 或 one_arm_hang 映射，或者给个默认值)
        // 这里的 hang_2h_30mm_sec 是触发 Calculator 负重建议的关键
        // 如果表单里没有直接对应的，我们可以暂时传个空，或者模拟一个
        hang_2h_30mm_sec: { value: 0 } 
      };

      // 2. 组装最终 Payload (对应后端 schemas.py/PlanBuildRequest)
      const payload = {
        // 必填字段：开始日期
        start_date: new Date().toISOString().split('T')[0], 
        // 必填字段：用户ID
        user_id: "local_user_v1",
        
        // 嵌套的 Profile 对象
        profile: {
          user_id: "local_user_v1",
          experience: "intermediate", // 可以根据 boulder_level 动态算，暂时写死
          
          // 映射时间安排
          weekly_pref: {
            climb_target: form.climb_days_per_week,
            train_target: form.gym_days_per_week,
            min_rest: 7 - (form.climb_days_per_week + form.gym_days_per_week)
          },
          
          // 映射体能数据
          performance: performance,
          
          // 映射伤病历史 (从 pain_xxx 字段转换)
          injuries: [
            form.pain_finger_0_3 > 1 ? "finger" : "",
            form.pain_shoulder_0_3 > 1 ? "shoulder" : "",
            form.pain_elbow_0_3 > 1 ? "elbow" : "",
            form.pain_wrist_0_3 > 1 ? "wrist" : ""
          ].filter(Boolean)
        }
      };


      const { data } = await axios.post(PLAN_JSON_URL, payload, { timeout: 120000 });
      // [修改开始] ----------------------------
      const v3Plan = data as PlanV3; // 强制类型转换
      setRawV3Data(v3Plan); // 1. 保存原始数据备用


      // 2. 使用适配器生成预览数据
      const previewPlan = adapterV3ToPreview(v3Plan);
      const withMeta = ensureMeta(previewPlan);
      // [修改结束] ----------------------------

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

// ✅ [修改] 导入到训练日历 + 同步用户画像
  const confirmImport = async () => {
    if (!rawV3Data && !preview) return;

    try {
        setLoading(true);

        // 1. 保存计划库 (供日历读取)
        if (rawV3Data) {
          await AsyncStorage.setItem("@current_plan_v3", JSON.stringify(rawV3Data));
        }
        
        // 2. 保存表单状态 (本地回显用)
        await AsyncStorage.setItem("@profile_form", JSON.stringify(form));
        
        // 3. [修改] 构造并同步用户画像到后端
        // 修复：将 null 转换为 undefined (对于可选字段) 或 0 (对于必填数值)
        const updatePayload = {
            anthropometrics: {
              height: form.height ?? 0,
              weight: form.weight ?? 0,
              sit_and_reach_cm: form.sit_and_reach_cm === null ? undefined : form.sit_and_reach_cm,
            },
            performance: {
                pullup_max_reps: { value: form.bw_rep_max },
                // Fix: 平板支撑如果未填 (null)，默认传 0
                plank_sec: { value: form.plank_sec ?? 0 },
                boulder_grade: { value: vScaleToNumeric(form.boulder_level) },
                lead_grade: { value: form.yds_level },
            },
            recovery: {
                pain: {
                    finger: form.pain_finger_0_3,
                    shoulder: form.pain_shoulder_0_3,
                    elbow: form.pain_elbow_0_3,
                    wrist: form.pain_wrist_0_3
                }
            },
            weekly_pref: {
                climb_target: form.climb_days_per_week,
                train_target: form.gym_days_per_week,
            }
        };

        // 调用 Store 更新
        await useProfileStore.getState().updateMe(updatePayload);

        // 4. 退出
        exitIndex("calendar");
        
    } catch (e) {
        console.error("Import failed", e);
        Alert.alert(tr("保存失败", "Save failed"), tr("用户数据同步失败，但计划已保存。", "Profile sync failed, but plan saved locally."));
        exitIndex("calendar"); 
    } finally {
        setLoading(false);
    }
  };




  // ---- 步骤内容 ----
  const StepContent = () => {
    switch (step) {
      // Step 1：基础信息
          case 1:
      return (
        <Step1Basics
          form={form}
          setField={set}
          tr={tr}
          lang={lang}
          unit={unit}
          openHelp={openHelp}
        />
      );

      // Step 2：弱项 + 水平评估 + 攀岩专项补充
          case 2:
            return (
              <Step2Assessment
                form={form}
                setField={set}
                tr={tr}
                openHelp={openHelp}
              />
            );
          case 3:
            return (
              <Step3SchedulingRecovery
                form={form}
                setField={set}
                tr={tr}
                openHelp={openHelp}
              />
            );
          case 4:
            return (
              <Step4Preview
                tr={tr}
                previewLines={previewLines}          // ✅ 用你原来的 state
                isGenerating={loading}          // ✅ 用你原来的 state
                onGenerate={requestAndPreview}       // ✅ 你原来的生成函数
                onConfirmImport={confirmImport}      // ✅ 你原来的导入函数
                onEdit={() => setStep(3)}            // 可选
              />
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
            canNextStep: step < 4 && (step === 1 ? canNext : step === 3 ? canNext : true),
            onPrevStep: () => setStep((s) => Math.max(1, (s as number) - 1) as Step),
            onNextStep: () => {
              if (step === 4) return;
              if ((step === 1 || step === 3) && !canNext) {
                Alert.alert(tr("请先完成必填信息", "Complete required fields"));
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
