import { useEffect, useState, useRef } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { parseISO, format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { api } from "@/lib/apiClient";
import DailyLogCard from "../../session/components/DailyLogCard";

type DailySummary = {
  date: string;
  climbs: number;
  sends: number;
  best_grade: string | null;
  duration_minutes: number | null;
};

function formatDuration(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ""}`;
  return `${m}m`;
}

// Module-level cache — survives component unmount/remount
let _cache: DailySummary[] | null = null;
let _cacheTime = 0;
const STALE_MS = 5 * 60 * 1000; // 5 minutes

/** Call this after ending/deleting a session to force next mount to refetch */
export function invalidateRecentClimbsCache() {
  _cache = null;
  _cacheTime = 0;
}

export function RecentClimbsList() {
  const colors = useThemeColors();
  const [days, setDays] = useState<DailySummary[]>(_cache || []);
  const [loading, setLoading] = useState(!_cache);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const isStale = Date.now() - _cacheTime > STALE_MS;

    // If cache is fresh, skip fetch entirely
    if (_cache && !isStale) return;

    // If cache exists but stale, show cache immediately & refresh in background
    api
      .get<DailySummary[]>("/climb-logs/daily-summary/me?limit=20")
      .then((data) => {
        const result = data || [];
        _cache = result;
        _cacheTime = Date.now();
        setDays(result);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={{ padding: 24, alignItems: "center" }}>
        <ActivityIndicator size="small" color={colors.textTertiary} />
      </View>
    );
  }

  if (days.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: "center", opacity: 0.5 }}>
        <Ionicons name="document-text-outline" size={32} color={colors.textTertiary} />
        <Text style={{ color: colors.textTertiary, fontFamily: theme.fonts.regular, marginTop: 8 }}>
          No recent climbs.
        </Text>
      </View>
    );
  }

  return (
    <View style={{ gap: 0 }}>
      {days.map((d) => (
        <DailyLogCard
          key={d.date}
          dateLabel={format(parseISO(d.date), "EEE · M.dd")}
          duration={formatDuration(d.duration_minutes)}
          climbs={d.climbs}
          sends={d.sends}
          maxGrade={d.best_grade || "—"}
          onPress={() => {}}
        />
      ))}
    </View>
  );
}
