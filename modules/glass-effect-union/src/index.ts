import { requireNativeView } from "expo";
import type { ComponentType, ReactNode } from "react";

/**
 * Config shape consumed by @expo/ui's `applyModifiers` bridge.
 * The { $type, ...params } shape is stable across @expo/ui versions.
 */
export type GlassEffectUnionConfig = {
  $type: "glassEffectUnion";
  id: string;
};

/**
 * Mirrors SwiftUI iOS 26's `.glassEffectUnion(id:namespace:)`. All views
 * with the same `id` inside the same `<GlassUnionGroup>` render as a single
 * seamless liquid glass shape. Must be used inside `<GlassUnionGroup>`
 * (provides the Namespace) AND inside `<GlassEffectContainer>`.
 */
export const glassEffectUnion = (id: string): GlassEffectUnionConfig => ({
  $type: "glassEffectUnion",
  id,
});

type GlassUnionGroupProps = { children?: ReactNode };

/**
 * Provides a SwiftUI `@Namespace` to descendants via the environment.
 * Every child carrying a `glassEffectUnion(id)` modifier binds to this
 * namespace, enabling seamless multi-view glass unions.
 */
export const GlassUnionGroup: ComponentType<GlassUnionGroupProps> =
  requireNativeView("GlassEffectUnion", "GlassUnionGroupView");
