// src/components/GorillaSplash.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring, 
  withDelay, 
  withSequence,
  withTiming,
  runOnJS 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface Props {
  onAnimationFinish: () => void;
}

export default function GorillaSplash({ onAnimationFinish }: Props) {
  // 1. 猩猩的位置 (初始在屏幕下方看不见的位置)
  const gorillaTranslateY = useSharedValue(200); 
  
  // 2. 气泡的透明度 (初始隐藏)
  const bubbleOpacity = useSharedValue(0);
  const bubbleScale = useSharedValue(0);

  useEffect(() => {
    // --- 动画编排 ---
    
    // 步骤 1: 猩猩头冒出来 (Spring 弹簧效果)
    gorillaTranslateY.value = withSpring(0, {
      damping: 12, // 阻尼，越小越弹
      stiffness: 100,
    });

    // 步骤 2: 延迟 600ms 后，气泡弹出
    bubbleOpacity.value = withDelay(600, withTiming(1, { duration: 300 }));
    bubbleScale.value = withDelay(600, withSpring(1));

    // 步骤 3: 停留 2秒 后，通知父组件动画结束 (进入 App)
    setTimeout(() => {
      onAnimationFinish();
    }, 2800); // 总时长约 3秒 (0.6 + 0.3 + 停留时间)

  }, []);

  // 猩猩样式
  const gorillaStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: gorillaTranslateY.value }],
    };
  });

  // 气泡样式
  const bubbleStyle = useAnimatedStyle(() => {
    return {
      opacity: bubbleOpacity.value,
      transform: [
        { scale: bubbleScale.value },
        { translateY: -10 } // 稍微往上浮一点
      ],
    };
  });

  return (
    <View style={styles.container}>
      
      {/* 气泡区域 */}
      <Animated.View style={[styles.bubbleContainer, bubbleStyle]}>
        <View style={styles.bubble}>
            <Text style={styles.bubbleText}>Climb, Mate?</Text>
            {/* 气泡的小尾巴 */}
            <View style={styles.bubbleTail} />
        </View>
      </Animated.View>

      {/* 猩猩图片区域 (Mask View 遮罩，确保猩猩是从"边缘"冒出来的感觉) */}
      <View style={styles.maskContainer}>
          <Animated.Image 
            // 请替换为您的猩猩图片
            source={{ uri: 'https://img.icons8.com/color/400/gorilla.png' }} 
            style={[styles.gorilla, gorillaStyle]}
            resizeMode="contain"
          />
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // 背景色
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  maskContainer: {
    overflow: 'hidden', // 关键：如果需要猩猩从某个线条后冒出来，可以调整这个容器的高度
    paddingTop: 20,     // 给弹簧动画留点空间
    alignItems: 'center',
  },
  gorilla: {
    width: 180,
    height: 180,
  },
  bubbleContainer: {
    marginBottom: 10, // 气泡在猩猩头顶
    alignItems: 'center',
  },
  bubble: {
    backgroundColor: '#111',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    position: 'relative',
  },
  bubbleText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 18,
  },
  bubbleTail: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#111', // 跟气泡背景色一致
  },
});