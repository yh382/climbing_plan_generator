import React, { useMemo, useRef, useState } from "react";
import {
  Pressable,
  Text,
  TextInput,
  View,
  Keyboard,
  Platform,
} from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Section, Chip } from "../FormPrimitives";
import { formatFtIn, kgToLb, lbToKg } from "../../utils/conversions";
import type { FormState, Gender } from "../../types";

type FieldKey =
  | "gender"
  | "height"
  | "weight"
  | "bodyfat"
  | "grip_kg"
  | "plank_sec"
  | "bw_rep_max";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function isNumberLike(s: string) {
  return /^\s*\d+(?:\.\d+)?\s*$/.test(s);
}

function FieldRow({
  label,
  value,
  placeholder,
  onPress,
  rightHint,
  danger,
}: {
  label: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  rightHint?: string;
  danger?: boolean;
}) {
  const showPlaceholder = !value;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 18,
        backgroundColor: pressed ? "#F3F4F6" : "#FFFFFF",
        borderWidth: 0.6,
        borderColor: danger ? "#FCA5A5" : "#E5E7EB",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
      })}
      hitSlop={8}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text style={{ fontSize: 13, color: "#6B7280", marginBottom: 6 }}>
          {label}
        </Text>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "800",
            color: showPlaceholder ? "#9CA3AF" : "#111827",
          }}
          numberOfLines={1}
        >
          {showPlaceholder ? placeholder ?? "—" : value}
        </Text>
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {!!rightHint && (
          <Text style={{ fontSize: 13, color: "#9CA3AF" }}>{rightHint}</Text>
        )}
        <Text style={{ fontSize: 20, color: "#9CA3AF" }}>›</Text>
      </View>
    </Pressable>
  );
}

