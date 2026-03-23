// src/features/community/components/SmartBottomSheet.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View, Text, StyleSheet, Modal, ScrollView,
  Animated, Dimensions, PanResponder, LayoutAnimation,
  Platform, UIManager, Pressable
} from "react-native";
import { useThemeColors } from "@/lib/useThemeColors";

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const [showModal, setShowModal] = useState(false);

  const targetHeight = mode === 'menu' ? SCREEN_HEIGHT * 0.32 : SCREEN_HEIGHT * 0.9;

  const animateClose = () => {
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
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          animateClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4
          }).start();
        }
      }
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0
      }).start();
    } else if (showModal) {
      // visible turned false externally — animate out then unmount
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setShowModal(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (visible) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
  }, [mode]);

  if (!showModal) return null;

  return (
    <Modal transparent visible={showModal} onRequestClose={animateClose}>
      <Pressable style={styles.modalOverlay} onPress={animateClose}>
        <Animated.View
          style={[
            styles.modalContent,
            { height: targetHeight, transform: [{ translateY }] }
          ]}
        >
          {/* Handle Bar — draggable to dismiss */}
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View {...panResponder.panHandlers}>
              <View style={styles.handleBarContainer}>
                <View style={styles.handleBar} />
              </View>
            </View>

            {/* Title (list mode only) */}
            {mode === 'list' && title && (
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
              </View>
            )}
          </Pressable>

          {/* Scrollable content */}
          <ScrollView
            style={{ flex: 1 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              {children}
            </Pressable>
          </ScrollView>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  handleBarContainer: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, width: '100%', backgroundColor: colors.background },
  handleBar: { width: 40, height: 5, backgroundColor: colors.cardBorder, borderRadius: 2.5 },
  modalHeader: { paddingHorizontal: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.cardBorder, backgroundColor: colors.background },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
});
