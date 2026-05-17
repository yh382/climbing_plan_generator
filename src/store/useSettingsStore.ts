import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ActivitySegment = "sessions" | "training" | "analysis";
/** Primary climbing discipline preference (BK). Drives the outdoor
 *  area sheet's Routes/Boulder toggle default + any future
 *  discipline-aware UI choices. Falls back to the other discipline
 *  automatically when an area has zero of the user's preferred type. */
export type PrimaryDiscipline = "boulder" | "rope";

type SettingsState = {
  cloudStats: boolean;
  setCloudStats: (v: boolean) => void;
  activitySegment: ActivitySegment;
  setActivitySegment: (v: ActivitySegment) => void;
  primaryDiscipline: PrimaryDiscipline;
  setPrimaryDiscipline: (v: PrimaryDiscipline) => void;
};

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cloudStats: false,
      setCloudStats: (v) => set({ cloudStats: v }),
      activitySegment: "sessions",
      setActivitySegment: (v) => set({ activitySegment: v }),
      primaryDiscipline: "boulder",
      setPrimaryDiscipline: (v) => set({ primaryDiscipline: v }),
    }),
    {
      name: "climmate-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSettingsStore;
