import { create } from "zustand";
import type { GymPlace, LatLng } from "../../lib/poi/types";

interface GymsState {
  gyms: GymPlace[];
  loading: boolean;
  error: string | null;
  selectedGym: GymPlace | null;
  sheetIndex: number;
  query: string;
  userLoc: LatLng | null;
  center: LatLng | null;

  setGyms: (gyms: GymPlace[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedGym: (gym: GymPlace | null) => void;
  setSheetIndex: (index: number) => void;
  setQuery: (query: string) => void;
  setUserLoc: (loc: LatLng | null) => void;
  setCenter: (loc: LatLng | null) => void;
}

export const useGymsStore = create<GymsState>((set) => ({
  gyms: [],
  loading: false,
  error: null,
  selectedGym: null,
  sheetIndex: 1,
  query: "",
  userLoc: null,
  center: null,

  setGyms: (gyms) => set({ gyms }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSelectedGym: (selectedGym) => set({ selectedGym }),
  setSheetIndex: (sheetIndex) => set({ sheetIndex }),
  setQuery: (query) => set({ query }),
  setUserLoc: (userLoc) => set({ userLoc }),
  setCenter: (center) => set({ center }),
}));
