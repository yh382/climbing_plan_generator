export type LatLng = { lat: number; lng: number };

export type GymPlace = {
  place_id: string;
  name: string;
  address?: string;
  location: LatLng;
  distance_m?: number | null;
};

export interface PoiProvider {
  searchGymsNearby(center: LatLng, radiusMiles: number, keyword?: string): Promise<GymPlace[]>;
}
