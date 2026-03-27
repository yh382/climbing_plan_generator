// src/features/community/events/EventDetailsModal.tsx
import { useRef, useEffect, useState, useMemo } from "react";
import { Modal, View, Text, StyleSheet, Pressable, ScrollView, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "@/lib/useThemeColors";

const DURATION = 280;

export default function EventDetailsModal({
  visible,
  onClose,
  title,
  text,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  text: string;
}) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [modalVisible, setModalVisible] = useState(false);
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(500)).current;

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      backdropAnim.setValue(0);
      sheetAnim.setValue(500);
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 1, duration: DURATION, useNativeDriver: true }),
        Animated.timing(sheetAnim, { toValue: 0, duration: DURATION, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, { toValue: 0, duration: DURATION, useNativeDriver: true }),
        Animated.timing(sheetAnim, { toValue: 500, duration: DURATION, useNativeDriver: true }),
      ]).start(() => setModalVisible(false));
    }
  }, [visible]);

  return (
    <Modal visible={modalVisible} animationType="none" transparent onRequestClose={onClose}>
      <Animated.View style={[styles.backdrop, { opacity: backdropAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
              <Ionicons name="close" size={20} color={colors.textPrimary} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>{text}</Text>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: "hidden",
    maxHeight: "78%",
  },
  sheetHeader: {
    height: 56,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardBorder,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sheetTitle: { fontSize: 16, fontWeight: "900", color: colors.textPrimary },
  body: { color: colors.textPrimary, fontSize: 14, fontWeight: "700", lineHeight: 20 },
});
