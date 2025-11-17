import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useProfileStore, Profile } from "@/features/profile/store/useProfileStore";

export function PreferencesCard() {
  const { profile, updateMe, saving } = useProfileStore();
  const p = profile?.preferences ?? {};

  const [primary, setPrimary] = useState<"boulder" | "rope" | "">((p.primary_discipline as any) ?? "");
  const [hours, setHours] = useState<string>(p.weekly_hours != null ? String(p.weekly_hours) : "");
  const [homeGym, setHomeGym] = useState<string>(p.home_gym_id ?? "");
  const [outdoor, setOutdoor] = useState<string>(p.primary_outdoor_area ?? "");

  const onSave = async () => {
    const partial: Partial<Profile> = {
      preferences: {
        primary_discipline: (primary || undefined) as any,
        weekly_hours: hours === "" ? undefined : Number(hours),
        home_gym_id: homeGym || undefined,
        primary_outdoor_area: outdoor || undefined,
        // favorites 仍建议单独管理，这里不编辑
      },
    };
    await updateMe(partial);
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>偏好</Text>

      <Text style={{ color: "#6b7280", marginBottom: 6 }}>主攻项目</Text>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        {(["boulder", "rope"] as const).map((opt) => (
          <Pressable
            key={opt}
            onPress={() => setPrimary(opt)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 14,
              backgroundColor: primary === opt ? "#111827" : "#e5e7eb",
            }}
          >
            <Text style={{ color: primary === opt ? "#fff" : "#111827" }}>{opt}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="每周时长 (小时)" value={hours} onChangeText={setHours} keyboardType="numeric" placeholder="e.g. 6" />
      <Field label="Home Gym ID" value={homeGym} onChangeText={setHomeGym} placeholder="gym_001" />
      <Field label="常去户外点" value={outdoor} onChangeText={setOutdoor} placeholder="Joe's Valley" />

      <Pressable
        onPress={onSave}
        disabled={saving}
        style={{ backgroundColor: "#111827", padding: 12, borderRadius: 10, alignItems: "center", marginTop: 12 }}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>{saving ? "保存中..." : "保存"}</Text>
      </Pressable>
    </View>
  );
}

function Field(props: {
  label: string;
  value?: string;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  onChangeText: (v: string) => void;
}) {
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ color: "#6b7280", marginBottom: 6 }}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        keyboardType={props.keyboardType}
        style={{ borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, padding: 10 }}
      />
    </View>
  );
}
