import { requireOptionalNativeModule } from "expo-modules-core";

interface ClimmateLiveActivityNative {
  start(gymName: string, discipline: string, startTime: number): Promise<string | null>;
  update(routeCount: number, sendCount: number, bestGrade: string): Promise<void>;
  end(routeCount: number, sendCount: number, bestGrade: string): Promise<void>;
  endAll(): Promise<void>;
}

// Use optional so JS can still run on Android / Expo Go without crashing.
const ClimmateLiveActivity =
  requireOptionalNativeModule<ClimmateLiveActivityNative>("ClimmateLiveActivity");

export default ClimmateLiveActivity;
