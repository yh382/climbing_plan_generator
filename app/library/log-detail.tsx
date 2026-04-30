// app/library/log-detail.tsx
// Deprecated route — V2.1 replaced the session-scoped log detail with the
// day-scoped summary page. This file stays as a thin redirect so any deep
// links or cached navigation targets keep working.

import { useEffect } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";

export default function LegacyLogDetailRedirect() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();

  useEffect(() => {
    const date = typeof params.date === "string" && params.date ? params.date : "today";
    router.replace({ pathname: "/daily-summary", params: { date } } as any);
  }, [params.date, router]);

  return null;
}
