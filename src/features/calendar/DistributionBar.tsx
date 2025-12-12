// src/features/calendar/DistributionBar.tsx
import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";

type Part = {
  color: string;
  count: number;
  grade?: string;
};

type Props = {
  parts: Part[];
  total: number;
  height?: number;
  style?: ViewStyle;
};

export default function DistributionBar({ parts, total, height = 8, style }: Props) {
  // 空状态：显示灰色条
  if (total === 0) {
    return (
      <View style={[styles.container, { height }, style]}>
         <View style={[styles.bar, { backgroundColor: '#E5E7EB', width: '100%' }]} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }, style]}>
      {parts.map((p, i) => {
        if (p.count === 0) return null;
        const flexVal = p.count / total;
        return (
          <View
            key={i}
            style={{
              flex: flexVal,
              backgroundColor: p.color,
              height: "100%",
              // 内部圆角逻辑：首尾圆角，中间直角
              borderTopLeftRadius: i === 0 ? height / 2 : 0,
              borderBottomLeftRadius: i === 0 ? height / 2 : 0,
              borderTopRightRadius: i === parts.length - 1 ? height / 2 : 0,
              borderBottomRightRadius: i === parts.length - 1 ? height / 2 : 0,
              marginRight: 1, // 极细间隔
            }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    borderRadius: 999, // 胶囊形状
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 999,
  }
});