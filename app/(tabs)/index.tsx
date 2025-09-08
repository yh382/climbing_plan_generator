// app/(tabs)/index.tsx
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSettings } from "../contexts/SettingsContext";
import { I18N, useI18N } from "../lib/i18n";

const API_JSON = "http://100.110.185.31:8000/plan_json";
const WD_ORDER: WeekdayKey[] = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const WD_CN: Record<WeekdayKey,string> = { Sun:"周日", Mon:"周一", Tue:"周二", Wed:"周三", Thu:"周四", Fri:"周五", Sat:"周六" };
const WD_EN: Record<WeekdayKey, string> = {
  Sun: "Sun", Mon: "Mon", Tue: "Tue", Wed: "Wed", Thu: "Thu", Fri: "Fri", Sat: "Sat",
};
const WEEK_KEYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] as const;
// === Weakness options: stable keys as values + language labels ===
// Use stable keys in form state; map to display strings via language context
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
// ====== 5 步 ======
type Step = 1 | 2 | 3 | 4 | 5;

// ====== 表单类型 ======
type Gender = "男" | "女";
type RangeOpt = "1-2次" | "2-3次" | "3-4次" | "4-5次" | "5-6次" | "6-7次";
type RestDays = 1 | 2 | 3 | 4 | 5 | 6;
// ✅ 用稳定的 key 作为值，不再用中文作值
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
  freq_per_week: number; // 每周训练天数（1-7）

  // Step 2
  climb_freq: RangeOpt;
  train_freq: RangeOpt;
  rest_days: RestDays;
  rest_weekdays: WeekdayKey[];

  // Step 3
  bw_rep_max: number;             // 0-20
  weighted_pullup_1rm_kg: number; // 0-100

  // Step 4
  one_arm_hang: number;   // 0-60
  weaknesses: WeaknessKey[]; // ✅ 存稳定 key

  // Step 5
  boulder_level: VScaleOpt;
  yds_level: string;
};

