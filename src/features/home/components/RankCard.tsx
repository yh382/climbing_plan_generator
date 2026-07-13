import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import PressableScale from "@/components/ui/PressableScale";
import { communityApi } from "@/features/community/api";
import type { RankOut } from "@/features/community/types";
import { useUserStore } from "@/store/useUserStore";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";

type LeaderboardItem = {
  user_id: string;
  total_points?: number;
  rank_position?: number;
};

export function RankCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr } = useSettings();
  const me = useUserStore((s) => s.user);

  const [globalRank, setGlobalRank] = useState<RankOut | null>(null);
  const [friendsRank, setFriendsRank] = useState<{ rank: number; total: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // TODO: BE 没有 leaderboard?me=true filter，目前用 limit=200 扫描后找自身。
    //       用户 following >200 时 friends rank 静默退化为 "—"。BACKLOG: 加 BE me-filter。
    Promise.all([
      communityApi.getMyRank().catch(() => null),
      communityApi
        .getLeaderboard("total", "following", null, 200, 0)
        .catch(() => null),
    ])
      .then(([rank, friendsLb]) => {
        if (cancelled) return;
        setGlobalRank(rank);
        if (friendsLb && me) {
          const items = (friendsLb.items ?? []) as LeaderboardItem[];
          const myEntry = items.find((it) => it.user_id === me.id);
          if (myEntry?.rank_position != null) {
            setFriendsRank({ rank: myEntry.rank_position, total: friendsLb.total ?? items.length });
          } else {
            setFriendsRank(null);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [me?.id]);

  const handlePress = () => router.push("/community/rank" as any);

  // DL v1 §2.3 — data is typography: mono values + micro labels on paper,
  // no dark card container.
  return (
    <View style={styles.section}>
      <Text style={styles.microLabel}>{tr("我的排名", "My Rank")}</Text>

      {loading ? (
        <ActivityIndicator
          size="small"
          color={colors.textTertiary}
          style={{ marginVertical: 18 }}
        />
      ) : (
        <PressableScale style={styles.cellsRow} onPress={handlePress}>
          <View style={styles.cell}>
            <Text style={styles.cellValue} numberOfLines={1}>
              {globalRank?.rank_position ? `#${globalRank.rank_position}` : "—"}
            </Text>
            <Text style={styles.cellLabel}>{tr("全球", "Global")}</Text>
          </View>
          <View style={styles.cell}>
            <Text style={styles.cellValue} numberOfLines={1}>
              {friendsRank ? `#${friendsRank.rank} / ${friendsRank.total}` : "—"}
            </Text>
            <Text style={styles.cellLabel}>{tr("好友", "Friends")}</Text>
          </View>
        </PressableScale>
      )}
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    section: {
      marginHorizontal: 16,
      marginBottom: theme.spacing.sectionGap,
    },
    microLabel: {
      ...theme.textStyles.microLabel,
      color: c.textSecondary,
      marginBottom: 14,
    },
    cellsRow: {
      flexDirection: "row",
      alignItems: "flex-end",
    },
    cell: {
      flex: 1,
      alignItems: "center",
    },
    cellLabel: {
      ...theme.textStyles.microLabel,
      color: c.textTertiary,
      marginTop: 5,
      textAlign: "center",
    },
    cellValue: {
      ...theme.textStyles.monoValue,
      fontSize: 22,
      color: c.textPrimary,
      textAlign: "center",
    },
  });
