// src/components/DualMiniRings.tsx
import React from "react";
import { View } from "react-native";
import Svg, { Circle, G } from "react-native-svg";

type Props = {
  size?: number;           
  outerValue: number;      // 训练完成度 0.0 - 1.0
  innerValue?: number;     // 攀爬进度 (例如 1.4)
  
  outerColor?: string;     
  innerColor?: string;     
  trackColor?: string;     // 默认底轨颜色
  
  outerThickness?: number;
  innerThickness?: number;
  gap?: number;
};

export default function DualMiniRings({
  size = 32,
  outerValue = 0,
  innerValue = 0, 
  outerColor = "#A5D23D", 
  innerColor = "#3B82F6", 
  trackColor = "#E5E7EB",    
  outerThickness = 2.5,
  innerThickness = 2.5,
  gap = 1.5,
}: Props) {
  const center = size / 2;

  // --- 1. 外环数据计算 ---
  const rOuter = (size - outerThickness) / 2;
  const cOuter = 2 * Math.PI * rOuter;
  // 限制在 0-1 之间
  const vOuter = Math.min(1, Math.max(0, outerValue));
  const dashOuter = cOuter * vOuter;

  // --- 2. 内环数据计算 ---
  const rInner = rOuter - outerThickness - gap;
  const cInner = 2 * Math.PI * rInner;
  
  const fullLoops = Math.floor(innerValue); 
  const progress = innerValue % 1;
  
  // 颜色逻辑 (无底洞覆盖效果)
  let currentTrackColor = trackColor;
  let currentTrackOpacity = 0.5; // 默认轨道的透明度
  let currentProgress = progress;

  if (fullLoops > 0) {
      // 第二圈开始：底轨变蓝且半透明
      currentTrackColor = innerColor;
      currentTrackOpacity = 0.25; 
      
      // 如果刚好整圈，显示满圈
      if (progress === 0 && innerValue > 0) currentProgress = 1;
  } else {
      // 第一圈：如果刚好整圈，显示满圈
      if (progress === 0 && innerValue > 0) currentProgress = 1;
  }

  const dashInner = cInner * currentProgress;

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      {/* [关键修复]
         1. 移除 Svg 标签上的 rotation="-90" (这种方式有时不稳定)
         2. 在 G 标签上添加 rotation="-90"
         3. 明确指定旋转中心点 originX 和 originY 为画布中心
      */}
      <Svg width={size} height={size}>
        <G rotation="-90" originX={center} originY={center}>
          
          {/* === 外环 (Training) === */}
          {/* 轨道 */}
          <Circle
            cx={center} cy={center} r={rOuter}
            stroke={trackColor} strokeWidth={outerThickness} fill="none" 
            strokeOpacity={0.5} // 轨道半透明
          />
          {/* 进度 */}
          {outerValue > 0 && (
            <Circle
              cx={center} cy={center} r={rOuter}
              stroke={outerColor} strokeWidth={outerThickness} fill="none"
              // 使用 strokeDasharray 实现进度条：实线长度 + 空白长度
              strokeDasharray={`${dashOuter} ${cOuter}`}
              strokeLinecap="round" // 圆角端点
            />
          )}

          {/* === 内环 (Log) === */}
          {/* 轨道 (颜色会变) */}
          <Circle
            cx={center} cy={center} r={rInner}
            stroke={currentTrackColor} 
            strokeOpacity={currentTrackOpacity}
            strokeWidth={innerThickness} fill="none" 
          />
          {/* 进度 */}
          {innerValue > 0 && (
            <Circle
              cx={center} cy={center} r={rInner}
              stroke={innerColor} strokeWidth={innerThickness} fill="none"
              strokeDasharray={`${dashInner} ${cInner}`}
              strokeLinecap="round"
            />
          )}
        </G>
      </Svg>
    </View>
  );
}