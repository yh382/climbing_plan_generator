import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useProfileStore, Profile } from "@/features/profile/store/useProfileStore";

export function MobilityRecoveryCard() {
  const { profile, updateMe, saving } = useProfileStore();
  const m = profile?.mobility ?? {};
  const r = profile?.recovery ?? {};
  const p = r?.pain ?? {};

  const [sitReach, setSitReach] = useState<string>(m.sit_and_reach_cm != null ? String(m.sit_and_reach_cm) : "");
  const [hipScore, setHipScore] = useState<string>(m.hip_mobility_score != null ? String(m.hip_mobility_score) : "");
  const [shoulderFlex, setShoulderFlex] = useState<string>(m.shoulder_flex ?? "");
  const [hipOpen, setHipOpen] = useState<string>(m.hip_open ?? "");

  const [sleepHours, setSleepHours] = useState<string>(r.sleep_hours_avg != null ? String(r.sleep_hours_avg) : "");
  const [stretchFreq, setStretchFreq] = useState<string>(r.stretching_freq_band ?? "");

  const [painFinger, setPainFinger] = useState<number>(p.finger ?? 0);
  const [painShoulder, setPainShoulder] = useState<number>(p.shoulder ?? 0);
  const [painElbow, setPainElbow] = useState<number>(p.elbow ?? 0);
  const [painWrist, setPainWrist] = useState<number>(p.wrist ?? 0);

  const onSave = async () => {
    const partial: Partial<Profile> = {
      mobility: {
        sit_and_reach_cm: sitReach === "" ? undefined : Number(sitReach),
        hip_mobility_score: hipScore === "" ? undefined : Number(hipScore),
        shoulder_flex: shoulderFlex || undefined,
        hip_open: hipOpen || undefined,
      },
      recovery: {
        sleep_hours_avg: sleepHours === "" ? undefined : Number(sleepHours),
        stretching_freq_band: stretchFreq || undefined,
        pain: { finger: painFinger, shoulder: painShoulder, elbow: painElbow, wrist: painWrist },
      },
    };
    await updateMe(partial);
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>机动性 & 恢复</Text>

      <Field label="坐姿体前屈 (cm)" value={sitReach} onChangeText={setSitReach} keyboardType="numeric" placeholder="e.g. 8" />
      <Field label="髋灵活度评分 (0-10)" value={hipScore} onChangeText={setHipScore} keyboardType="numeric" placeholder="e.g. 7" />
      <Field label="肩关节灵活度（文字描述）" value={shoulderFlex} onChangeText={setShoulderFlex} placeholder="good/average/..." />
      <Field label="髋外展（文字描述）" value={hipOpen} onChangeText={setHipOpen} placeholder="good/average/..." />

      <Divider />

      <Field label="平均睡眠时长 (h)" value={sleepHours} onChangeText={setSleepHours} keyboardType="numeric" placeholder="e.g. 7.5" />
      <Field label="拉伸频率" value={stretchFreq} onChangeText={setStretchFreq} placeholder="never/weekly/3x-week/daily" />

      <Text style={{ color: "#6b7280", marginTop: 12, marginBottom: 6 }}>疼痛程度 (0–3)</Text>
      <PainRow label="手指" value={painFinger} onChange={setPainFinger} />
      <PainRow label="肩部" value={painShoulder} onChange={setPainShoulder} />
      <PainRow label="肘部" value={painElbow} onChange={setPainElbow} />
      <PainRow label="手腕" value={painWrist} onChange={setPainWrist} />

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

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#e5e7eb", marginVertical: 12 }} />;
}

function PainRow({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
      <Text style={{ width: 56, color: "#374151" }}>{label}</Text>
      <View style={{ flexDirection: "row", gap: 6 }}>
        {[0, 1, 2, 3].map((n) => (
          <Pressable
            key={n}
            onPress={() => onChange(n)}
            style={{
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 8,
              backgroundColor: value === n ? "#111827" : "#e5e7eb",
            }}
          >
            <Text style={{ color: value === n ? "#fff" : "#111827" }}>{n}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
