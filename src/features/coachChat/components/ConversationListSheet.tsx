import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSettings } from "../../../contexts/SettingsContext";
import type { CoachConversation } from "../types";

const SCREEN_HEIGHT = Dimensions.get("window").height;

type Props = {
  visible: boolean;
  onClose: () => void;
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

export default function ConversationListSheet({
  visible,
  onClose,
  conversations,
  currentId,
  onSelect,
  onDelete,
}: Props) {
  const insets = useSafeAreaInsets();
  const { tr } = useSettings();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else {
      closeWithAnimation();
    }
  }, [visible]);

  const closeWithAnimation = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.vy > 0.5 || g.dy > 100) {
          closeWithAnimation();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20,
            stiffness: 200,
          }).start();
        }
      },
    }),
  ).current;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={showModal}
      onRequestClose={closeWithAnimation}
    >
      <Pressable style={styles.overlay} onPress={closeWithAnimation}>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 20,
              maxHeight: SCREEN_HEIGHT * 0.75,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Drag handle */}
            <View style={styles.dragHandleArea}>
              <View style={styles.dragIndicator} />
            </View>

            <Text style={styles.title}>{tr("所有对话", "Conversations")}</Text>

            <FlatList
              data={conversations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingBottom: 16 }}
              renderItem={({ item }) => {
                const isCurrent = item.id === currentId;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      onSelect(item.id);
                      closeWithAnimation();
                    }}
                    style={[styles.row, isCurrent && styles.rowActive]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      <Text style={styles.rowMeta}>
                        {item.phase} · {relativeTime(item.updatedAt)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onDelete(item.id)}
                      hitSlop={10}
                      activeOpacity={0.5}
                    >
                      <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              }}
            />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  dragHandleArea: {
    width: "100%",
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
    marginTop: 4,
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
