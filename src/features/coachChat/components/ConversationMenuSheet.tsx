import React, { forwardRef, useCallback, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";

type Props = {
  onNewConversation: () => void;
  onViewAll: () => void;
  onDeleteCurrent: () => void;
};

const ConversationMenuSheet = forwardRef<BottomSheet, Props>(
  ({ onNewConversation, onViewAll, onDeleteCurrent }, ref) => {
    const snapPoints = useMemo(() => ["30%"], []);

    const handleAction = useCallback(
      (action: () => void) => {
        (ref as React.RefObject<BottomSheet>).current?.close();
        // Small delay so sheet closes before action
        requestAnimationFrame(action);
      },
      [ref],
    );

    return (
      <BottomSheet
        ref={ref}
        index={-1}
        snapPoints={snapPoints}
        enablePanDownToClose
        backdropComponent={(props) => (
          <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
        )}
      >
        <View style={styles.container}>
          <MenuItem
            icon="add-circle-outline"
            label="Start new conversation"
            onPress={() => handleAction(onNewConversation)}
          />
          <MenuItem
            icon="list-outline"
            label="View all conversations"
            onPress={() => handleAction(onViewAll)}
          />
          <MenuItem
            icon="trash-outline"
            label="Delete current conversation"
            color="#EF4444"
            onPress={() => handleAction(onDeleteCurrent)}
          />
        </View>
      </BottomSheet>
    );
  },
);

ConversationMenuSheet.displayName = "ConversationMenuSheet";
export default ConversationMenuSheet;

function MenuItem({
  icon,
  label,
  color = "#111827",
  onPress,
}: {
  icon: string;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.menuItem, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
});
