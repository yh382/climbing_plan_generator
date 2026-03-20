import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type SettingsState = {
  cloudStats: boolean;
  setCloudStats: (v: boolean) => void;
};

const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      cloudStats: false,
      setCloudStats: (v) => set({ cloudStats: v }),
    }),
    {
      name: "climmate-settings",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useSettingsStore;
