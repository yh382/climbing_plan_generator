import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Share,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeColors } from '@/lib/useThemeColors';

type Props = {
  visible: boolean;
  onClose: () => void;
  username: string;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ShareProfileModal({ visible, onClose, username }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const profileUrl = `https://climmate.app/u/${username}`;
  const [copied, setCopied] = useState(false);

  // 动画值：控制面板的垂直位移
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // 记录是否正在显示，用于处理关闭动画
  const [showModal, setShowModal] = useState(visible);

  useEffect(() => {
    if (visible) {
      setShowModal(true);
      // 打开时：背景渐变由 Modal 自带的 fade 处理，这里只处理面板上滑
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        damping: 20,
        stiffness: 90,
      }).start();
    } else {
      // 外部控制关闭时 (比如点背景)，先执行下滑动画再真正关闭
      closeWithAnimation();
    }
  }, [visible]);

  // 执行关闭动画的函数
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

  // 手势处理 (PanResponder) 实现下滑关闭
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 只有向下滑动距离 > 5 才接管手势
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // 跟随手指移动，但不能向上滑 (dy < 0 时由它去，或者限制为 0)
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // 如果下滑速度快 或 下滑距离超过阈值(100)，则关闭
        if (gestureState.vy > 0.5 || gestureState.dy > 100) {
          closeWithAnimation();
        } else {
          // 否则回弹复位
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 20, // 增加阻尼，回弹不那么晃
            stiffness: 200,
          }).start();
        }
      },
    })
  ).current;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSystemShare = async () => {
    try {
      await Share.share({
        message: `Check out ${username}'s climbing profile on climMate! ${profileUrl}`,
        url: profileUrl,
      });
      // 系统分享弹出后，建议保留当前弹窗，或者根据需求关闭
      // closeWithAnimation();
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  return (
    <Modal
      // 1. 修改动画类型为 fade，这样背景阴影是渐现的，不会跟着内容一起"拉起来"
      animationType="fade"
      transparent={true}
      visible={showModal}
      onRequestClose={closeWithAnimation}
    >
      {/* 点击背景关闭 */}
      <Pressable style={styles.overlay} onPress={closeWithAnimation}>

        {/* 内容面板 */}
        <Animated.View
          style={[
            styles.modalContent,
            {
              paddingBottom: insets.bottom + 20, // 3. 适配底部安全区
              transform: [{ translateY: translateY }],
            },
          ]}
          // 2. 绑定手势监听
          {...panResponder.panHandlers}
        >
          {/* 阻止点击内容区域穿透到背景关闭 */}
          <Pressable onPress={(e) => e.stopPropagation()}>

            {/* 顶部指示条 (也是手势的最佳触发区) */}
            <View style={styles.dragHandleArea}>
               <View style={styles.dragIndicator} />
            </View>

            <Text style={styles.title}>Share Profile</Text>

            {/* Copy Link */}
            <TouchableOpacity style={styles.actionRow} onPress={handleCopyLink} activeOpacity={0.7}>
              <View style={styles.actionIcon}>
                <Ionicons name={copied ? "checkmark-circle" : "link-outline"} size={17} color={copied ? "#10B981" : colors.textPrimary} />
              </View>
              <Text style={styles.actionText}>{copied ? "Copied!" : "Copy Link"}</Text>
            </TouchableOpacity>

            {/* More Options */}
            <TouchableOpacity style={[styles.actionRow, styles.actionRowBorder]} onPress={handleSystemShare} activeOpacity={0.7}>
              <View style={styles.actionIcon}>
                <Ionicons name="share-social-outline" size={17} color={colors.textPrimary} />
              </View>
              <Text style={styles.actionText}>More Options</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            </TouchableOpacity>

            {/* QR Code */}
            <TouchableOpacity style={styles.actionRow} onPress={() => console.log('QR Code logic')} activeOpacity={0.7}>
              <View style={styles.actionIcon}>
                <Ionicons name="qr-code-outline" size={17} color={colors.textPrimary} />
              </View>
              <Text style={styles.actionText}>QR Code</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
            </TouchableOpacity>

          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 16,
    paddingBottom: 32,
    minHeight: 220,
  },
  dragHandleArea: {
    width: '100%',
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragIndicator: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 20,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
  },
  actionRowBorder: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,0,0,0.06)',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  actionIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
});
