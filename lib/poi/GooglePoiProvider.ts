import type { GymPlace, LatLng, PoiProvider } from "./types";

function haversineMiles(a: LatLng, b: LatLng) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.7613; // miles
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function googlePoiProvider({ apiKey }: { apiKey: string }): PoiProvider {
  if (!apiKey) {
    console.warn("[GooglePoiProvider] Missing googleMapsApiKey in extra.");
  }
  return {
    async searchGymsNearby(center: LatLng, radiusMiles: number, keyword = ""): Promise<GymPlace[]> {
      const radiusMeters = Math.min(50000, Math.floor(radiusMiles * 1609.344)); // cap 50km
      const base = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
      // 关键字：climbing / rock climbing；type=gym 挺靠谱
      const kw = encodeURIComponent(keyword || "climbing");
      const url = `${base}?key=${apiKey}&location=${center.lat},${center.lng}&radius=${radiusMeters}&type=gym&keyword=${kw}`;

      const all: any[] = [];
      let nextPageToken: string | undefined;
      let fetchUrl = url;

      for (let i = 0; i < 3; i++) {
        const r = await fetch(fetchUrl);
        const data = await r.json();
        if (data?.results?.length) all.push(...data.results);
        nextPageToken = data?.next_page_token;
        if (!nextPageToken) break;
        await new Promise((res) => setTimeout(res, 1600));
        fetchUrl = `${base}?pagetoken=${nextPageToken}&key=${apiKey}`;
      }

      const dedup = new Map<string, any>();
      for (const p of all) {
        if (p.place_id && !dedup.has(p.place_id)) dedup.set(p.place_id, p);
      }

      const list: GymPlace[] = Array.from(dedup.values())
        .map((p: any) => {
          const loc = { lat: p.geometry.location.lat, lng: p.geometry.location.lng };
          const dist = haversineMiles(center, loc);
          return {
            place_id: p.place_id,
            name: p.name,
            vicinity: p.vicinity,
            formatted_address: p.formatted_address,
            location: loc,
            distanceMiles: dist,
            rating: p.rating,
            user_ratings_total: p.user_ratings_total,
          };
        })
        .filter((g) => g.distanceMiles <= radiusMiles)
        .sort((a, b) => a.distanceMiles - b.distanceMiles);

      return list;
    },
  };
}
