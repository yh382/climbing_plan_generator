// widgets/ClimMateWidget.tsx
//
// STUB: The actual widget UI is rendered by pure SwiftUI code in native/widget/.
// This file only exists so expo-widgets creates the WidgetObject native module,
// which writes data to shared UserDefaults for the native widget to read.

import { createWidget } from "expo-widgets";
import type { WidgetEnvironment } from "expo-widgets";

export type ClimMateWidgetProps = {
  weekClimbDays: number;
  weekSends: number;
  streak: number;
  lastSessionGym: string;
  lastSessionDate: string;
  lastSessionBest: string;
  lastSessionDuration: string;
  hasActiveSession: boolean;
};

const ClimMateWidget = (
  _props: ClimMateWidgetProps,
  _env: WidgetEnvironment
) => {
  "widget";
  // Stub — native SwiftUI handles rendering
  return null as any;
};

export default createWidget("ClimMateWidget", ClimMateWidget);
