// Unified map tab route for the Mapbox (overseas) branch. Always lands
// in gyms mode by default. Area mode is entered exclusively in-screen
// via the gyms-sheet `GymsSavedSpotsRow` or area list tap, so we do not
// accept an `areaId` URL param. List mode keeps a deep-link entry for
// the profile/lists toolbar map button.
// CN region users never reach here — app/gyms.tsx and app/outdoor/crag-map.tsx
// render the legacy screens in-place instead of redirecting to /map.

import { useLocalSearchParams } from 'expo-router';
import MapScreenMapbox from '../../../../src/features/mapscreen/MapScreenMapbox';

export default function MapRoute() {
  const { listId } = useLocalSearchParams<{ listId?: string }>();
  return (
    <MapScreenMapbox
      initialListId={typeof listId === 'string' ? listId : undefined}
    />
  );
}
