// src/features/session/components/PreSessionModal.tsx
import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  Pressable, 
  ActivityIndicator, 
  Alert, 
  ScrollView, 
  Animated, 
  Dimensions,
  Easing
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  visible: boolean;
  onClose: () => void;
  onStart: (gymName: string) => void;
}

const NEARBY_GYMS = [
  { id: '1', name: "The Front SLC", dist: "0.8 mi", address: "1470 S 400 W" },
  { id: '2', name: "Momentum Millcreek", dist: "3.2 mi", address: "3173 E 3300 S" },
  { id: '3', name: "Bouldering Project", dist: "5.0 mi", address: "900 Poplar St" },
];

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function PreSessionModal({ visible, onClose, onStart }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedGym, setSelectedGym] = useState<string | null>(NEARBY_GYMS[0].name);
  const [isLocating, setIsLocating] = useState(false);
  
  // 动画值：0 = 关闭, 1 = 打开
  const animValue = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(visible);

  // 监听 visible 变化来驱动进场/退场动画
  useEffect(() => {
    if (visible) {
      setShowModal(true);
      // 进场：背景渐显，Sheet上滑
      Animated.timing(animValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      // 这里的逻辑通常由 handleClose 处理，但防一手父组件直接关
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
      onClose(); // 通知父组件
    });
  };

  const handleStart = () => {
    if (selectedGym) {
        // 先关动画再跳转，或者直接跳转
        onStart(selectedGym);
    }
  };

  const handleLocate = () => {
    setIsLocating(true);
    setTimeout(() => {
      setIsLocating(false);
      Alert.alert("Location Found", "You are at 'The Front SLC'");
      setSelectedGym("The Front SLC");
    }, 1000);
  };

  const handleOpenMap = () => {
    Alert.alert("Open Map", "Map selection feature coming soon!");
  };

  // 动画插值
  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0], // 从屏幕底部移上来
  });

  if (!showModal) return null;

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none" // [核心] 关掉默认动画，完全手动控制
      onRequestClose={handleClose}
    >
      {/* 1. 背景层：只做透明度渐变，不移动 */}
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <Pressable style={styles.overlayPressable} onPress={handleClose} />
      </Animated.View>

      {/* 2. 内容层：从底部滑入 */}
      <Animated.View 
        style={[
            styles.sheetContainer, 
            { transform: [{ translateY: sheetTranslateY }] }
        ]}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
            {/* Handle */}
            <View style={styles.handleContainer}>
                <View style={styles.handle} />
            </View>

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Start Session</Text>
                    <Text style={styles.subTitle}>Where are you climbing today?</Text>
                </View>
                <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
                <TouchableOpacity 
                    style={[styles.actionBtn, styles.locateBtn]} 
                    onPress={handleLocate}
                    disabled={isLocating}
                >
                    {isLocating ? <ActivityIndicator size="small" color="#4F46E5" /> : <Ionicons name="navigate" size={20} color="#4F46E5" />}
                    <Text style={styles.locateText}>{isLocating ? "Locating..." : "Use Current Location"}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionBtn} onPress={handleOpenMap}>
                    <Ionicons name="map-outline" size={20} color="#374151" />
                    <Text style={styles.mapText}>Map</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* List */}
            <Text style={styles.sectionLabel}>NEARBY GYMS</Text>
            <ScrollView style={{ maxHeight: 200 }} contentContainerStyle={{ gap: 12 }}>
                {NEARBY_GYMS.map((gym) => {
                    const isSelected = selectedGym === gym.name;
                    return (
                        <TouchableOpacity 
                            key={gym.id} 
                            style={[styles.gymItem, isSelected && styles.gymItemActive]}
                            onPress={() => setSelectedGym(gym.name)}
                        >
                            <View style={styles.gymIconWrap}>
                                <Ionicons name="business" size={20} color={isSelected ? "#FFF" : "#9CA3AF"} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.gymName, isSelected && styles.gymNameActive]}>{gym.name}</Text>
                                <Text style={styles.gymAddr}>{gym.address} · {gym.dist}</Text>
                            </View>
                            {isSelected && <Ionicons name="checkmark-circle" size={24} color="#10B981" />}
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Button */}
            <TouchableOpacity 
                style={[styles.startBtn, !selectedGym && styles.startBtnDisabled]}
                onPress={handleStart}
                disabled={!selectedGym}
            >
                <Text style={styles.startBtnText}>START CLIMBING</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFF" />
            </TouchableOpacity>
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
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  
  handleContainer: { alignItems: 'center', marginBottom: 16 },
  handle: { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: '800', color: '#111' },
  subTitle: { fontSize: 14, color: '#6B7280', marginTop: 4 },
  closeBtn: { padding: 4, backgroundColor: '#F3F4F6', borderRadius: 20 },

  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB', gap: 8, backgroundColor: '#FFF' },
  locateBtn: { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  locateText: { fontWeight: '600', color: '#4F46E5', fontSize: 13 },
  mapText: { fontWeight: '600', color: '#374151', fontSize: 13 },

  divider: { height: 1, backgroundColor: '#F3F4F6', marginBottom: 16 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginBottom: 12, letterSpacing: 0.5 },

  gymItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: 'transparent', gap: 12 },
  gymItemActive: { backgroundColor: '#111827', borderColor: '#111827' },
  gymIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center' },
  gymName: { fontSize: 16, fontWeight: '600', color: '#111' },
  gymNameActive: { color: '#FFF' },
  gymAddr: { fontSize: 12, color: '#6B7280' },

  startBtn: { marginTop: 24, height: 56, backgroundColor: '#10B981', borderRadius: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: "#10B981", shadowOpacity: 0.3, shadowRadius: 10, elevation: 5 },
  startBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
  startBtnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 }
});