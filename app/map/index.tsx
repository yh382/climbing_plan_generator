// app/map/index.tsx
// Unified map route for the Mapbox (overseas) branch. Parses deep-link
// params (areaId / listId) and forwards to MapScreenMapbox, which keeps a
// single persistent MapView mounted across gyms / area / list modes.
// CN region users never reach here — app/gyms.tsx and app/outdoor/crag-map.tsx
// render the legacy screens in-place instead of redirecting to /map.

import { useLocalSearchParams } from 'expo-router';
import MapScreenMapbox from '../../src/features/mapscreen/MapScreenMapbox';

export default function MapRoute() {
  const { areaId, areaName, listId } = useLocalSearchParams<{
    areaId?: string;
    areaName?: string;
    listId?: string;
  }>();
  return (
    <MapScreenMapbox
      initialAreaId={typeof areaId === 'string' ? areaId : undefined}
      initialAreaName={typeof areaName === 'string' ? areaName : undefined}
      initialListId={typeof listId === 'string' ? listId : undefined}
    />
  );
}
