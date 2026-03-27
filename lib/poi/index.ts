import { api } from "../../src/lib/apiClient";
import { REGION } from "../../src/lib/region";
import type { LatLng, GymPlace } from "./types";

export type { LatLng, GymPlace };

// Re-export PoiProvider type for any existing references
export type { PoiProvider } from "./types";

/** Backend gym item shape (matches _gym_item_from_place output) */
interface BackendGymItem {
  id: string;
  name: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  distance_m?: number | null;
}

function toGymPlace(item: BackendGymItem): GymPlace {
  return {
    place_id: item.id,
    name: item.name,
    address: item.address,
    location: { lat: item.lat ?? 0, lng: item.lng ?? 0 },
    distance_m: item.distance_m,
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
