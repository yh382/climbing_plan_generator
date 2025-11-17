import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useUserStore } from "@/store/useUserStore";
import { inToCm, lbToKg, cmToIn, kgToLb } from "@lib/units";
import { useProfileStore, Profile } from "../../store/useProfileStore";

export function AnthropometricsCard() {
  const { user } = useUserStore();
  const { profile, updateMe, saving } = useProfileStore();
  const a = profile?.anthropometrics ?? {};
  const isImperial = user?.units === "imperial";

  const [height, setHeight] = useState<string>(isImperial ? Math.round(cmToIn(a.height_cm || 0)).toString() : (a.height_cm ?? "").toString());
  const [weight, setWeight] = useState<string>(isImperial ? Math.round(kgToLb(a.weight_kg || 0)).toString() : (a.weight_kg ?? "").toString());
  const [level, setLevel]   = useState<string>(a.level ?? "");

  const onSave = async () => {
    const partial: Partial<Profile> = {
      anthropometrics: {
        height_cm: isImperial ? inToCm(Number(height)) : Number(height),
        weight_kg: isImperial ? lbToKg(Number(weight)) : Number(weight),
        level,
      },
    };
    await updateMe(partial);
  };

  return (
    <View style={{ marginTop: 16, padding: 16 }}>
      <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>体测</Text>
      <View style={{ gap: 12 }}>
        <Field label={`身高 (${isImperial ? "in" : "cm"})`} value={height} onChangeText={setHeight} />
        <Field label={`体重 (${isImperial ? "lb" : "kg"})`} value={weight} onChangeText={setWeight} />
        <Field label="等级（展示）" value={level} onChangeText={setLevel} placeholder="V5 / 5.12-" />
        <Pressable onPress={onSave} disabled={saving} style={{ backgroundColor: "#111827", padding: 12, borderRadius: 10, alignItems: "center" }}>
          <Text style={{ color: "white", fontWeight: "600" }}>{saving ? "保存中..." : "保存"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Field(props: { label: string; value?: string; placeholder?: string; onChangeText: (v: string) => void }) {
  return (
    <View>
      <Text style={{ color: "#6b7280", marginBottom: 6 }}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10 }}
      />
    </View>
  );
}
