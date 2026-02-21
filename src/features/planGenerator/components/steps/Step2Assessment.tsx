import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { Section, Row, Col, Chip } from "../FormPrimitives";
import type { FormState, WeaknessKey, VScaleOpt } from "../../types";
import { FONT_RANGE_MAP, YDS_TO_FRENCH, vScaleToNumeric } from "../../utils/grades";

const WEAKNESS_OPTIONS: Array<{ key: WeaknessKey; zh: string; en: string }> = [
  { key: "fingerStrength", zh: "指力", en: "Finger strength" },
  { key: "power", zh: "爆发力", en: "Power" },
  { key: "endurance", zh: "耐力", en: "Endurance" },
  { key: "footwork", zh: "脚法", en: "Footwork" },
];

const V_OPTIONS: VScaleOpt[] = [
  "v1-v2",
  "v2-v3",
  "v3-v4",
  "v4-v5",
  "v5-v6",
  "v6-v7",
  "v7-v8",
  "v8-v9",
  "v9以上",
];

const YDS_OPTIONS = [
  "5.6",
  "5.7",
  "5.8",
  "5.9",
  "5.10a",
  "5.10b",
  "5.10c",
  "5.10d",
  "5.11a",
  "5.11b",
  "5.11c",
  "5.11d",
  "5.12a",
  "5.12b",
  "5.12c",
  "5.12d",
  "5.13a",
  "5.13b",
  "5.13c",
  "5.13d",
  "5.14a",
  "5.14b",
  "5.14c",
  "5.14d",
];

export function Step2Assessment({
  form,
  setField,
  tr,
  openHelp,
}: {
  form: FormState;
  setField: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  tr: (zh: string, en: string) => string;
  openHelp: (h: { title: string; content: string }) => void;
}) {
  const selectedWeakness = useMemo(() => new Set(form.weaknesses ?? []), [form.weaknesses]);

  const toggleWeakness = (k: WeaknessKey) => {
    const prev = new Set(form.weaknesses ?? []);
    if (prev.has(k)) prev.delete(k);
    else prev.add(k);
    setField("weaknesses", Array.from(prev) as any);
  };

  const boulderLabel = useMemo(() => {
    const vNum = vScaleToNumeric(form.boulder_level);
    const fontRange = FONT_RANGE_MAP[form.boulder_level];
    return `${form.boulder_level.toUpperCase()} (${vNum}) • ${fontRange}`;
  }, [form.boulder_level]);

  const routeLabel = useMemo(() => {
    const fr = YDS_TO_FRENCH[form.yds_level] ?? "";
    return fr ? `${form.yds_level} • ${fr}` : form.yds_level;
  }, [form.yds_level]);

  return (
    <>
      <Section
        title={tr("当前水平", "Current level")}
        onHelp={() =>
          openHelp({
            title: tr("如何选择等级？", "How to choose grades?"),
            content: tr(
              "选择你最近 2–3 个月最稳定的水平：\n- 抱石：你能较稳定红点/完成的等级区间\n- 难度：你能较稳定红点的难度区间\n如果你只练一个项目，另一个可以选偏保守的等级。",
              "Pick your most consistent level in the last 2–3 months:\n- Boulder: grades you can reliably send\n- Route: grades you can reliably redpoint\nIf you only climb one style, choose a conservative value for the other."
            ),
          })
        }
      >
        <Row>
          <Col label={tr("抱石等级", "Boulder grade")}>
            <Picker
              selectedValue={form.boulder_level}
              onValueChange={(v) => setField("boulder_level", v as any)}
            >
              {V_OPTIONS.map((v) => (
                <Picker.Item key={v} label={v.toUpperCase()} value={v} />
              ))}
            </Picker>
            <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>{boulderLabel}</Text>
            </View>
          </Col>

          <Col label={tr("难度等级", "Route grade")}>
            <Picker
              selectedValue={form.yds_level}
              onValueChange={(v) => setField("yds_level", String(v) as any)}
            >
              {YDS_OPTIONS.map((g) => (
                <Picker.Item key={g} label={g} value={g} />
              ))}
            </Picker>
            <View style={{ paddingHorizontal: 12, paddingBottom: 8 }}>
              <Text style={{ color: "#6b7280", fontSize: 12 }}>{routeLabel}</Text>
            </View>
          </Col>
        </Row>
      </Section>

      <Section
        title={tr("目标短板", "Weakness focus")}
        onHelp={() =>
          openHelp({
            title: tr("如何选短板？", "How to pick weaknesses?"),
            content: tr(
              "最多选择 1–2 个最想提升的方向。\n建议依据：卡住的动作类型/掉点原因（指力不够、爆发不足、续航差、脚法/技术）。",
              "Pick up to 1–2 areas you most want to improve.\nUse your recent failures as hints: finger strength, power, endurance, or technique/footwork."
            ),
          })
        }
      >
        <View style={{ paddingHorizontal: 12, paddingTop: 8, flexDirection: "row", flexWrap: "wrap" }}>
          {WEAKNESS_OPTIONS.map((o) => (
            <Chip
              key={o.key}
              label={tr(o.zh, o.en)}
              active={selectedWeakness.has(o.key)}
              onPress={() => toggleWeakness(o.key)}
            />
          ))}
        </View>
        <View style={{ height: 8 }} />
      </Section>

      <Section
        title={tr("强度数据（可选）", "Optional strength metrics")}
        onHelp={() =>
          openHelp({
            title: tr("这些数据用来做什么？", "What are these for?"),
            content: tr(
              "这些数据用于更精细地匹配训练负荷。\n如果你不确定，可以保持默认值或填一个大概范围。",
              "These metrics help calibrate training load.\nIf unsure, keep defaults or enter rough estimates."
            ),
          })
        }
      >
        <Row>
          <Col label={tr("负重引体 1RM（kg）", "Weighted pull-up 1RM (kg)")}>
            <Picker
              selectedValue={form.weighted_pullup_1rm_kg}
              onValueChange={(v) => setField("weighted_pullup_1rm_kg", Number(v) as any)}
            >
              {Array.from({ length: 81 }, (_, i) => i).map((n) => (
                <Picker.Item key={n} label={`${n}`} value={n} />
              ))}
            </Picker>
          </Col>

          <Col label={tr("单臂悬挂（秒）", "One-arm hang (sec)")}>
            <Picker selectedValue={form.one_arm_hang} onValueChange={(v) => setField("one_arm_hang", Number(v) as any)}>
              {Array.from({ length: 121 }, (_, i) => i).map((n) => (
                <Picker.Item key={n} label={`${n}`} value={n} />
              ))}
            </Picker>
          </Col>
        </Row>
      </Section>
    </>
  );
}
