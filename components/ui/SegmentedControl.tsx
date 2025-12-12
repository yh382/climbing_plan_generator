// src/components/ui/SegmentedControl.tsx
import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  ViewStyle,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

// 你的主题色
const PRIMARY_COLOR = "#306E6F";

type Props = {
  values: string[];
  selectedIndex: number;
  onChange: (index: number) => void;
  style?: ViewStyle;
};

export default function SegmentedControl({
  values,
  selectedIndex,
  onChange,
  style,
}: Props) {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const widthPercent = 100 / values.length;
  const position = useSharedValue(selectedIndex * widthPercent);

  useEffect(() => {
    position.value = withSpring(selectedIndex * widthPercent, {
      mass: 0.5,    // [微调] 减少质量，回弹更轻快
      damping: 12,
      stiffness: 120,
    });
  }, [selectedIndex, values.length]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthPercent}%`,
    left: `${position.value}%`,
  }));

  return (
    <View
      style={[
        styles.container,
        // [修改] 背景色更浅，更融合
        { backgroundColor: isDark ? "#1E293B" : "#F3F4F6" },
        style,
      ]}
    >
      {/* 1. 白色滑块 */}
      <Animated.View
        style={[
          styles.slider,
          { backgroundColor: isDark ? "#334155" : "#FFFFFF" },
          animatedStyle,
        ]}
      />

      {/* 2. 文字选项 */}
      {values.map((value, index) => {
        const isActive = selectedIndex === index;
        return (
          <TouchableOpacity
            key={index}
            onPress={() => onChange(index)}
            activeOpacity={0.7}
            style={styles.item}
          >
            <Text
              style={[
                styles.label,
                {
                  // [修改] 选中时使用主题色，未选中用柔和灰
                  color: isActive
                    ? (isDark ? "#FFFFFF" : PRIMARY_COLOR) 
                    : (isDark ? "#94A3B8" : "#64748B"),
                  // [修改] 选中加粗，未选中标准
                  fontWeight: isActive ? "700" : "500",
                  // 稍微调整字号
                  fontSize: 13,
                },
              ]}
            >
              {value}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40, // [修改] 稍微加高一点点，更有点击感
    borderRadius: 20, // [修改] 全圆角 (高度的一半)
    flexDirection: "row",
    alignItems: "center",
    padding: 4, // [修改] 内部留白加大，让滑块有呼吸感
    
    // 可选：加一点极淡的边框让轮廓更清晰
    // borderWidth: 1,
    // borderColor: "#F1F5F9" 
  },
  slider: {
    position: "absolute",
    top: 4, 
    bottom: 4,
    // left/width 由动画控制
    
    borderRadius: 16, // [修改] 内部圆角适配
    
    // [修改] 阴影更柔和
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  item: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    zIndex: 1, // 确保文字在滑块上面
  },
  label: {
    // 字体样式在行内动态定义了
  },
});