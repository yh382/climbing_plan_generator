import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

/** TR7: Activity tab is now 2-segment. "analysis" was removed and its
 *  content moved to the full-screen app/analysis.tsx route, reached via
 *  the Quick Insights ribbon on each remaining segment. Old persisted
 *  values are silently coerced to "sessions" by `setActivitySegment`
 *  and the initial-read hydration below. */
export type ActivitySegment = "sessions" | "training";
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
      // TR7 migration: persisted state for users who already saved
      // activitySegment="analysis" before this window. Coerce on rehydrate
      // so they don't land on a segment that no longer exists. Cheap one-
      // pass migration; once shipped we can drop this in a future cleanup.
      onRehydrateStorage: () => (state) => {
        if (
          state
          // narrow to the legacy string union without typing it explicitly
          && (state.activitySegment as string) === "analysis"
        ) {
          state.activitySegment = "sessions";
        }
      },
    }
  )
);

export default useSettingsStore;
