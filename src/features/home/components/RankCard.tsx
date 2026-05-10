import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{tr("我的排名", "My Rank")}</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
      </View>

      {loading ? (
        <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" style={{ marginVertical: 18 }} />
      ) : (
        <View style={styles.cellsRow}>
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>{tr("全球", "Global")}</Text>
            <Text style={styles.cellValue}>
              {globalRank?.rank_position ? `#${globalRank.rank_position}` : "—"}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.cell}>
            <Text style={styles.cellLabel}>{tr("好友", "Friends")}</Text>
            <Text style={styles.cellValue}>
              {friendsRank ? `#${friendsRank.rank} / ${friendsRank.total}` : "—"}
            </Text>
          </View>
        </View>
      )}
    </Pressable>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    card: {
      marginHorizontal: 16,
      marginBottom: theme.spacing.sectionGap,
      backgroundColor: c.cardDark,
      borderRadius: theme.borderRadius.card,
      padding: 18,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 14,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 15,
      color: "#FFFFFF",
    },
    cellsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    cell: {
      flex: 1,
    },
    cellLabel: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: "rgba(255,255,255,0.6)",
      marginBottom: 6,
    },
    cellValue: {
      fontFamily: theme.fonts.monoMedium,
      fontSize: 22,
      color: "#FFFFFF",
      letterSpacing: -0.5,
    },
    divider: {
      width: StyleSheet.hairlineWidth,
      height: 36,
      backgroundColor: "rgba(255,255,255,0.18)",
      marginHorizontal: 18,
    },
  });
