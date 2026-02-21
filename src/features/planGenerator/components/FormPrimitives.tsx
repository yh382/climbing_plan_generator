// src/feature/planGenerator/components/FormPrimitives.tsx
import React from "react";
import { Pressable, Text, View } from "react-native";
import { tokens } from "../../../../components/ui/Theme";

export function Section({
  title,
  children,
  onHelp,
  helpLabel = "Help",
}: {
  title: string;
  children: React.ReactNode;
  onHelp?: () => void;
  helpLabel?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <View
        style={{
          backgroundColor: "#fff",
          borderRadius: 20,
          marginHorizontal: 16,
          borderWidth: 0.6,
          borderColor: "#e5e7eb",
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 4,
        }}
      >
        <View
          style={{
            paddingTop: 12,
            paddingHorizontal: 16,
            paddingBottom: 2,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text numberOfLines={1} style={{ fontSize: 16, fontWeight: "bold" }}>
            {title}
          </Text>

          {onHelp && (
            <Pressable
              onPress={onHelp}
              hitSlop={8}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: "#e5f5f0",
              }}
            >
              <Text style={{ color: "#245556", fontWeight: "600" }}>
                {helpLabel}
              </Text>
            </Pressable>
          )}
        </View>

        <View style={{ padding: 4, paddingTop: 0 }}>{children}</View>
      </View>
    </View>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return <View style={{ flexDirection: "row", alignItems: "center" }}>{children}</View>;
}

export function Col({
  label,
  labelNode,
  children,
  flex = 1,
}: {
  label?: string;
  labelNode?: React.ReactNode;
  children: React.ReactNode;
  flex?: number;
}) {
  return (
    <View style={{ flex, paddingVertical: 6 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingLeft: 12,
          paddingTop: 6,
          paddingRight: 12,
        }}
      >
        {labelNode ? labelNode : <Text style={{ color: "#6b7280", fontSize: 12 }}>{label}</Text>}
      </View>
      {children}
    </View>
  );
}

export function Chip({
  label,
  active,
  onPress,
  disabled = false,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  const displayLabel = label.replace(/^[\s\u00A0\u3000]+/, "");

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 999,
        borderWidth: 0.3,
        borderColor: active ? "#111827" : "#e5e7eb",
        backgroundColor: active ? "#111827" : "#f3f4f6",
        marginRight: 8,
        marginBottom: 8,
        opacity: disabled ? 0.5 : 1,
        shadowColor: "#000",
        shadowOpacity: active ? 0.04 : 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: active ? 3 : 0,
      }}
    >
      <Text style={{ color: active ? "#FFFFFF" : tokens.color.text }}>{displayLabel}</Text>
    </Pressable>
  );
}

export function Progress({ step }: { step: 1 | 2 | 3 | 4 }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 16, marginTop: 12 }}>
      {[1, 2, 3, 4].map((n) => (
        <View
          key={n}
          style={{
            height: 6,
            flex: 1,
            borderRadius: 999,
            backgroundColor: step >= (n as any) ? "#4f46e5" : "#e5e7eb",
          }}
        />
      ))}
    </View>
  );
}
