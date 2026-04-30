import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import GymsScreen from '../src/features/gyms/GymsScreen';
import { isCN } from '../src/lib/region';

export default function GymsTab() {
  const router = useRouter();

  // Mapbox (overseas) users land on the unified /map screen instead of the
  // standalone GymsScreen. CN (Amap) users continue to render GymsScreen in
  // place — the /map route is Mapbox-only (no Amap adapter yet).
  useEffect(() => {
    if (!isCN) router.replace('/map' as any);
  }, [router]);

  if (!isCN) return null;
  return <GymsScreen />;
}
