import Constants from "expo-constants";
import type { LatLng, GymPlace, PoiProvider } from "./types";
import { googlePoiProvider } from "./GooglePoiProvider";

export type { LatLng, GymPlace, PoiProvider };

const provider: PoiProvider = googlePoiProvider({
  apiKey: (Constants.expoConfig?.extra as any)?.googleMapsApiKey as string,
});

export async function searchGymsNearby(center: LatLng, radiusMiles = 30, keyword = ""): Promise<GymPlace[]> {
  return provider.searchGymsNearby(center, radiusMiles, keyword);
}
