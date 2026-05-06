import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import DailyGroupCard from "@/features/dailysummary/DailyGroupCard";
import { useDailyGroupSummaries } from "@/features/dailysummary/useDailyGroupSummaries";

/** @deprecated No longer needed — sessions come from Zustand store */
export function invalidateRecentClimbsCache() {}

export function RecentClimbsList() {
  const colors = useThemeColors();
  const router = useRouter();
  const groups = useDailyGroupSummaries({ limit: 20 });

  if (groups.length === 0) {
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
      {groups.map((grp) => (
        <DailyGroupCard
          key={grp.date}
          summary={grp}
          onPress={() => {
            // DAILY_GROUP — Profile list now lands on the daily-summary page
            // (consistent with Activity tab). Replaces the legacy
            // /library/log-detail nav so multi-session days show fully.
            router.push({ pathname: "/daily-summary", params: { date: grp.date } } as any);
          }}
        />
      ))}
    </View>
  );
}
