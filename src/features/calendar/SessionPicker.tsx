// src/features/calendar/SessionPicker.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Easing,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons"; 
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Types & Utils
import { PlanV3, PlanV3Session } from "../../types/plan";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

type Props = {
  visible: boolean;
  onClose: () => void;
  planV3: PlanV3 | null;
  onSelect: (session: PlanV3Session, type: 'climb' | 'train') => void; // 修改：传回类型以便扣除配额
  isZH: boolean;
};

export default function SessionPicker({ visible, onClose, planV3, onSelect, isZH }: Props) {
  const insets = useSafeAreaInsets();
  
  const animValue = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.timing(animValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      Animated.timing(animValue, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
        easing: Easing.in(Easing.cubic),
      }).start(() => setShowModal(false));
    }
  }, [visible]);

  if (!planV3 || !showModal) return null;

  const { train_sessions, climb_sessions } = planV3.session_bank;
  const { train, climb } = planV3.quotas;

  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.4],
  });

  const sheetTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT * 0.6, 0],
  });

  const handleClose = () => {
    onClose();
  };

  const renderSessionCard = (session: PlanV3Session, index: number, isClimb: boolean) => {
    const summary = session.blocks
      .map((b) => b.items[0]?.name_override?.zh || b.items[0]?.action_id || "")
      .slice(0, 2)
      .join(" + ");

    const accentColor = isClimb ? "#10B981" : "#3B82F6"; 
    const iconName = isClimb ? "earth" : "barbell";
    const bgLight = isClimb ? "#ECFDF5" : "#EFF6FF"; 

    return (
      <TouchableOpacity
        key={session.id + index}
        activeOpacity={0.7}
        style={styles.card}
        // [修改] 传递类型
        onPress={() => onSelect(session, isClimb ? 'climb' : 'train')}
      >
        <View style={[styles.iconBox, { backgroundColor: bgLight }]}>
          <Ionicons name={iconName} size={22} color={accentColor} />
        </View>
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
             <Text style={styles.cardTitle}>
               {isClimb 
                 ? (isZH ? "攀岩日" : "Climbing Day") 
                 : (isZH ? "体能训练" : "Strength Training")}
             </Text>
             <View style={[styles.tag, { borderColor: accentColor }]}>
                <Text style={[styles.tagText, { color: accentColor }]}>
                   {session.intensity?.toUpperCase() || "MODERATE"}
                </Text>
             </View>
          </View>
          
          <Text style={styles.summary} numberOfLines={1}>
             {summary}
          </Text>
          
          <Text style={styles.metaText}>
             {session.est_duration_min || 60} min · {session.blocks.length} {isZH ? "模块" : "Blocks"}
          </Text>
        </View>

        <Ionicons name="add-circle" size={28} color="#E5E7EB" />
      </TouchableOpacity>
    );
  };

  return (
    <Modal transparent visible={showModal} onRequestClose={handleClose} animationType="none">
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
      </Animated.View>

      {/* [修改] 移除 SafeAreaView，改用 View 手动控制 padding */}
      <View style={styles.bottomSheetContainer} pointerEvents="box-none">
        <Animated.View 
          style={[
            styles.sheet, 
            { 
                transform: [{ translateY: sheetTranslateY }],
                // [关键] 增加底部 padding 以避开 Home Indicator
                paddingBottom: insets.bottom + 20 
            }
          ]}
        >
          <View style={styles.handleBar}>
             <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{isZH ? "选择今日计划" : "Select Session"}</Text>
              <Text style={styles.subtitle}>
                 {isZH 
                   ? `剩余配额：攀岩 ${climb} / 训练 ${train}` 
                   : `Quota: Climb ${climb} / Train ${train}`}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <ScrollView 
            style={styles.scroll} 
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {train_sessions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{isZH ? "体能与指力" : "Training"}</Text>
                {train_sessions.map((s, i) => renderSessionCard(s, i, false))}
              </View>
            )}

            {climb_sessions.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{isZH ? "岩馆攀爬" : "Climbing"}</Text>
                {climb_sessions.map((s, i) => renderSessionCard(s, i, true))}
              </View>
            )}

            {train_sessions.length === 0 && climb_sessions.length === 0 && (
               <View style={styles.emptyContainer}>
                  <Ionicons name="checkmark-circle-outline" size={48} color="#10B981" />
                  <Text style={styles.emptyText}>{isZH ? "本周计划已全部完成！" : "All quotas completed!"}</Text>
               </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "#000", zIndex: 1 },
  bottomSheetContainer: { flex: 1, justifyContent: "flex-end", zIndex: 2 },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 10,
    overflow: "hidden",
  },
  handleBar: { alignItems: "center", paddingTop: 12, paddingBottom: 8 },
  handle: { width: 36, height: 4, backgroundColor: "#E5E7EB", borderRadius: 2 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 0.5, borderBottomColor: "#F3F4F6" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  closeBtn: { padding: 4, backgroundColor: "#F9FAFB", borderRadius: 16 },
  scroll: { paddingHorizontal: 20 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#9CA3AF", marginBottom: 10, letterSpacing: 0.5, textTransform: "uppercase" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 16, padding: 12, marginBottom: 12, shadowColor: "#000", shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: {width:0, height:2}, elevation: 2, borderWidth: 1, borderColor: "#F3F4F6" },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardContent: { flex: 1 },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1F2937" },
  tag: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, borderWidth: 0.5 },
  tagText: { fontSize: 9, fontWeight: "700" },
  summary: { fontSize: 13, color: "#4B5563", marginBottom: 4 },
  metaText: { fontSize: 11, color: "#9CA3AF" },
  emptyContainer: { alignItems: "center", marginTop: 40 },
  emptyText: { marginTop: 12, color: "#10B981", fontWeight: "600" }
});