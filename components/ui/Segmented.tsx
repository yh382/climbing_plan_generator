// components/ui/Segmented.tsx
import { View, Pressable, Text } from "react-native";
import { theme } from "../../src/lib/theme";

export function Segmented({
  options, value, onChange,
}: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: theme.colors.backgroundSecondary, borderRadius: 999, padding: 4 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999,
              backgroundColor: active ? theme.colors.cardDark : "transparent",
              minWidth: 72, alignItems: "center",
            }}>
            <Text style={{
              color: active ? "#FFF" : theme.colors.textSecondary,
              fontWeight: active ? "600" : "500",
              fontFamily: active ? theme.fonts.medium : theme.fonts.regular,
            }}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
