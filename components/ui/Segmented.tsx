// components/ui/Segmented.tsx
import { View, Pressable, Text } from "react-native";
import { theme } from "../../src/lib/theme";
import { useThemeColors } from "../../src/lib/useThemeColors";

export function Segmented({
  options, value, onChange,
}: { options: { label: string; value: string }[]; value: string; onChange: (v: string) => void }) {
  const colors = useThemeColors();
  return (
    <View style={{ flexDirection: "row", backgroundColor: colors.toggleBackground, borderRadius: 8, padding: 2 }}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              paddingVertical: 6, paddingHorizontal: 14, borderRadius: 7,
              backgroundColor: active ? colors.toggleActiveBackground : "transparent",
              minWidth: 64, alignItems: "center",
            }}>
            <Text style={{
              fontSize: 13,
              color: active ? colors.toggleActiveText : colors.toggleInactiveText,
              fontWeight: active ? "600" : "400",
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
