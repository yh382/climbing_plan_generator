// src/features/community/components/SmartBottomSheet.tsx

import React, { useEffect, useRef } from "react";
import { 
  View, Text, StyleSheet, TouchableOpacity, Modal, 
  Animated, Dimensions, PanResponder, LayoutAnimation, 
  Platform, UIManager
} from "react-native";

// 开启 LayoutAnimation (Android 需要)
if (Platform.OS === 'android') {
  if (UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  mode?: 'menu' | 'list'; // 'menu' (小高度) or 'list' (大高度)
  title?: string;
  children: React.ReactNode;
}

export default function SmartBottomSheet({ 
  visible, 
  onClose, 
  mode = 'menu', 
  title, 
  children 
}: Props) {
  // 动画值：Y轴位移
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  
  // 目标高度配置
  const targetHeight = mode === 'menu' ? SCREEN_HEIGHT * 0.22 : SCREEN_HEIGHT * 0.6;

  // 手势响应器
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 只有向下滑动超过一定阈值才接管
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // 只能向下滑动 (dy > 0)
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // 如果向下滑动超过 100px 或速度够快，则关闭
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          onClose();
        } else {
          // 否则回弹
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4
          }).start();
        }
      }
    })
  ).current;

  // 监听 visible 变化：进场/离场动画
  useEffect(() => {
    if (visible) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0 
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  // 监听 mode 变化：高度过渡动画
  useEffect(() => {
    if (visible) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [mode]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} onRequestClose={onClose}>
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={onClose}
      >
        <Animated.View 
            style={[
                styles.modalContent, 
                { height: targetHeight, transform: [{ translateY }] }
            ]}
            {...panResponder.panHandlers}
        >
          {/* 把手 (Handle Bar) */}
          <View style={styles.handleBarContainer}>
            <View style={styles.handleBar} />
          </View>
          
          {/* 标题栏 (仅在 List 模式显示) */}
          {mode === 'list' && title && (
            <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
            </View>
          )}

          {/* 内容区域 */}
          <View style={{ flex: 1 }}>
             {children}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handleBarContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, width: '100%', backgroundColor: '#FFF' },
  handleBar: { width: 40, height: 5, backgroundColor: '#E5E7EB', borderRadius: 2.5 },
  modalHeader: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6', backgroundColor: '#FFF' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#111', textAlign: 'center' },
});