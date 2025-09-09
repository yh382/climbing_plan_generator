// components/ui/FieldRow.tsx
import { View, Text } from "react-native";
import { tokens } from "./Theme";

export function FieldRow({ label, right, children }: { label: string; right?: React.ReactNode; children?: React.ReactNode; }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderColor: tokens.color.border }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <Text style={{ fontWeight: "600" }}>{label}</Text>
        </View>
        {right}
      </View>
      {children ? <View style={{ marginTop: 10 }}>{children}</View> : null}
    </View>
  );
}
