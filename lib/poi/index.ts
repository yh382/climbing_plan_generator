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

const CN_LAT = [18, 54] as const;
const CN_LNG = [73, 135] as const;

function isChina(c: LatLng): boolean {
  return (
    c.lat >= CN_LAT[0] && c.lat <= CN_LAT[1] &&
    c.lng >= CN_LNG[0] && c.lng <= CN_LNG[1]
  );
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

  // Keyword search: keep existing Google/Amap path (no DB search yet).
  if (keyword) {
    params.set("q", keyword);
    const data = await api.get<{ items: BackendGymItem[] }>(
      `/gyms/search?${params}`,
    );
    return data.items.map(toGymPlace);
  }

  // Non-keyword nearby: try our own DB first (BN OSM/MP import).
  // CN users stay on Amap (DB has no CN gyms yet).
  if (!isChina(center)) {
    try {
      const dbParams = new URLSearchParams({
        lat: String(center.lat),
        lng: String(center.lng),
        radius_km: "80",
        limit: "20",
      });
      const dbData = await api.get<{ items: BackendGymItem[] }>(
        `/gyms/nearby-db?${dbParams}`,
      );
      if (dbData.items.length > 0) {
        return dbData.items.map(toGymPlace);
      }
    } catch {
      // fall through to Google/Amap
    }
  }

  const data = await api.get<{ items: BackendGymItem[] }>(
    `/gyms/nearby?${params}`,
  );
  return data.items.map(toGymPlace);
}
