import React, { useEffect, useRef, useState } from 'react';
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

type Props = {
  visible: boolean;
  onClose: () => void;
  username: string;
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

export default function ShareProfileModal({ visible, onClose, username }: Props) {
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
      // 1. 修改动画类型为 fade，这样背景阴影是渐现的，不会跟着内容一起“拉起来”
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

            <View style={styles.gridContainer}>
              <ShareOption 
                icon={copied ? "checkmark-circle" : "link-outline"} 
                label={copied ? "Copied!" : "Copy Link"} 
                onPress={handleCopyLink}
                color={copied ? "#10B981" : "#1E293B"}
              />

              <ShareOption 
                icon="share-social-outline" 
                label="More Options" 
                onPress={handleSystemShare} 
              />

              <ShareOption 
                icon="qr-code-outline" 
                label="QR Code" 
                onPress={() => console.log('QR Code logic')} 
              />
            </View>

            {/* 3. 已移除 Cancel 按钮，整体布局更紧凑 */}
            
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const ShareOption = ({ icon, label, onPress, color = "#1E293B" }: any) => (
  <TouchableOpacity style={styles.optionBtn} onPress={onPress} activeOpacity={0.7}>
    <View style={styles.iconCircle}>
      <Ionicons name={icon} size={28} color={color} />
    </View>
    <Text style={styles.optionLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)', // 背景阴影
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, // 圆角稍微加大一点
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    // 阴影效果 (iOS/Android)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  dragHandleArea: {
    width: '100%',
    height: 30, // 增加可触摸区域
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 28, // 增加一点间距替代原来的布局
    marginTop: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10, // 底部留白
  },
  optionBtn: {
    alignItems: 'center',
    width: 80,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  optionLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    fontWeight: '500',
  },
});