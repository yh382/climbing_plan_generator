import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActivitySegment = "sessions" | "training" | "analysis";

type SettingsState = {
  cloudStats: boolean;
  setCloudStats: (v: boolean) => void;
  activitySegment: ActivitySegment;
  setActivitySegment: (v: ActivitySegment) => void;
};

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cloudStats: false,
      setCloudStats: (v) => set({ cloudStats: v }),
      activitySegment: "sessions",
      setActivitySegment: (v) => set({ activitySegment: v }),
    }),
    {
      name: "climmate-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSettingsStore;
