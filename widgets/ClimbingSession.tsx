// widgets/ClimbingSession.tsx
//
// STUB: The actual Live Activity UI is rendered by pure SwiftUI code in native/widget/.
// This file only exists so expo-widgets creates the LiveActivityObject native module,
// which handles ActivityKit start/update/end calls from JavaScript.

import { createLiveActivity } from "expo-widgets";

export type ClimbingSessionProps = {
  gymName: string;
  discipline: string;
  startTime: number;
  routeCount: number;
  sendCount: number;
  bestGrade: string;
};

const ClimbingSession = (_props: ClimbingSessionProps) => {
  "widget";
  // Stub — native SwiftUI handles rendering
  return null as any;
};

export default createLiveActivity("ClimbingSession", ClimbingSession);
