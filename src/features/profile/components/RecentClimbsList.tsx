import { useMemo } from "react";
import { View, Text } from "react-native";
import { parseISO, format } from "date-fns";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import useLogsStore from "@/store/useLogsStore";
import DailyLogCard from "../../session/components/DailyLogCard";

/** @deprecated No longer needed — sessions come from Zustand store */
export function invalidateRecentClimbsCache() {}

export function RecentClimbsList() {
  const colors = useThemeColors();
  const router = useRouter();
  const sessions = useLogsStore((s) => s.sessions);

  const list = useMemo(() => {
    if (!sessions?.length) return [];
    return sessions
      .slice(0, 20)
      .map((s) => ({
        id: s.id,
        dateLabel: format(parseISO(s.date), "EEE · M.dd"),
        rawDate: s.date,
        duration: s.duration,
        attempts: s.attempts ?? 0,
        sends: s.sends ?? 0,
        best: s.best || "—",
        sessionKey: s.sessionKey || "",
        discipline: s.discipline || "boulder",
      }));
  }, [sessions]);

  if (list.length === 0) {
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
      {list.map((s) => (
        <DailyLogCard
          key={s.id}
          dateLabel={s.dateLabel}
          duration={s.duration}
          attempts={s.attempts}
          sends={s.sends}
          maxGrade={s.best}
          onPress={() => {
            router.push({
              pathname: "/library/log-detail",
              params: {
                date: s.rawDate,
                sessionKey: s.sessionKey,
                mode: s.discipline,
              },
            });
          }}
        />
      ))}
    </View>
  );
}
