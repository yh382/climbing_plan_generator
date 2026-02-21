import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Picker } from "@react-native-picker/picker";

import { Section, Row, Col, Chip } from "../FormPrimitives";
import type { FormState, RangeOpt, WeekdayKey } from "../../types";

const RANGE_OPTS: RangeOpt[] = ["1-2次", "2-3次", "3-4次", "4-5次", "5-6次", "6-7次"];
const WEEKDAYS: Array<{ k: WeekdayKey; zh: string; en: string }> = [
  { k: "Mon", zh: "周一", en: "Mon" },
  { k: "Tue", zh: "周二", en: "Tue" },
  { k: "Wed", zh: "周三", en: "Wed" },
  { k: "Thu", zh: "周四", en: "Thu" },
  { k: "Fri", zh: "周五", en: "Fri" },
  { k: "Sat", zh: "周六", en: "Sat" },
  { k: "Sun", zh: "周日", en: "Sun" },
];

const STRETCH_BANDS: Array<{ v: FormState["stretching_freq_band"]; zh: string; en: string }> = [
  { v: "0", zh: "0 次", en: "0" },
  { v: "1-2", zh: "1-2 次", en: "1-2×" },
  { v: "3-4", zh: "3-4 次", en: "3-4×" },
  { v: "5-7", zh: "5-7 次", en: "5-7×" },
];

export function Step3SchedulingRecovery({
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
  const restSet = useMemo(() => new Set(form.rest_weekdays ?? []), [form.rest_weekdays]);

  const toggleRestDay = (k: WeekdayKey) => {
    const next = new Set(form.rest_weekdays ?? []);
    if (next.has(k)) next.delete(k);
    else next.add(k);
    setField("rest_weekdays", Array.from(next) as any);
  };

  const painChip = (labelZh: string, labelEn: string, value: 0|1|2|3, active: number, onPress: () => void) => (
    <Chip label={tr(labelZh, labelEn)} active={active === value} onPress={onPress} />
  );

  return (
    <>
      <Section
        title={tr("时间安排", "Scheduling")}
        onHelp={() =>
          openHelp({
            title: tr("如何设置频率？", "How to set frequency?"),
            content: tr(
              "按你长期能坚持的频率填写。训练计划的价值在于稳定执行。\n攀爬/训练频率都可以填区间，系统会做平衡。",
              "Enter a frequency you can sustain long-term. Consistency matters.\nYou can choose ranges; the system will balance climbing and training."
            ),
          })
        }
      >
        <Row>
          <Col label={tr("每周攀爬", "Climb per week")}>
            <Picker selectedValue={form.climb_freq} onValueChange={(v) => setField("climb_freq", v as any)}>
              {RANGE_OPTS.map((o) => (
                <Picker.Item key={o} label={o} value={o} />
              ))}
            </Picker>
          </Col>

          <Col label={tr("每周训练", "Train per week")}>
            <Picker selectedValue={form.train_freq} onValueChange={(v) => setField("train_freq", v as any)}>
              {RANGE_OPTS.map((o) => (
                <Picker.Item key={o} label={o} value={o} />
              ))}
            </Picker>
          </Col>
        </Row>

        <Row>
          <Col label={tr("周期长度（周）", "Cycle length (weeks)")}>
            <Picker selectedValue={form.cycle_weeks} onValueChange={(v) => setField("cycle_weeks", Number(v) as any)}>
              {Array.from({ length: 13 }, (_, i) => 4 + i).map((w) => (
                <Picker.Item key={w} label={`${w}`} value={w} />
              ))}
            </Picker>
          </Col>

          <Col label={tr("每周最少休息天数", "Min rest days / week")}>
            <Picker selectedValue={form.rest_days} onValueChange={(v) => setField("rest_days", Number(v) as any)}>
              {[1, 2, 3, 4, 5, 6].map((d) => (
                <Picker.Item key={d} label={`${d}`} value={d} />
              ))}
            </Picker>
          </Col>
        </Row>
      </Section>

      <Section
        title={tr("休息日偏好（可选）", "Preferred rest weekdays (optional)")}
        onHelp={() =>
          openHelp({
            title: tr("为什么要选休息日？", "Why rest weekdays?"),
            content: tr(
              "如果你有固定工作/课程安排，可以选择更常休息的日子，让生成计划更贴合日程。\n不选也可以。",
              "If you have a fixed schedule, choose the days you prefer to rest so the plan fits better.\nYou can leave it empty."
            ),
          })
        }
      >
        <View style={{ paddingHorizontal: 12, paddingTop: 10, flexDirection: "row", flexWrap: "wrap" }}>
          {WEEKDAYS.map((d) => (
            <Chip key={d.k} label={tr(d.zh, d.en)} active={restSet.has(d.k)} onPress={() => toggleRestDay(d.k)} />
          ))}
        </View>
        <View style={{ height: 8 }} />
      </Section>

      <Section
        title={tr("恢复与伤痛（0-3）", "Recovery & pain (0-3)")}
        onHelp={() =>
          openHelp({
            title: tr("如何填写疼痛等级？", "How to rate pain?"),
            content: tr(
              "0=无，1=轻微不影响训练，2=影响训练质量，3=需要休息/就医。\n请如实填写，系统会降低相应负荷。",
              "0=none, 1=mild no impact, 2=affects training quality, 3=stop/rest/seek care.\nBe honest so load can be adjusted."
            ),
          })
        }
      >
        <View style={{ paddingHorizontal: 12, paddingTop: 10 }}>
          <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 6 }}>
            {tr("手指", "Finger")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {[0, 1, 2, 3].map((v) =>
              painChip(` ${v}`, ` ${v}`, v as any, form.pain_finger_0_3, () => setField("pain_finger_0_3", v as any))
            )}
          </View>

          <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 6, marginTop: 10 }}>
            {tr("肩", "Shoulder")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {[0, 1, 2, 3].map((v) =>
              painChip(` ${v}`, ` ${v}`, v as any, form.pain_shoulder_0_3, () => setField("pain_shoulder_0_3", v as any))
            )}
          </View>

          <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 6, marginTop: 10 }}>
            {tr("肘", "Elbow")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {[0, 1, 2, 3].map((v) =>
              painChip(` ${v}`, ` ${v}`, v as any, form.pain_elbow_0_3, () => setField("pain_elbow_0_3", v as any))
            )}
          </View>

          <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 6, marginTop: 10 }}>
            {tr("腕", "Wrist")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {[0, 1, 2, 3].map((v) =>
              painChip(` ${v}`, ` ${v}`, v as any, form.pain_wrist_0_3, () => setField("pain_wrist_0_3", v as any))
            )}
          </View>

          <Text style={{ color: "#6b7280", fontSize: 12, marginBottom: 6, marginTop: 14 }}>
            {tr("拉伸频率", "Stretching frequency")}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {STRETCH_BANDS.map((b) => (
              <Chip
                key={b.v}
                label={tr(b.zh, b.en)}
                active={form.stretching_freq_band === b.v}
                onPress={() => setField("stretching_freq_band", b.v as any)}
              />
            ))}
          </View>
        </View>

        <View style={{ height: 8 }} />
      </Section>
    </>
  );
}
