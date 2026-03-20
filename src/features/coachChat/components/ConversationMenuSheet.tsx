import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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

const SCREEN_HEIGHT = Dimensions.get("window").height;

type Props = {
  visible: boolean;
  onClose: () => void;
  onNewConversation: () => void;
  onViewAll: () => void;
  onDeleteCurrent: () => void;
};

export default function ConversationMenuSheet({
  visible,
  onClose,
  onNewConversation,
  onViewAll,
  onDeleteCurrent,
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

  const handleAction = (action: () => void) => {
    closeWithAnimation();
    requestAnimationFrame(action);
  };

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
            { paddingBottom: insets.bottom + 20, transform: [{ translateY }] },
          ]}
          {...panResponder.panHandlers}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Drag handle */}
            <View style={styles.dragHandleArea}>
              <View style={styles.dragIndicator} />
            </View>

            <MenuItem
              icon="add-circle-outline"
              label={tr("开始新对话", "Start new conversation")}
              onPress={() => handleAction(onNewConversation)}
            />
            <MenuItem
              icon="list-outline"
              label={tr("查看所有对话", "View all conversations")}
              onPress={() => handleAction(onViewAll)}
            />
            <MenuItem
              icon="trash-outline"
              label={tr("删除当前对话", "Delete current conversation")}
              color="#EF4444"
              onPress={() => handleAction(onDeleteCurrent)}
            />
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

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
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.menuItem}
    >
      <Ionicons name={icon as any} size={22} color={color} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    </TouchableOpacity>
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
