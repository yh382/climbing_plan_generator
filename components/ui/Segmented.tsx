// components/ui/Segmented.tsx
import { View, Pressable, Text } from "react-native";
import { tokens } from "./Theme";

export function Segmented({
  options, value, onChange,
}: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: "#F1F5F9", borderRadius: 999, padding: 4 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
              backgroundColor: active ? tokens.color.card : "transparent",
              borderWidth: active ? 1 : 0, borderColor: active ? tokens.color.border : "transparent",
              minWidth: 72, alignItems: "center",
            }}>
            <Text style={{ color: active ? tokens.color.text : "#64748B", fontWeight: active ? "600" : "500" }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
