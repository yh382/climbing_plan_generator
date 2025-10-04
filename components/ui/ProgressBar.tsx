// components/ui/ProgressBar.tsx
import { View } from "react-native";

export function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={{ height: 10, borderRadius: 999, backgroundColor: "#E5E7EB", overflow: "hidden" }}>
      <View style={{ width: `${v}%`, height: "100%", backgroundColor: "#A5D23D" }} />
    </View>
  );
}
