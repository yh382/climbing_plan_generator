import { api } from "../../src/lib/apiClient";
import { REGION } from "../../src/lib/region";
import type { LatLng, GymPlace } from "./types";

export type { LatLng, GymPlace };

// Re-export PoiProvider type for any existing references
export type { PoiProvider } from "./types";

/** Backend gym item shape (matches _gym_item_from_place output) */
interface BackendGymItem {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  location: { lat: number; lng: number };
  distanceMiles?: number | null;
  rating?: number;
  user_ratings_total?: number;
}

function toGymPlace(item: BackendGymItem): GymPlace {
  return {
    place_id: item.place_id,
    name: item.name,
    vicinity: item.vicinity,
    formatted_address: item.formatted_address,
    location: item.location,
    distanceMiles: item.distanceMiles ?? 0,
    rating: item.rating,
    user_ratings_total: item.user_ratings_total,
  };
}

export async function searchGymsNearby(
  center: LatLng,
  _radiusMiles = 30,
  keyword = "",
): Promise<GymPlace[]> {
  const params = new URLSearchParams({
    lat: String(center.lat),
    lng: String(center.lng),
    limit: "20",
    region: REGION,
  });

  // Use /gyms/search for keyword queries, /gyms/nearby otherwise
  if (keyword) {
    params.set("q", keyword);
    const data = await api.get<{ items: BackendGymItem[] }>(
      `/gyms/search?${params}`,
    );
    return data.items.map(toGymPlace);
  }

  const data = await api.get<{ items: BackendGymItem[] }>(
    `/gyms/nearby?${params}`,
  );
  return data.items.map(toGymPlace);
}
