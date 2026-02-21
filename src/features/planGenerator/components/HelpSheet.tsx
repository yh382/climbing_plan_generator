// src/feature/planGenerator/components/HelpSheet.tsx
import React, { useMemo, useRef } from "react";
import { Text } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from "@gorhom/bottom-sheet";

export type HelpContent = { title: string; content: string } | null;

export function HelpSheet({
  help,
  onClose,
}: {
  help: HelpContent;
  onClose?: () => void;
}) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["45%", "85%"], []);

  // 暴露给父组件调用
  const open = () => requestAnimationFrame(() => sheetRef.current?.snapToIndex(0));
  const close = () => {
    sheetRef.current?.close();
    onClose?.();
  };

  // 这里用挂载时不自动打开的模式，父组件在设置 help 后调用 open()
  (HelpSheet as any).open = open;
  (HelpSheet as any).close = close;

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
      )}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16, borderRadius: 20 }}>
        {!!help && (
          <>
            <Text style={{ fontSize: 16, fontWeight: "bold", marginBottom: 8 }}>
              {help.title}
            </Text>
            <Text style={{ color: "#374151", lineHeight: 20 }}>{help.content}</Text>
          </>
        )}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
