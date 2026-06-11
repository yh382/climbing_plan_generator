// src/components/ui/MenuPill.tsx
//
// Inline native UIMenu trigger — the body-area equivalent of
// `Stack.Toolbar.Menu` (both wrap UIKit's `UIMenu`).
//
// Convention (codified in
// climbing_plan_generator/CLAUDE.md → "Inline option menus"):
// whenever a tap should show a fixed list of options to pick from —
// e.g. "change block type", "change load unit", "swap / delete" —
// reach for `MenuPill` BEFORE `ActionSheetIOS`. UIMenu pops up
// anchored to the trigger and feels lightweight; ActionSheet slides
// from the bottom and reads as a heavier modal.
//
// Implementation notes (verified against
// node_modules/@expo/ui/ios/Menu/MenuView.swift +
// node_modules/@expo/ui/build/swift-ui/modifiers/shapes/index.d.ts):
//
//   - SwiftUI's `Label(title, systemImage:)` ALWAYS paints icon-left
//     of title. `labelStyle()` controls iconOnly / titleOnly /
//     titleAndIcon visibility but **not the order**. So when a
//     designer asks for "chevron right of text" (Motra-style "Main ⌄"),
//     the only path is to compose the label by hand with an HStack +
//     Text + Image and pass it as a ReactNode `label` to the Menu —
//     hitting Swift's `else if let labelContent` slot branch in
//     MenuView.swift instead of the string fast-path.
//
//   - For the pill background: SwiftUI Menu wraps the label in its
//     own button chrome. Applying `background(color, capsule())` on
//     our HStack paints the pill **inside** the menu's tap area.
//
//   - For trigger text color: `foregroundStyle` on the Text + an
//     explicit `color` on the Image. We DON'T use `tint` on the Host
//     because tint cascades through the menu items as well and
//     repaints the popover row text in our color — defeats the
//     destructive (red) variant on rows like "Delete exercise".

import React from "react";
import { StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import { Host, Menu, Button, HStack, Text, Image } from "@expo/ui/swift-ui";
import {
  background,
  fixedSize,
  foregroundStyle,
  frame,
  glassEffect,
  padding,
  shapes,
} from "@expo/ui/swift-ui/modifiers";
import { type SFSymbol } from "sf-symbols-typescript";

import { useThemeColors } from "@/lib/useThemeColors";

export interface MenuOption {
  label: string;
  /** SF Symbol shown next to the row label inside the menu popover. */
  systemImage?: SFSymbol;
  /** When true the row renders red; reserve for irreversible actions. */
  destructive?: boolean;
  onPress: () => void;
}

interface CommonProps {
  options: MenuOption[];
  /** Pass through to the Host wrapper for sizing / positioning. */
  style?: StyleProp<ViewStyle>;
  /** Accessibility label for the trigger. */
  accessibilityLabel?: string;
}

interface DotsProps extends CommonProps {
  variant: "dots";
}

interface LabeledProps extends CommonProps {
  variant: "labeled";
  /** Visible button text — e.g. "Main", "lb", "% Max". */
  label: string;
  /** When true, drop the capsule background — leaves only text +
   *  chevron. Use inside an already-bordered row (e.g. the white
   *  settings-row card) so the trigger doesn't paint a pill-in-a-pill. */
  chromeless?: boolean;
  /** Use an iOS-26 Liquid Glass capsule instead of the solid
   *  backgroundSecondary capsule — for placement on glass surfaces. */
  glass?: boolean;
}

export type MenuPillProps = DotsProps | LabeledProps;

export function MenuPill(props: MenuPillProps) {
  const colors = useThemeColors();

  if (props.variant === "dots") {
    // Dots variant — no background, just a tappable icon. Used inline
    // in item-card headers where the surrounding card is already a
    // visual container.
    //
    // Layout-stability gotchas we tripped on:
    //
    //   1. Don't apply `buttonStyle("plain")` to Menu. SwiftUI re-
    //      interprets `plain` on Menu as "inline expanded list" (drops
    //      the popover affordance and lays the items into the parent
    //      VStack), which makes the trigger icon drift to the bottom
    //      of whatever container it sits in. Pop-over UIMenu is the
    //      Menu's default style — leave it untouched.
    //   2. Don't enable `matchContents` on Host. SwiftUI Menu briefly
    //      mutates intrinsic size during its open/dismiss animation;
    //      with matchContents that propagates to RN and the icon
    //      visibly bobs when ScrollView is mid-scroll.
    //
    // Working recipe: caller's RN style hands the Host a fixed 44×44
    // frame, the Image gets a matching SwiftUI `frame(44×44, center)`
    // so the tap zone fills it, and the Menu keeps its native
    // popover affordance.
    return (
      <Host style={[styles.host, props.style]}>
        <Menu
          label={
            <Image
              systemName="ellipsis"
              size={18}
              color={colors.textSecondary}
              modifiers={[
                frame({ width: 44, height: 44, alignment: "center" }),
              ]}
            />
          }
        >
          {props.options.map((opt, i) => (
            <Button
              key={`${opt.label}-${i}`}
              label={opt.label}
              systemImage={opt.systemImage}
              role={opt.destructive ? "destructive" : "default"}
              onPress={opt.onPress}
            />
          ))}
        </Menu>
      </Host>
    );
  }

  // Labeled variant — pill background, text first, chevron after.
  // Composed by hand because SwiftUI Label can't swap title↔icon order.
  //
  // Modifier order is load-bearing:
  //   1. `fixedSize()` — critical. Without it the parent SwiftUI Menu
  //      proposes 0pt width during layout, the inner Text measures at
  //      0pt and renders invisibly. Forcing intrinsic size makes the
  //      HStack measure to "<text> + spacing + <chevron>" regardless.
  //   2. `padding(...)` extends the visible frame around the
  //      now-sized content.
  //   3. `background(color, capsule())` paints the pill behind the
  //      padded content. (Don't add a separate `cornerRadius(999)` —
  //      it's redundant with the capsule shape and can fight the
  //      layout.)
  const labeledModifiers = props.chromeless
    ? [fixedSize()]
    : props.glass
      ? [
          fixedSize(),
          padding({ horizontal: 12, vertical: 6 }),
          glassEffect({
            glass: { variant: "regular", interactive: true },
            shape: "capsule",
          }),
        ]
      : [
          fixedSize(),
          padding({ horizontal: 12, vertical: 6 }),
          background(colors.backgroundSecondary as string, shapes.capsule()),
        ];

  return (
    <Host matchContents style={[styles.host, props.style]}>
      <Menu
        label={
          <HStack spacing={4} modifiers={labeledModifiers}>
            <Text
              modifiers={[foregroundStyle(colors.textPrimary as string)]}
            >
              {props.label}
            </Text>
            <Image
              systemName="chevron.down"
              size={11}
              color={colors.textPrimary}
            />
          </HStack>
        }
      >
        {props.options.map((opt, i) => (
          <Button
            key={`${opt.label}-${i}`}
            label={opt.label}
            systemImage={opt.systemImage}
            role={opt.destructive ? "destructive" : "default"}
            onPress={opt.onPress}
          />
        ))}
      </Menu>
    </Host>
  );
}

const styles = StyleSheet.create({
  // Host with `matchContents` sizes to its SwiftUI content. The
  // caller-supplied `style` controls layout placement.
  host: {},
});
