import { requireOptionalNativeModule } from "expo-modules-core";

interface ClimmateLiveActivityNative {
  start(gymName: string, discipline: string, startTime: number): Promise<string | null>;
  // B2: paused arg drives gray-timer + "Paused" chip rendering on the lock screen
  // / Dynamic Island. Default false (active state) when omitted by older callers.
  update(routeCount: number, sendCount: number, bestGrade: string, attempts: number, paused: boolean): Promise<void>;
  end(routeCount: number, sendCount: number, bestGrade: string, attempts: number): Promise<void>;
  endAll(): Promise<void>;
}

// Use optional so JS can still run on Android / Expo Go without crashing.
const ClimmateLiveActivity =
  requireOptionalNativeModule<ClimmateLiveActivityNative>("ClimmateLiveActivity");

export default ClimmateLiveActivity;
