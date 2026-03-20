import type { LatLng } from "../../../../lib/poi/types";

const R_KM = 6371;

export function distanceKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h = sinLat * sinLat + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * sinLng * sinLng;
  return 2 * R_KM * Math.asin(Math.sqrt(h));
}
