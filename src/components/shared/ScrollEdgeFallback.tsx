import React from 'react';
import { type ViewStyle } from 'react-native';

interface Props {
  topFadeRatio?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * **DEPRECATED — passthrough wrapper, kept for call-site compatibility.**
 *
 * Original intent (COMPAT Phase 3): manually fade content below transparent
 * header on iOS<26 since `scrollEdgeEffects:'soft'` is a no-op there.
 *
 * Real-device test on iOS 18 (2026-05-05) showed the manual MaskedView fade
 * is **redundant** when `headerTransparent` is undefined on iOS<26: the
 * native UINavigationBar already provides translucent material + scrollEdge
 * transparency that handles the fade gracefully. Stacking a MaskedView on
 * top creates a double-fade that darkens content (light pages get a visible
 * white band, dark pages get a gray band).
 *
 * Component now passes children through on every platform / version. Left
 * in place to avoid editing 45+ call sites; remove on next big sweep.
 */
export function ScrollEdgeFallback({ children }: Props) {
  return <>{children}</>;
}
