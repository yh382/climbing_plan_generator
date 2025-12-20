// src/features/session/components/SessionDetailModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  Animated, 
  Dimensions, 
  Easing 
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// 模拟动作数据
const MOCK_EXERCISES = [
  { id: 1, name: "Barbell Bench Press", sets: 3, reps: "5-8" },
  { id: 2, name: "Weighted Pull-ups", sets: 3, reps: "6-8" },
  { id: 3, name: "Incline Dumbbell Press", sets: 3, reps: "8-12" },
  { id: 4, name: "Cable Face Pulls", sets: 4, reps: "15-20" },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  session: any; // 传入的 Session 数据
  onStart: () => void;
  onEdit: () => void;
}

export default function SessionDetailModal({ visible, onClose, session, onStart, onEdit }: Props) {
  const insets = useSafeAreaInsets();
  
  // 动画状态管理
  const animValue = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(visible);

  // 监听 visible 变化
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
      // 外部直接关闭时（防御性逻辑）
      if (!showModal) return;
      Animated.timing(animValue, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setShowModal(false));
    }
  }, [visible]);

  // 拦截关闭操作：先做动画，再回调
  const handleClose = () => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onClose();
    });
  };

  const handleStart = () => {
    // 关闭动画后执行开始
    Animated.timing(animValue, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onStart();
    });
  };

  const handleEdit = () => {
    // 关闭动画后执行编辑
    Animated.timing(animValue, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onEdit();
    });
  };

  // 动画插值
  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0], // 从底部滑入
  });

  if (!showModal || !session) return null;

  const isCompleted = session.status === 'completed';

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none" // [关键] 禁用默认动画
      onRequestClose={handleClose}
    >
      {/* 1. 背景层：Fade In/Out */}
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <Pressable style={styles.overlayPressable} onPress={handleClose} />
      </Animated.View>

      {/* 2. 内容层：Slide Up/Down */}
      <Animated.View 
        style={[
            styles.sheetContainer, 
            { transform: [{ translateY: sheetTranslateY }] }
        ]}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20, maxHeight: SCREEN_HEIGHT * 0.85 }]}>
            
            {/* Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            {/* Header: Title + Edit + Close */}
            <View style={styles.header}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.typeLabel}>{session.focus} · {session.duration}</Text>
                    <Text style={styles.title}>{session.title}</Text>
                </View>
                <View style={styles.headerActions}>
                    <TouchableOpacity onPress={handleEdit} style={styles.iconBtn}>
                        <Ionicons name="create-outline" size={22} color="#111" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleClose} style={styles.iconBtn}>
                        <Ionicons name="close" size={22} color="#6B7280" />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Exercises List */}
            <ScrollView style={{ marginTop: 8 }} contentContainerStyle={{ paddingBottom: 20 }}>
                <Text style={styles.sectionTitle}>Workout Structure</Text>
                {MOCK_EXERCISES.map((ex, index) => (
                    <View key={ex.id} style={styles.exerciseItem}>
                        <View style={styles.exIndex}>
                            <Text style={styles.indexText}>{index + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.exName}>{ex.name}</Text>
                            <Text style={styles.exDetail}>{ex.sets} sets × {ex.reps} reps</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Footer Button */}
            {!isCompleted && (
                <TouchableOpacity style={styles.startBtn} onPress={handleStart}>
                    <Text style={styles.startBtnText}>START WORKOUT</Text>
                    <Ionicons name="play" size={18} color="#FFF" />
                </TouchableOpacity>
            )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // 背景全屏铺满
  overlay: { 
    ...StyleSheet.absoluteFillObject, 
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  overlayPressable: { flex: 1 },

  // Sheet 容器放置在底部
  sheetContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    justifyContent: 'flex-end',
  },

  sheet: { 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    paddingHorizontal: 24, 
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  
  handleContainer: { alignItems: 'center', marginBottom: 16 },
  handle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  
  typeLabel: { fontSize: 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: 4 },
  title: { fontSize: 24, fontWeight: '800', color: '#111', lineHeight: 28 },
  
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 12 },
  
  exerciseItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  exIndex: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  indexText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  exName: { fontSize: 16, fontWeight: '600', color: '#111' },
  exDetail: { fontSize: 13, color: '#6B7280', marginTop: 2 },

  startBtn: { marginTop: 12, height: 56, backgroundColor: '#111827', borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 8, elevation: 5 },
  startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }
});