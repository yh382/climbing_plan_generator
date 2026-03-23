import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function GymDetailPage() {
  const { gymId } = useLocalSearchParams<{ gymId: string }>();
  const router = useRouter();

  // Redirect to Community tab Gyms view
  useEffect(() => {
    if (gymId) {
      router.replace({
        pathname: '/(tabs)/community',
        params: { tab: 'gyms', gymId },
      });
    }
  }, [gymId, router]);

  return null;
}