export function Step1Basics({
  form,
  setField,
  tr,
  lang,
  unit,
  openHelp,
}: {
  form: FormState;
  setField: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  tr: (zh: string, en: string) => string;
  lang: "zh" | "en";
  unit: "metric" | "imperial";
  openHelp: (h: { title: string; content: string }) => void;
}) {
  const heightUnit = unit === "metric" ? "cm" : "ft";
  const weightUnit = unit === "metric" ? "kg" : "lbs";

  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["42%", "82%"], []);
  const [activeField, setActiveField] = useState<FieldKey | null>(null);
  const [draft, setDraft] = useState<{ a?: string; b?: string }>({});

  const openField = (k: FieldKey) => {
    Keyboard.dismiss();
    setActiveField(k);

    if (k === "gender") setDraft({ a: form.gender ?? "" });

    if (k === "height") {
      if (form.height == null) setDraft(unit === "metric" ? { a: "" } : { a: "", b: "" });
      else if (unit === "metric") setDraft({ a: String(form.height) });
      else {
        const totalIn = Math.round(form.height / 2.54);
        const ft = Math.floor(totalIn / 12);
        const inch = totalIn - ft * 12;
        setDraft({ a: String(ft), b: String(inch) });
      }
    }

    if (k === "weight") {
      if (form.weight == null) setDraft({ a: "" });
      else setDraft({ a: String(weightUnit === "kg" ? form.weight : kgToLb(form.weight)) });
    }

    if (k === "bodyfat") setDraft({ a: form.bodyfat == null ? "" : String(form.bodyfat) });
    if (k === "grip_kg") setDraft({ a: form.grip_kg == null ? "" : String(form.grip_kg) });
    if (k === "plank_sec") setDraft({ a: form.plank_sec == null ? "" : String(form.plank_sec) });
    if (k === "bw_rep_max") setDraft({ a: String(form.bw_rep_max ?? 0) });

    requestAnimationFrame(() => sheetRef.current?.snapToIndex(0));
  };

  const closeSheet = () => {
    sheetRef.current?.close();
    setActiveField(null);
  };

  const clearActive = () => {
    const k = activeField;
    if (!k) return;

    if (k === "gender") setField("gender", null as any);
    if (k === "height") setField("height", null as any);
    if (k === "weight") setField("weight", null as any);
    if (k === "bodyfat") setField("bodyfat", null as any);
    if (k === "grip_kg") setField("grip_kg", null as any);
    if (k === "plank_sec") setField("plank_sec", null as any);

    closeSheet();
  };

  const applyDraft = () => {
    const k = activeField;
    if (!k) return;

    if (k === "gender") {
      const v = (draft.a as Gender) || null;
      setField("gender", (v === "男" || v === "女" ? v : null) as any);
      closeSheet();
      return;
    }

    if (k === "height") {
      if (unit === "metric") {
        if (!draft.a || !isNumberLike(draft.a)) return;
        const cm = clamp(Math.round(Number(draft.a)), 120, 230);
        setField("height", cm as any);
        closeSheet();
        return;
      }
      if (!draft.a || !isNumberLike(draft.a)) return;
      const ft = clamp(Math.round(Number(draft.a)), 3, 7);
      const inch = clamp(Math.round(Number(draft.b || "0")), 0, 11);
      const cm = clamp(Math.round((ft * 12 + inch) * 2.54), 120, 230);
      setField("height", cm as any);
      closeSheet();
      return;
    }

    if (k === "weight") {
      if (!draft.a || !isNumberLike(draft.a)) return;
      const raw = Number(draft.a);
      if (weightUnit === "kg") setField("weight", clamp(Math.round(raw), 30, 200) as any);
      else {
        const lb = clamp(Math.round(raw), 66, 440);
        setField("weight", lbToKg(lb) as any);
      }
      closeSheet();
      return;
    }

    if (k === "bodyfat") {
      if (!draft.a || !isNumberLike(draft.a)) return;
      setField("bodyfat", clamp(Math.round(Number(draft.a)), 5, 45) as any);
      closeSheet();
      return;
    }

    if (k === "grip_kg") {
      if (!draft.a || !isNumberLike(draft.a)) return;
      setField("grip_kg", clamp(Math.round(Number(draft.a)), 10, 100) as any);
      closeSheet();
      return;
    }

    if (k === "plank_sec") {
      if (!draft.a || !isNumberLike(draft.a)) return;
      setField("plank_sec", clamp(Math.round(Number(draft.a)), 10, 600) as any);
      closeSheet();
      return;
    }

    closeSheet();
  };

  const sheetTitle = useMemo(() => {
    switch (activeField) {
      case "gender": return tr("选择性别", "Select sex");
      case "height": return tr("填写身高", "Enter height");
      case "weight": return tr("填写体重", "Enter weight");
      case "bodyfat": return tr("填写体脂率", "Enter body fat");
      case "grip_kg": return tr("填写握力", "Enter grip strength");
      case "plank_sec": return tr("填写平板支撑", "Enter plank");
      default: return "";
    }
  }, [activeField, tr]);

  const canApply = useMemo(() => {
    if (!activeField) return false;
    if (activeField === "gender") return draft.a === "男" || draft.a === "女";
    if (activeField === "height") {
      if (unit === "metric") return !!draft.a && isNumberLike(draft.a);
      return !!draft.a && isNumberLike(draft.a) && (!draft.b || isNumberLike(draft.b));
    }
    return !!draft.a && isNumberLike(draft.a);
  }, [activeField, draft, unit]);

  const basicsMissing =
    form.gender == null || form.height == null || form.weight == null || form.bodyfat == null;

  const genderLabel =
    form.gender ? (form.gender === "男" ? tr("男", "Male") : tr("女", "Female")) : "";
  const heightLabel =
    form.height == null ? "" : unit === "metric" ? `${form.height}` : formatFtIn(form.height);
  const weightLabel =
    form.weight == null ? "" : weightUnit === "kg" ? `${form.weight}` : `${kgToLb(form.weight)}`;
  const bodyfatLabel = form.bodyfat == null ? "" : `${form.bodyfat}`;

  return (
    <>
      <Section title={tr("基础信息", "Basics")}>
        {basicsMissing && (
          <View
            style={{
              marginHorizontal: 12,
              marginBottom: 10,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 14,
              backgroundColor: "#FFFBEB",
              borderWidth: 0.6,
              borderColor: "#FDE68A",
            }}
          >
            <Text style={{ color: "#92400E", fontSize: 12, lineHeight: 16 }}>
              {tr("请完成 4 项基础信息后再进入下一步。", "Complete the 4 basics to continue.")}
            </Text>
          </View>
        )}

        <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
          <FieldRow
            label={tr("性别", "Sex")}
            value={genderLabel}
            placeholder={tr("请选择", "Select")}
            onPress={() => openField("gender")}
            danger={form.gender == null}
          />
          <FieldRow
            label={tr(`身高（${heightUnit}）`, `Height (${heightUnit})`)}
            value={heightLabel}
            placeholder={tr("请输入", "Enter")}
            onPress={() => openField("height")}
            rightHint={unit === "metric" ? "120–230" : "3–7 ft"}
            danger={form.height == null}
          />
          <FieldRow
            label={tr(`体重（${weightUnit}）`, `Weight (${weightUnit})`)}
            value={weightLabel}
            placeholder={tr("请输入", "Enter")}
            onPress={() => openField("weight")}
            rightHint={unit === "metric" ? "30–200" : "66–440"}
            danger={form.weight == null}
          />
          <FieldRow
            label={tr("体脂率（%）", "Body fat (%)")}
            value={bodyfatLabel}
            placeholder={tr("请输入", "Enter")}
            onPress={() => openField("bodyfat")}
            rightHint="5–45"
            danger={form.bodyfat == null}
          />
        </View>
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
        <View style={{ paddingHorizontal: 12, paddingBottom: 6 }}>
          <FieldRow
            label={tr("握力（kg）", "Grip strength (kg)")}
            value={form.grip_kg == null ? "" : String(form.grip_kg)}
            placeholder={tr("可选 · 未知", "Optional · Unknown")}
            onPress={() => openField("grip_kg")}
          />
          <View style={{ flexDirection: "row", marginTop: -4, marginBottom: 10, gap: 8 }}>
            <Chip
              label={tr("未知", "Unknown")}
              active={form.grip_kg === null}
              onPress={() => setField("grip_kg", (form.grip_kg === null ? 30 : null) as any)}
            />
          </View>

          <FieldRow
            label={tr("平板支撑（秒）", "Plank (sec)")}
            value={form.plank_sec == null ? "" : String(form.plank_sec)}
            placeholder={tr("可选", "Optional")}
            onPress={() => openField("plank_sec")}
          />
        </View>
      </Section>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        keyboardBehavior={Platform.OS === "ios" ? "interactive" : "extend"}
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
        onClose={() => setActiveField(null)}
      >
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: "#111" }}>{sheetTitle}</Text>
            <Pressable onPress={closeSheet} hitSlop={8}>
              <Text style={{ fontSize: 18, color: "#9CA3AF" }}>✕</Text>
            </Pressable>
          </View>

          {activeField === "gender" ? (
            <View style={{ flexDirection: "row", gap: 10, paddingBottom: 8 }}>
              <Chip label={tr("男", "Male")} active={draft.a === "男"} onPress={() => setDraft({ a: "男" })} />
              <Chip label={tr("女", "Female")} active={draft.a === "女"} onPress={() => setDraft({ a: "女" })} />
            </View>
          ) : activeField === "height" && unit === "imperial" ? (
            <View style={{ flexDirection: "row", gap: 10, paddingBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 6 }}>{tr("英尺", "ft")}</Text>
                <TextInput
                  value={draft.a ?? ""}
                  onChangeText={(t) => setDraft((s) => ({ ...s, a: t.replace(/[^0-9]/g, "") }))}
                  keyboardType="number-pad"
                  placeholder="5"
                  style={{ borderWidth: 0.6, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, fontWeight: "700", color: "#111" }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 6 }}>{tr("英寸", "in")}</Text>
                <TextInput
                  value={draft.b ?? ""}
                  onChangeText={(t) => setDraft((s) => ({ ...s, b: t.replace(/[^0-9]/g, "") }))}
                  keyboardType="number-pad"
                  placeholder="10"
                  style={{ borderWidth: 0.6, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, fontWeight: "700", color: "#111" }}
                />
              </View>
            </View>
          ) : (
            <View style={{ paddingBottom: 8 }}>
              <Text style={{ color: "#6B7280", fontSize: 12, marginBottom: 6 }}>
                {activeField === "weight"
                  ? tr(`单位：${weightUnit}`, `Unit: ${weightUnit}`)
                  : activeField === "height"
                    ? tr(`单位：${heightUnit}`, `Unit: ${heightUnit}`)
                    : activeField === "bodyfat"
                      ? tr("单位：%", "Unit: %")
                      : activeField === "plank_sec"
                        ? tr("单位：秒", "Unit: sec")
                        : activeField === "grip_kg"
                          ? tr("单位：kg", "Unit: kg")
                          : ""}
              </Text>
              <TextInput
                value={draft.a ?? ""}
                onChangeText={(t) => setDraft({ a: t.replace(/[^0-9.]/g, "") })}
                keyboardType={Platform.OS === "ios" ? "numbers-and-punctuation" : "numeric"}
                placeholder={tr("输入数字", "Enter a number")}
                style={{ borderWidth: 0.6, borderColor: "#E5E7EB", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, fontWeight: "700", color: "#111" }}
              />
            </View>
          )}

          <View style={{ flexDirection: "row", gap: 10, paddingTop: 6 }}>
            <Pressable
              onPress={clearActive}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: pressed ? "#F3F4F6" : "#FFFFFF",
                borderWidth: 0.8,
                borderColor: "#E5E7EB",
              })}
            >
              <Text style={{ fontWeight: "800", color: "#6B7280" }}>{tr("清空", "Clear")}</Text>
            </Pressable>

            <Pressable
              onPress={applyDraft}
              disabled={!canApply}
              style={({ pressed }) => ({
                flex: 1,
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: !canApply ? "#E5E7EB" : "#111827",
                opacity: !canApply ? 0.6 : pressed ? 0.9 : 1,
              })}
            >
              <Text style={{ fontWeight: "900", color: "#FFF" }}>{tr("完成", "Done")}</Text>
            </Pressable>
          </View>
        </View>
      </BottomSheet>
    </>
  );
}
