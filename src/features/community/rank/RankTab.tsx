// src/features/community/rank/RankTab.tsx

import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useLeaderboard, LeaderboardItem } from "../hooks";
import { useProfileStore } from "../../profile/store/useProfileStore";
import { useUserStore } from "../../../store/useUserStore";
import HomeGymPickerSheet from "../../profile/components/HomeGymPickerSheet";

type Scope = "all" | "following" | "gym";
type Discipline = "all" | "boulder" | "rope";

interface RankTabProps {
  discipline?: Discipline;
  onPressUser?: (userId: string) => void;
}

export default function RankTab({
  discipline = "all",
  onPressUser,
}: RankTabProps) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [scope, setScope] = useState<Scope>("all");
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const [selectedGymName, setSelectedGymName] = useState<string>("Gym");
  const [gymPickerVisible, setGymPickerVisible] = useState(false);

  // Map discipline to backend type param
  const backendType = discipline === "all" ? "total" : discipline;

  const { items, loading } = useLeaderboard(
    backendType,
    scope,
    scope === "gym" ? selectedGymId : undefined,
    50,
  );

  // Try to read home gym from profile store for initial gym scope
  const homeGymId = useProfileStore(
    (s) => s.profile?.preferences?.home_gym_id ?? null,
  );

  const currentUserId = useUserStore((s) => s.user?.id);

  const myRank = useMemo(() => {
    if (!currentUserId || !items || items.length === 0) return null;
    const entry = items.find((u) => u.userId === currentUserId);
    if (!entry) return null;
    return entry;
  }, [currentUserId, items]);

  const handleGymPress = () => {
    if (scope === "gym") {
      // Already on gym scope — open picker
      setGymPickerVisible(true);
    } else {
      // Switch to gym scope
      setScope("gym");
      if (!selectedGymId && homeGymId) {
        setSelectedGymId(homeGymId);
        setSelectedGymName("Home Gym");
      } else if (!selectedGymId) {
        // No home gym set — open picker immediately
        setGymPickerVisible(true);
      }
    }
  };

  const renderItem = (item: LeaderboardItem, index: number) => {
    const isTop3 = item.rank <= 3;
    const isMe = item.userId === currentUserId;
    const medalColors = ["#FFD700", "#C0C0C0", "#CD7F32"];

    return (
      <TouchableOpacity
        key={item.userId}
        style={[styles.row, isMe && styles.rowHighlight]}
        activeOpacity={0.7}
        onPress={() => onPressUser?.(item.userId)}
      >
        <View style={styles.rankCol}>
          {isTop3 ? (
            <View
              style={[
                styles.medal,
                { backgroundColor: medalColors[item.rank - 1] },
              ]}
            >
              <Text style={styles.medalText}>{item.rank}</Text>
            </View>
          ) : (
            <Text style={styles.rankText}>{item.rank}</Text>
          )}
        </View>

        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Ionicons name="person" size={18} color={colors.textTertiary} />
          </View>
        )}

        <Text style={styles.username} numberOfLines={1}>
          {item.username}
        </Text>

        <Text style={styles.score}>
          {Math.round(item.score).toLocaleString()} pts
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Scope pills: All / Following / Gym */}
      <View style={styles.scopeRow}>
        <TouchableOpacity
          style={[styles.pill, scope === "all" && styles.pillActive]}
          onPress={() => setScope("all")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.pillText,
              scope === "all" && styles.pillTextActive,
            ]}
          >
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, scope === "following" && styles.pillActive]}
          onPress={() => setScope("following")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.pillText,
              scope === "following" && styles.pillTextActive,
            ]}
          >
            Following
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pill, scope === "gym" && styles.pillActive]}
          onPress={handleGymPress}
          activeOpacity={0.8}
        >
          <Ionicons
            name="location-outline"
            size={14}
            color={scope === "gym" ? "#FFF" : colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text
            style={[
              styles.pillText,
              scope === "gym" && styles.pillTextActive,
            ]}
            numberOfLines={1}
          >
            {scope === "gym" && selectedGymId ? selectedGymName : "Gym"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* My rank card */}
      {myRank && !loading && (
        <View style={styles.myRankCard}>
          <Text style={styles.myRankLabel}>Your Rank</Text>
          <Text style={styles.myRankNumber}>#{myRank.rank}</Text>
          <Text style={styles.myRankPoints}>{Math.round(myRank.score).toLocaleString()} pts</Text>
        </View>
      )}

      {/* Leaderboard list */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.textPrimary} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="trophy-outline" size={40} color={colors.textTertiary} />
          <Text style={styles.emptyText}>
            {scope === "following"
              ? "No ranked friends yet"
              : scope === "gym" && !selectedGymId
                ? "Select a gym to see rankings"
                : "No rankings yet"}
          </Text>
          <Text style={styles.emptySubtext}>
            {scope === "following"
              ? "Follow climbers to see their rankings here"
              : scope === "gym" && !selectedGymId
                ? "Tap the Gym pill above to choose a gym"
                : "Log some climbs to start earning points!"}
          </Text>
        </View>
      ) : (
        <View>{items.map((item, idx) => renderItem(item, idx))}</View>
      )}

      {/* Gym picker sheet */}
      <HomeGymPickerSheet
        visible={gymPickerVisible}
        onClose={() => setGymPickerVisible(false)}
        title="Choose gym for ranking"
        onSelect={(gym) => {
          setSelectedGymId(gym.id);
          setSelectedGymName(gym.name);
          setScope("gym");
        }}
      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.screenPadding,
    paddingBottom: theme.spacing.sectionGap,
  },
  scopeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: theme.borderRadius.pill,
    backgroundColor: colors.backgroundSecondary,
  },
  pillActive: {
    backgroundColor: colors.cardDark,
  },
  pillText: {
    fontSize: 13,
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
    maxWidth: 120,
  },
  pillTextActive: {
    color: "#FFF",
  },
  loadingWrap: {
    padding: 40,
    alignItems: "center",
  },
  emptyWrap: {
    padding: 40,
    alignItems: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.background,
    borderRadius: theme.borderRadius.cardSmall,
    marginBottom: 6,
    borderWidth: 0.4,
    borderColor: colors.border,
  },
  rankCol: {
    width: 36,
    alignItems: "center",
    marginRight: 10,
  },
  rankText: {
    fontSize: 15,
    fontWeight: "700",
    fontFamily: theme.fonts.monoMedium,
    color: colors.textSecondary,
  },
  medal: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  medalText: {
    fontSize: 13,
    fontWeight: "800",
    fontFamily: theme.fonts.monoMedium,
    color: "#FFF",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarPlaceholder: {
    backgroundColor: colors.backgroundSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  username: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textPrimary,
  },
  score: {
    fontSize: 14,
    fontWeight: "700",
    fontFamily: theme.fonts.monoMedium,
    color: colors.textSecondary,
    marginLeft: 8,
  },
  rowHighlight: {
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  },
  myRankCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: theme.borderRadius.card,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  myRankLabel: { fontSize: 14, fontWeight: "600", fontFamily: theme.fonts.medium, color: colors.textSecondary },
  myRankNumber: { fontSize: 24, fontWeight: "800", fontFamily: theme.fonts.monoMedium, color: colors.textPrimary },
  myRankPoints: { fontSize: 13, fontFamily: theme.fonts.monoMedium, color: colors.textSecondary },
});
