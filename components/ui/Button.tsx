// components/ui/Button.tsx
import { Pressable, Text, ViewStyle } from "react-native";
import { tokens } from "./Theme";

type Variant = "primary" | "secondary" | "ghost";

export function Button({
  title, onPress, variant = "primary", disabled, style,
}: { title: string; onPress: () => void; variant?: Variant; disabled?: boolean; style?: ViewStyle; }) {
  const base: ViewStyle = {
    paddingVertical: tokens.space(3),
    paddingHorizontal: tokens.space(4),
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    justifyContent: "center",
    opacity: disabled ? 0.6 : 1,
  };
  const styles: Record<Variant, ViewStyle> = {
    primary: { ...base, backgroundColor: tokens.color.primary },
    secondary: { ...base, backgroundColor: "#EFF6FF" },
    ghost: { ...base, backgroundColor: "transparent", borderWidth: 1, borderColor: tokens.color.border },
  };
  const color = variant === "primary" ? "#fff" : tokens.color.text;

  return (
    <Pressable onPress={onPress} disabled={disabled} style={[styles[variant], style]}>
      <Text style={{ color, fontWeight: "600" }}>{title}</Text>
    </Pressable>
  );
}
