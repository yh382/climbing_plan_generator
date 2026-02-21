import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  onChooseFromLibrary: () => void;
  onTakePhoto: () => void;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;

export default function AvatarPickerSheet({
  visible,
  onClose,
  onChooseFromLibrary,
  onTakePhoto,
}: Props) {
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [showModal, setShowModal] = useState(visible);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    })
  ).current;

  if (!showModal) return null;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={showModal}
      onRequestClose={closeWithAnimation}
    >
      {/* 点击背景关闭 */}
      <Pressable style={styles.overlay} onPress={closeWithAnimation}>
        <Animated.View
          style={[
            styles.modalContent,
            {
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* 阻止点击内容区穿透到背景 */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* 顶部拖拽指示条 */}
            <View style={styles.dragHandleArea}>
              <View style={styles.dragIndicator} />
            </View>

            <Text style={styles.title}>Change Profile Photo</Text>

            <View style={styles.list}>
              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.75}
                onPress={() => {
                  closeWithAnimation();
                  // close 动画结束后再 push 更顺滑
                  // 但这里 closeWithAnimation 会调用 onClose，
                  // 你在 onClose 里通常会 setVisible(false)，
                  // 所以我们用一个微小延迟确保不会卡住。
                  setTimeout(onChooseFromLibrary, 60);
                }}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name="images-outline" size={22} color="#0F172A" />
                </View>
                <Text style={styles.rowText}>Choose from library</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.row}
                activeOpacity={0.75}
                onPress={() => {
                  closeWithAnimation();
                  setTimeout(onTakePhoto, 60);
                }}
              >
                <View style={styles.iconCircle}>
                  <Ionicons name="camera-outline" size={22} color="#0F172A" />
                </View>
                <Text style={styles.rowText}>Take photo</Text>
              </TouchableOpacity>
            </View>
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
  modalContent: {
    backgroundColor: "#fff",
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
    textAlign: "center",
    marginBottom: 18,
    marginTop: 4,
  },
  list: {
    gap: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    height: 52,
    borderRadius: 14,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A",
  },
});
