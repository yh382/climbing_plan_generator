import React, { forwardRef, useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { Ionicons } from "@expo/vector-icons";
import type { CoachConversation } from "../types";

type Props = {
  conversations: CoachConversation[];
  currentId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ConversationListSheet = forwardRef<BottomSheet, Props>(
  ({ conversations, currentId, onSelect, onDelete }, ref) => {
    const snapPoints = useMemo(() => ["60%", "85%"], []);

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
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Conversations</Text>
        </View>

        <BottomSheetFlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          renderItem={({ item }) => {
            const isCurrent = item.id === currentId;
            return (
              <Pressable
                onPress={() => {
                  onSelect(item.id);
                  (ref as React.RefObject<BottomSheet>).current?.close();
                }}
                style={({ pressed }) => [
                  styles.row,
                  isCurrent && styles.rowActive,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {item.phase} · {relativeTime(item.updatedAt)}
                  </Text>
                </View>
                <Pressable
                  onPress={() => onDelete(item.id)}
                  hitSlop={10}
                  style={({ pressed }) => [pressed && { opacity: 0.5 }]}
                >
                  <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                </Pressable>
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    );
  },
);

ConversationListSheet.displayName = "ConversationListSheet";
export default ConversationListSheet;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginTop: 4,
    gap: 12,
  },
  rowActive: {
    backgroundColor: "rgba(48,110,111,0.08)",
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  rowMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
});