type PlanMeta = {
  cycle_weeks: number;
  freq_per_week: number;
  start_date?: string;
  progression?: number[];
  /** 计划来源：规则生成/AI 精修等；可自定义字符串 */
  source?: "rule" | "ai" | string;
  /** 是否已经过二次精修 */
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

// —— 单位换算（显示/回写用；底层仍存 cm/kg）——
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

// ====== 组件 ======
export default function Generator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [preview, setPreview] = useState<Plan | null>(null);

  // 等级系统（你之前已接入）
  const { boulderScale: bScale, ropeScale: rScale } = useSettings();

  // ✅ 语言 & 单位：接入全局 context
const { unit } = useSettings();            // 这里只负责单位
const { lang, tt, tr } = useI18N();        // 语言 & 翻译全走 i18n hook

const heightUnit = unit === "metric" ? "cm" : "ft";
const weightUnit = unit === "metric" ? "kg" : "lbs";




  // Step3 用到的负重单位切换（本地 UI 状态）
  const [wpUnit, setWpUnit] = useState<"kg"|"lb">("kg");

  const [form, setForm] = useState<FormState>({
    // Step1
    gender: "男",
    height: 175,
    weight: 70,
    bodyfat: 18,
    freq_per_week: 4,

    // Step2
    climb_freq: "3-4次",
    train_freq: "3-4次",
    rest_days: 2,
    rest_weekdays: [],

    // Step3
    bw_rep_max: 8,
    weighted_pullup_1rm_kg: 20,

    // Step4
    one_arm_hang: 5,
    weaknesses: [], // ✅ 使用稳定 key

    // Step5
    boulder_level: "v4-v5",
    yds_level: "5.11a",
  });

  // 用 function 声明，避免 TSX 对箭头泛型解析问题
  function set<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((s) => ({ ...s, [k]: v }));
  }

  // ---- 校验每一步 ----
  const canNext = useMemo(() => {
    switch (step) {
      case 1:
        return (
          (form.gender === "男" || form.gender === "女") &&
          form.height >= 130 && form.height <= 200 &&
          form.weight >= 30 && form.weight <= 150 &&
          form.bodyfat >= 5 && form.bodyfat <= 45 &&
          form.freq_per_week >= 1 && form.freq_per_week <= 7
        );
      case 2:
        return !!form.climb_freq && !!form.train_freq && !!form.rest_days &&
               form.rest_weekdays.length === form.rest_days;
      case 3:
        return (
          form.bw_rep_max >= 0 && form.bw_rep_max <= 20 &&
          form.weighted_pullup_1rm_kg >= 0 && form.weighted_pullup_1rm_kg <= 100
        );
      case 4:
        return form.one_arm_hang >= 0 && form.one_arm_hang <= 60;
      case 5:
        return !!form.boulder_level && !!form.yds_level;
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
    const cycle_weeks = meta.cycle_weeks || 12;
    const defaultProg =
      cycle_weeks === 24
        ? [0.9,1.0,1.05,1.1,1.15,0.95,1.1,1.15,1.2,1.25,0.95,1.15,
           1.0,1.05,1.1,1.15,0.95,1.1,1.15,1.2,1.25,0.95,1.15,1.2]
        : cycle_weeks === 5
        ? [0.9,1.0,1.1,0.95,1.1]
        : [0.9,1.0,1.05,1.1,1.15,0.95,1.1,1.15,1.2,1.25,0.95,1.15];
    return {
      ...plan,
      meta: {
        cycle_weeks,
        freq_per_week: meta.freq_per_week ?? form.freq_per_week ?? midOfRange(form.train_freq),
        start_date: meta.start_date || todayISO,
        progression: meta.progression && meta.progression.length ? meta.progression : defaultProg,
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

      // 将 weaknesses 稳定 key 转换为当前语言展示文案
      const weaknessLabels = form.weaknesses.map((k) => WEAKNESS_LABELS[lang][k]).join("、");

      const payload = {
        gender: form.gender,
        height: form.height,
        weight: form.weight,
        bodyfat: form.bodyfat,

        // 优先使用 Step1 选择
        freq_per_week: form.freq_per_week,

        // 也把这些上下文给后端
        climb_freq: form.climb_freq,
        train_freq: form.train_freq,
        rest_days: form.rest_days,
        rest_weekdays: form.rest_weekdays,

        // 引体
        bw_pullups: `${form.bw_rep_max} 次 × 5 组`,
        weighted_pullups: `${form.weighted_pullup_1rm_kg} kg 1 次 × 3 组`,
        bw_max_reps: form.bw_rep_max,
        w_max_weight_kg: form.weighted_pullup_1rm_kg,

        // 单臂悬挂 + 弱项
        one_arm_hang: form.one_arm_hang,
        // 人类可读（按当前语言）
        finger_weakness: weaknessLabels,
        // 机器可读（稳定 key）
        weaknesses: form.weaknesses,

        // 攀岩水平
        boulder_level: vScaleToNumeric(form.boulder_level),
        yds_level: form.yds_level,

        cycle_months: 3,
      };

      const { data } = await axios.post(API_JSON, payload, { timeout: 120000 });
      const p: Plan = data.plan;
      const withMeta = ensureMeta(p);
      setPreview(withMeta);
      setStep(5);
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
    Alert.alert("已导入", "训练计划已导入到训练日历");
    router.replace("/calendar");
  };

  // ---- 可复用 UI ----
  const Section = ({
    title, children, onHelp, helpLabel = "？帮助",
  }: {
    title: string;
    children: React.ReactNode;
    onHelp?: () => void;
    helpLabel?: string;
  }) => (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          paddingHorizontal: 16, marginBottom: 6,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "bold" }}>{title}</Text>
        {onHelp && (
          <Pressable
            onPress={onHelp}
            style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#eef2ff" }}
          >
            <Text style={{ color: "#4f46e5", fontWeight: "600" }}>{helpLabel}</Text>
          </Pressable>
        )}
      </View>

      <View
        style={{
          backgroundColor: "#fff", borderRadius: 12, marginHorizontal: 16,
          borderWidth: 1, borderColor: "#e5e7eb",
        }}
      >
        {children}
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
  }) => (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: active ? "#4f46e5" : "#e5e7eb",
        backgroundColor: active ? "#eef2ff" : "white",
        marginRight: 8,
        marginBottom: 8,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text style={{ color: active ? "#4f46e5" : "#111827" }}>{label}</Text>
    </Pressable>
  );

  const Progress = () => (
    <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 16, marginTop: 12 }}>
      {[1, 2, 3, 4, 5].map((n) => (
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
      // Step 1：基础信息（性别 + 身高/体重/体脂）
      case 1:
        return (
          <>
            <Section
              title={tr("基础信息", "Basics")}
            >
              {/* 性别 */}
              <Row>
                <Col label={tr("性别", "Gender")}>
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
          </>
        );

      // Step 2：时间安排（多语言）
      case 2:
        return (
          <>
            <Section title={tr("时间安排", "Scheduling")}>
              <View style={{ padding: 12 }}>
                {/* 每周攀岩天数 */}
                <Text style={{ color: "#6b7280", marginBottom: 6 }}>
                  {tr("每周攀岩天数", "Climbing days / wk")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {(
                    ["1-2次","2-3次","3-4次","4-5次","5-6次","6-7次"] as RangeOpt[]
                  ).map((opt) => (
                    <Chip
                      key={opt}
                      label={rangeLabel(opt, lang)}
                      active={form.climb_freq === opt}
                      onPress={() => set("climb_freq", opt)}
                    />
                  ))}
                </View>

                {/* 每周训练次数 */}
                <Text style={{ color: "#6b7280", marginBottom: 6, marginTop: 6 }}>
                  {tr("每周训练次数", "Training sessions / wk")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {(
                    ["1-2次","2-3次","3-4次","4-5次","5-6次","6-7次"] as RangeOpt[]
                  ).map((opt) => (
                    <Chip
                      key={opt}
                      label={rangeLabel(opt, lang)}
                      active={form.train_freq === opt}
                      onPress={() => set("train_freq", opt)}
                    />
                  ))}
                </View>

                {/* 每周休息日（数量） */}
                <Text style={{ color: "#6b7280", marginBottom: 6, marginTop: 6 }}>
                  {tr("每周休息日（数量）", "Rest days (count)")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {[1,2,3,4,5,6].map((n) => (
                    <Chip
                      key={n}
                      label={tr(`${n} 天`, `${n} days`)}
                      active={form.rest_days === n}
                      onPress={() =>
                        setForm((s) => {
                          const nextDays = n as RestDays;
                          const trimmed = (s.rest_weekdays || []).slice(0, nextDays);
                          return { ...s, rest_days: nextDays, rest_weekdays: trimmed as WeekdayKey[] };
                        })
                      }
                    />
                  ))}
                </View>

                {/* 选择具体休息日（需选满） */}
                <Text style={{ color: "#6b7280", marginBottom: 6, marginTop: 6 }}>
                  {tr("选择具体休息日（需选", "Pick exact rest days (")}
                  {form.rest_days}
                  {tr("天）", " days)")}
                </Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {(WD_ORDER).map((wd) => {
                    const active = form.rest_weekdays.includes(wd);
                    const quotaFull = !active && form.rest_weekdays.length >= form.rest_days;
                    const WD_LABEL = lang === "zh" ? WD_CN : WD_EN;
                    return (
                      <Chip
                        key={wd}
                        label={WD_LABEL[wd]}
                        active={active}
                        disabled={quotaFull}
                        onPress={() => {
                          setForm((s) => {
                            const chosen = new Set<WeekdayKey>(s.rest_weekdays);
                            if (chosen.has(wd)) chosen.delete(wd);
                            else if (s.rest_weekdays.length < s.rest_days) chosen.add(wd);
                            return { ...s, rest_weekdays: Array.from(chosen) as WeekdayKey[] };
                          });
                        }}
                      />
                    );
                  })}
                </View>
              </View>
            </Section>
          </>
        );


      case 3:
        return (
          <>
            <Section title={tr("引体专项能力", "Pull-up Capacity")}>
              <Row>
                <Col label={tr("引体向上单组极限（次）", "BW pull-up max reps")}>
                  <Picker
                    selectedValue={form.bw_rep_max}
                    onValueChange={(v) => set("bw_rep_max", Number(v))}
                  >
                    {Array.from({ length: 21 }, (_, i) => i).map((n) => (
                      <Picker.Item key={n} label={`${n}`} value={n} />
                    ))}
                  </Picker>
                </Col>

                {/* 负重 1RM —— 跟随 settings.unit 展示（kg/lbs），内部统一存 kg */}
                <Col
                  label={
                    `${tr("负重引体单次极限", "Weighted 1RM")}（${
                      unit === "metric" ? "kg" : "lbs"
                    }）`
                  }
                >
                  <Picker
                    selectedValue={
                      unit === "metric"
                        ? (form.weighted_pullup_1rm_kg ?? 0)
                        : kgToLb(form.weighted_pullup_1rm_kg ?? 0)
                    }
                    onValueChange={(v) => {
                      const val = Number(v);
                      // 始终以 kg 存储
                      if (unit === "metric") {
                        set("weighted_pullup_1rm_kg", val);
                      } else {
                        set("weighted_pullup_1rm_kg", lbToKg(val));
                      }
                    }}
                  >
                    {(unit === "metric"
                      ? Array.from({ length: 101 }, (_, i) => i)      // 0–100 kg
                      : Array.from({ length: 221 }, (_, i) => i)      // 0–220 lbs
                    ).map((n) => (
                      <Picker.Item key={n} label={`${n}`} value={n} />
                    ))}
                  </Picker>
                </Col>
              </Row>

              <Row>
                <Col label={tr("单臂悬挂（秒）", "One-arm hang (s)")}>
                  <Picker
                    selectedValue={form.one_arm_hang}
                    onValueChange={(v) => set("one_arm_hang", Number(v))}
                  >
                    {Array.from({ length: 61 }, (_, i) => i).map((n) => (
                      <Picker.Item key={n} label={`${n}`} value={n} />
                    ))}
                  </Picker>
                </Col>
              </Row>
            </Section>
          </>
        );


      // Step 4：弱项 + 水平评估
      case 4:
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
                        set("weaknesses", active
                          ? form.weaknesses.filter((x) => x !== k)
                          : [...form.weaknesses, k]
                        );
                      }}
                      style={{
                        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
                        borderWidth: 1, borderColor: active ? "#4f46e5" : "#e5e7eb",
                        backgroundColor: active ? "#eef2ff" : "white",
                      }}
                    >
                      <Text style={{ color: active ? "#4f46e5" : "#111827" }}>{label}</Text>
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
          </>
        );

      // Step 5：预览
      case 5:
        return (
          <>
            <Section title={tr("训练计划预览","Plan Preview")}>
              <ScrollView style={{ maxHeight: 420, padding: 12 }}>
                {preview ? (
                  <View>
                    <Text style={{ marginBottom: 8 }}>
                      {tr("开始日期","Start")}:{preview.meta?.start_date} · {tr("周期","Cycle")}:{preview.meta?.cycle_weeks}{tr("周"," wks")}
                    </Text>
                    {!!preview.meta?.source && (
                      <Text style={{ marginBottom: 8, color: "#6b7280" }}>
                        {tr("计划来源：","Source: ")}{preview.meta?.source === "ai" ? tr("AI 精修版","AI-refined") : tr("规则生成","Rule-based")}
                      </Text>
                    )}
                    {!!preview.meta?.progression && (
                      <Text style={{ marginBottom: 8 }}>
                        {tr("每周强度：","Weekly load: ")}
                        {preview.meta.progression
                          .map((p, i) => `${tr("第","W")}${i + 1}${tr("周","")} ${Math.round(p * 100)}%`)
                          .join(" / ")}
                      </Text>
                    )}

                    {preview.weeks?.length ? (
                      <View style={{ marginBottom: 10 }}>
                        <Text style={{ fontWeight: "bold", marginBottom: 6 }}>
                          {tr("第 1 周（示例）","Week 1 (sample)")}
                        </Text>

                        {WEEK_KEYS.map((wkey) => {
                          const d = preview.weeks![0].days[wkey as keyof Plan["days"]];
                          if (!d) return null;
                          return (
                            <View key={wkey} style={{ marginBottom: 10 }}>
                              <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                                {wkey} · {tt(d.title)}
                              </Text>

                              {d.items.map((it, idx) => (
                                <Text key={idx} style={{ color: "#374151", marginLeft: 8 }}>
                                  {"• " + tt(it.label) + tr(":", ":") + tt(it.target)}
                                </Text>
                              ))}
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      WEEK_KEYS.map((wkey) => {
                        const d = preview.days[wkey];
                        if (!d) return null;
                        return (
                          <View key={wkey} style={{ marginBottom: 10 }}>
                            <Text style={{ fontWeight: "bold", marginBottom: 4 }}>
                              {wkey} · {tt(d.title)}
                            </Text>

                            {d.items.map((it, idx) => (
                              <Text key={idx} style={{ color: "#374151", marginLeft: 8 }}>
                                {"• " + tt(it.label) + tr(":", ":") + tt(it.target)}
                              </Text>
                            ))}
                          </View>
                        );
                      })
                    )}

                    {!!preview.notes?.length && (
                      <View style={{ marginTop: 8 }}>
                        <Text style={{ fontWeight: "bold" }}>{tr("备注","Notes")}</Text>
                        {preview.notes!.map((n, i) => (
                          <Text key={i} style={{ color: "#6b7280" }}>• {tt(n)}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ) : (
                  <Text style={{ color: "#9ca3af" }}>{tr("暂无预览，请点“生成预览”。","No preview. Tap 'Generate plan'.")}</Text>
                )}
              </ScrollView>
            </Section>
          </>
        );
    }
  };

  // ---- 帮助抽屉 ----
  const sheetRef = useRef<BottomSheet>(null);
  const [help, setHelp] = useState<{ title: string; content: string } | null>(null);
  const snapPoints = useMemo(() => ["45%", "85%"], []);
  const openHelp = (h: { title: string; content: string }) => {
    setHelp(h);
    requestAnimationFrame(() => sheetRef.current?.snapToIndex(0));
  };
  const closeHelp = () => sheetRef.current?.close();

  return (
    <SafeAreaView style={{ flex: 1 }}>
      {/* 标题（多语言） */}
      <View style={{ paddingHorizontal: 16, paddingTop: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 22, fontWeight: "bold" }}>
          {tr("攀岩训练计划生成器", "Climbing Training Plan Generator")}
        </Text>
      </View>

      <Progress />

      {/* 内容区 */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
      >
        <ScrollView style={{ flex: 1, paddingTop: 8, paddingBottom: 72 }} contentContainerStyle={{ paddingBottom: 80 }}>
          <StepContent />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 底部操作栏 */}
      {step < 5 ? (
        <View
          style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.95)",
            borderTopWidth: 1, borderColor: "#e5e7eb",
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
          }}
        >
          <Pressable
            onPress={() => setStep((s) => (Math.max(1, (s as number) - 1) as Step))}
            style={{ paddingVertical: 15, paddingHorizontal: 24, borderRadius: 10, backgroundColor: "#f3f4f6" }}
          >
            <Text style={{ color: "#111827" }}>{tr("上一步","Back")}</Text>
          </Pressable>

          <Pressable
            onPress={() => { if (canNext) setStep((s) => ((s + 1) as Step)); }}
            style={{ paddingVertical: 15, paddingHorizontal: 24, borderRadius: 10, backgroundColor: canNext ? "#4f46e5" : "#a5b4fc" }}
          >
            <Text style={{ color: "white" }}>{canNext ? tr("下一步","Next") : tr("请先完成选择","Complete required fields")}</Text>
          </Pressable>
        </View>
      ) : (
        <View
          style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            paddingHorizontal: 16, paddingVertical: 12, backgroundColor: "rgba(255,255,255,0.95)",
            borderTopWidth: 1, borderColor: "#e5e7eb",
            flexDirection: "row", justifyContent: "space-between", alignItems: "center",
            gap: 7,
          }}
        >
          <Pressable
            onPress={() => setStep(4)}
            disabled={loading}
            style={{
              paddingVertical: 15, paddingHorizontal: 24,
              borderRadius: 10, backgroundColor: "#f3f4f6", opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "#111827" }}>{tr("上一步","Back")}</Text>
          </Pressable>

          <Pressable
            onPress={requestAndPreview}
            disabled={loading}
            style={{
              paddingVertical: 15, paddingHorizontal: 24,
              borderRadius: 10, backgroundColor: "#4f46e5",
              opacity: loading ? 0.6 : 1,
            }}
          >
            <Text style={{ color: "white" }}>
              {loading ? tr("生成中…","Generating…") : tr("生成训练计划","Generate plan")}
            </Text>
          </Pressable>

          <Pressable
            onPress={confirmImport}
            disabled={!preview || loading}
            style={{
              paddingVertical: 15, paddingHorizontal: 24,
              borderRadius: 10,
              backgroundColor: !preview || loading ? "#a5b4fc" : "#16a34a",
            }}
          >
            <Text style={{ color: "white" }}>{tr("确认导入到训练日历","Import to calendar")}</Text>
          </Pressable>
        </View>
      )}

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
        <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
          {!!help && (
            <>
              <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>{help.title}</Text>
              <Text style={{ color: "#374151", lineHeight: 20 }}>{help.content}</Text>
            </>
          )}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

