import React, { useMemo, useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { useProfileStore, Profile } from "@/features/profile/store/useProfileStore";
import { useUserStore } from "@/store/useUserStore";
import { kgToLb, lbToKg } from "@lib/units";

export function StrengthCard() {
  const { profile, updateMe, saving } = useProfileStore();
  const { user } = useUserStore();
  const s = profile?.strength ?? {};
  const isImperial = user?.units === "imperial";

  // 显示时换单位（kg -> lb）
  const [grip, setGrip] = useState<string>(
    s.grip_kg != null ? (isImperial ? Math.round(kgToLb(s.grip_kg)).toString() : String(s.grip_kg)) : ""
  );
  const [plank, setPlank] = useState<string>(s.plank_s != null ? String(s.plank_s) : "");
  const [oneArmHang, setOneArmHang] = useState<string>(s.one_arm_hang_s != null ? String(s.one_arm_hang_s) : "");
  const [pullupsMax, setPullupsMax] = useState<string>(s.pullups?.max_reps != null ? String(s.pullups?.max_reps) : "");
  const [wpu1rm, setWpu1rm] = useState<string>(
    s.weighted_pullup_1rm_kg != null
      ? (isImperial ? Math.round(kgToLb(s.weighted_pullup_1rm_kg)).toString() : String(s.weighted_pullup_1rm_kg))
      : ""
  );
  const [hbProtocol, setHbProtocol] = useState<string>(s.hangboard?.protocol ?? "");
  const [hbReps, setHbReps] = useState<string>(
    s.hangboard?.total_reps != null ? String(s.hangboard?.total_reps) : ""
  );

  const unitWeight = useMemo(() => (isImperial ? "lb" : "kg"), [isImperial]);

  const onSave = async () => {
    const partial: Partial<Profile> = {
      strength: {
        grip_kg: grip === "" ? undefined : (isImperial ? lbToKg(Number(grip)) : Number(grip)),
        plank_s: plank === "" ? undefined : Number(plank),
        one_arm_hang_s: oneArmHang === "" ? undefined : Number(oneArmHang),
        weighted_pullup_1rm_kg: wpu1rm === "" ? undefined : (isImperial ? lbToKg(Number(wpu1rm)) : Number(wpu1rm)),
        pullups: pullupsMax === "" ? undefined : { max_reps: Number(pullupsMax) },
        hangboard: hbProtocol || hbReps ? { protocol: hbProtocol || undefined, total_reps: hbReps ? Number(hbReps) : undefined } : undefined,
      },
    };
    await updateMe(partial);
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontWeight: "700", fontSize: 16, marginBottom: 8 }}>力量 / 能力</Text>

      <Field
        label={`握力 (${unitWeight})`}
        value={grip}
        onChangeText={setGrip}
        keyboardType="numeric"
        placeholder={isImperial ? "e.g. 120" : "e.g. 55"}
      />
      <Field label="平板 (s)" value={plank} onChangeText={setPlank} keyboardType="numeric" placeholder="e.g. 120" />
      <Field
        label="单臂悬挂 (s)"
        value={oneArmHang}
        onChangeText={setOneArmHang}
        keyboardType="numeric"
        placeholder="e.g. 6"
      />
      <Field
        label="引体极限 (次)"
        value={pullupsMax}
        onChangeText={setPullupsMax}
        keyboardType="numeric"
        placeholder="e.g. 18"
      />
      <Field
        label={`负重引体 1RM (${unitWeight})`}
        value={wpu1rm}
        onChangeText={setWpu1rm}
        keyboardType="numeric"
        placeholder={isImperial ? "e.g. 70" : "e.g. 32"}
      />
      <Field label="挂板协议" value={hbProtocol} onChangeText={setHbProtocol} placeholder='e.g. "7/3 × 6"' />
      <Field
        label="挂板总次数"
        value={hbReps}
        onChangeText={setHbReps}
        keyboardType="numeric"
        placeholder="e.g. 36"
      />

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
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
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
