// src/features/mapscreen/navigation.ts
// Region-aware map route targets. Overseas goes to the unified /map screen;
// CN keeps the legacy /gyms + /outdoor/crag-map routes (Amap adapter is not
// ready for the unified screen yet). Consumers call these helpers instead of
// hard-coding paths so app/gyms.tsx and app/outdoor/crag-map.tsx can stay as
// thin region-dispatch shims without incurring a redirect flash for the
// majority of navigation call sites.

import type { Href } from 'expo-router';
import { isCN } from '../../lib/region';

/** Entry point for the main map (gyms + discover). */
export function mapHref(): Href {
  return isCN ? ('/gyms' as any) : ('/map' as any);
}

/** Entry point for an outdoor list detail map. */
export function listMapHref(listId: string): Href {
  return {
    pathname: (isCN ? '/outdoor/crag-map' : '/map') as any,
    params: { listId },
  };
}
