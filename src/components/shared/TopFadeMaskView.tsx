import React from 'react';
import { type ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  /** Ratio of total height for the top alpha fade zone (0..1).
   *  Default 0.08 — covers ~64pt at iPhone 15 height, just enough to
   *  blend nav bar (~50pt) without darkening too much real content
   *  underneath. Sheets with a pinned title overlay can override to
   *  0.15 if they need to cover taller chrome. */
  topFadeRatio?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * Wraps scrollable content with a top alpha gradient mask. Content
 * fades to transparent at the very top, ramps to full opacity at
 * `topFadeRatio` of total height. Below that, content is fully visible.
 *
 * Use to make scroll content gracefully fade behind a pinned title
 * overlay (or just at sheet top), mimicking Apple Maps Place sheet's
 * soft scroll edge effect.
 *
 * NOTE on iOS 26 system effects: we don't use TrueSheet's
 * `topScrollEdgeEffect: 'soft'` because iOS 26's
 * `UIScrollEdgeElementContainerInteraction` (registered by passing a
 * TrueSheet `header` prop) forces hard chrome material on the top edge
 * regardless of style override. There's no UIKit API to opt out; SwiftUI
 * has `safeAreaBar` but it doesn't apply to RN/UIKit ScrollViews.
 * Manual MaskedView alpha mask is what Apple Maps actually does.
 *
 * NOTE on bottom: bottom alpha mask is intentionally omitted. iOS
 * MaskedView doesn't reliably composite a bottom fade (tested:
 * multi-child column, 4-stop single gradient — bottom never rendered
 * visually despite mask layout being correct).
 *
 * Layout constraint: this component renders `<MaskedView>` directly
 * (no wrapping View), so when used as a direct child of TrueSheet,
 * MaskedView is at level 1 and the ScrollView passed as children is
 * at level 2 — within TrueSheet's `findScrollView` 2-level recursion
 * limit (see node_modules/@lodev09/react-native-true-sheet/ios/
 * TrueSheetContentView.mm:182-194).
 */
export function TopFadeMaskView({
  topFadeRatio = 0.08,
  style,
  children,
}: Props) {
  return (
    <MaskedView
      style={[{ flex: 1 }, style]}
      maskElement={
        <LinearGradient
          colors={['transparent', 'black']}
          locations={[0, topFadeRatio]}
          style={{ flex: 1 }}
          pointerEvents="none"
        />
      }
    >
      {children}
    </MaskedView>
  );
}
