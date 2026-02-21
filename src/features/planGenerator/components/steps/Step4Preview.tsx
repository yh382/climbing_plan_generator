import React from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { Section } from "../FormPrimitives";
import { TypewriterLines } from "../TypewriterLines";

export function Step4Preview({
  tr,
  previewLines,
  isGenerating,
  onGenerate,
  onConfirmImport,
  onEdit,
}: {
  tr: (zh: string, en: string) => string;
  previewLines: string[];
  isGenerating: boolean;
  onGenerate: () => void;
  onConfirmImport: () => void;
  onEdit?: () => void;
}) {
  return (
    <>
      <Section title={tr("计划预览", "Plan preview")}>
        <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 }}>
          {previewLines?.length ? (
            <TypewriterLines lines={previewLines} />
          ) : (
            <Text style={{ color: "#6b7280", lineHeight: 20 }}>
              {tr("点击生成，查看计划要点预览。", "Tap Generate to preview plan highlights.")}
            </Text>
          )}
        </View>
      </Section>

      <View style={{ paddingHorizontal: 16, gap: 10 }}>
        <Pressable
          onPress={onGenerate}
          disabled={isGenerating}
          style={{
            height: 48,
            borderRadius: 14,
            backgroundColor: "#111827",
            alignItems: "center",
            justifyContent: "center",
            opacity: isGenerating ? 0.7 : 1,
            flexDirection: "row",
            gap: 10,
          }}
        >
          {isGenerating ? <ActivityIndicator /> : null}
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {isGenerating ? tr("生成中…", "Generating…") : tr("生成计划", "Generate plan")}
          </Text>
        </Pressable>

        <Pressable
          onPress={onConfirmImport}
          disabled={isGenerating || !previewLines?.length}
          style={{
            height: 48,
            borderRadius: 14,
            backgroundColor: "#10B981",
            alignItems: "center",
            justifyContent: "center",
            opacity: isGenerating || !previewLines?.length ? 0.5 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            {tr("导入到我的计划", "Import to My Plans")}
          </Text>
        </Pressable>

        {onEdit ? (
          <Pressable
            onPress={onEdit}
            style={{
              height: 44,
              borderRadius: 14,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#111827", fontWeight: "700" }}>
              {tr("返回修改", "Back to edit")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={{ height: 14 }} />
    </>
  );
}
