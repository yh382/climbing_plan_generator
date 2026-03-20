import type { GymPlace, LatLng } from "../../../../lib/poi/types";
import { distanceKm } from "./distance";
import { MAX_DISTANCE_KM } from "../constants";

const MI_PER_KM = 0.621371;

export function sortAndFilterGyms(gyms: GymPlace[], ref: LatLng): GymPlace[] {
  const withKm = gyms.map((g) => {
    const km =
      g.distanceMiles != null
        ? g.distanceMiles / MI_PER_KM
        : distanceKm(ref, g.location);
    return { gym: g, km };
  });

  return withKm
    .filter((x) => x.km <= MAX_DISTANCE_KM)
    .sort((a, b) => a.km - b.km)
    .map((x) => x.gym);
}
