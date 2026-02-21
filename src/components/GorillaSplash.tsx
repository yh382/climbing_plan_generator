// src/components/GorillaSplash.tsx

import React, { useEffect } from 'react';
import { View, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withDelay,
  Easing
} from 'react-native-reanimated';

// 引用图片 (保持 require 写法)
const gorillaHeadImg = require('../../assets/images/gorilla_head.png');
const climbMateTextImg = require('../../assets/images/climb_mate_text.png');

interface Props {
  onAnimationFinish: () => void;
}

export default function GorillaSplash({ onAnimationFinish }: Props) {
  // 1. 猩猩动画状态
  const gorillaOpacity = useSharedValue(0); 
  const gorillaTranslateY = useSharedValue(20); 
  
  // 2. 文字动画状态
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(10); 

  useEffect(() => {
    // 动作 1: 猩猩慢慢浮现
    gorillaOpacity.value = withTiming(1, { duration: 1200 });
    gorillaTranslateY.value = withTiming(0, { 
      duration: 1200, 
      easing: Easing.out(Easing.exp)
    });

    // 动作 2: 文字延迟浮现
    textOpacity.value = withDelay(500, withTiming(1, { duration: 1000 }));
    textTranslateY.value = withDelay(500, withTiming(0, { duration: 1000 }));

    // 动作 3: 结束
    const timer = setTimeout(() => {
      onAnimationFinish();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const gorillaStyle = useAnimatedStyle(() => ({
    opacity: gorillaOpacity.value,
    transform: [{ translateY: gorillaTranslateY.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <View style={styles.container}>
      {/* 主内容容器 
         - width: 限制内容宽度，确保文字和猩猩不会离得太远
         - marginTop: 整体往下移 (调整这个值控制垂直位置)
      */}
      <View style={styles.mainContent}>
        
        {/* 文字区域：利用 Flex 自身对齐放到左边 */}
        <Animated.View style={[styles.textWrapper, textStyle]}>
          <Image 
              source={climbMateTextImg} 
              style={styles.textImage}
              resizeMode="contain" 
          />
        </Animated.View>

        {/* 猩猩区域：利用 Margin 把它挤到右边去 */}
        <Animated.Image 
          source={gorillaHeadImg} 
          style={[styles.gorillaImage, gorillaStyle]}
          resizeMode="contain"
        />
        
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', 
    justifyContent: 'center', 
    zIndex: 9999,
  },
  mainContent: {
    // [关键修改]
    width: 300,      // 固定宽度，形成一个"舞台"，保证内部相对位置稳定
    marginTop: -80,   // 正值 = 整体往下移；负值 = 整体往上移。觉得不够下就加大这个数
    
    // 这里的 padding 可以微调内部间距
    paddingHorizontal: 20, 
  },
  
  textWrapper: {
    // [关键修改] 不再用 absolute
    alignSelf: 'flex-start', // 让文字靠容器的左边
    marginBottom: -20,       // 负 Margin 让文字和下面的猩猩稍微重叠一点点，更紧凑
    zIndex: 10,              // 保证文字在猩猩上面
    marginLeft: -100,          // 稍微往里缩一点，不要贴死左边
  },
  textImage: {
    width: 300, 
    height: 140, 
  },

  gorillaImage: {
    // [关键修改] 
    alignSelf: 'center',     // 猩猩居中（或者用 flex-end 靠右）
    width: 220,
    height: 220,
    marginLeft: 60,          // 利用左边距把它往右边挤，形成"偏右"的效果
  },
});