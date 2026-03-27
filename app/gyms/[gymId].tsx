import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

/**
 * Backwards-compatibility redirect: /gyms/:gymId → /gym-community
 */
export default function GymDetailRedirect() {
  const { gymId, gymName } = useLocalSearchParams<{
    gymId: string;
    gymName?: string;
  }>();
  const router = useRouter();

  useEffect(() => {
    if (gymId) {
      router.replace({
        pathname: "/gym-community",
        params: { gymId, ...(gymName ? { gymName } : {}) },
      });
    }
  }, [gymId, gymName, router]);

  return null;
}
