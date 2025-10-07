export type LatLng = { lat: number; lng: number };

export type GymPlace = {
  place_id: string;
  name: string;
  vicinity?: string;
  formatted_address?: string;
  location: LatLng;
  distanceMiles: number;
  rating?: number;
  user_ratings_total?: number;
};

export interface PoiProvider {
  searchGymsNearby(center: LatLng, radiusMiles: number, keyword?: string): Promise<GymPlace[]>;
}
