import React from 'react';
import { Platform, type ViewStyle } from 'react-native';
import { TopFadeMaskView } from './TopFadeMaskView';

interface Props {
  topFadeRatio?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * iOS≥26 transparent header + `scrollEdgeEffects:'soft'` 已在系统层提供顶部
 * alpha fade。iOS<26 上 `scrollEdgeEffects` 是 graceful no-op，没有 fade →
 * 用 TopFadeMaskView 手动接近视觉。
 *
 * 使用：包在 ScrollView/FlatList 外层。如里层是 RefreshControl 列表，请在
 * Phase 4 audit 时实测：MaskedView 会把指示器 alpha mask 成透明，可能不可见。
 *
 * topFadeRatio 不传则透传 TopFadeMaskView default (0.15)。
 */
export function ScrollEdgeFallback({ topFadeRatio, style, children }: Props) {
  const iosVersion = parseInt(String(Platform.Version), 10);
  if (Platform.OS === 'ios' && iosVersion >= 26) {
    return <>{children}</>;
  }
  return (
    <TopFadeMaskView topFadeRatio={topFadeRatio} style={style}>
      {children}
    </TopFadeMaskView>
  );
}
