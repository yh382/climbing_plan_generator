import { useEffect, useState, useLayoutEffect, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { communityApi } from "../../src/features/community/api";
import type { BlockedUserOut } from "../../src/features/community/types";
import { useThemeColors } from "../../src/lib/useThemeColors";
import { HeaderButton } from "../../src/components/ui/HeaderButton";
import { useSettings } from "src/contexts/SettingsContext";
import type { ThemeColors } from "../../src/lib/theme";

export default function BlockedUsers() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUserOut[]>([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: tr("已屏蔽", "Blocked"),
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, lang]);

  useEffect(() => {
    (async () => {
      try {
        const data = await communityApi.getBlockedUsers();
        setBlockedUsers(data);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleUnblock = async (userId: string) => {
    await communityApi.unblockUser(userId);
    setBlockedUsers(prev => prev.filter(u => u.userId !== userId));
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.textSecondary} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          contentInsetAdjustmentBehavior="automatic"
        >
          {blockedUsers.length === 0 && (
            <Text style={styles.emptyText}>{tr("没有屏蔽的用户", "No blocked users")}</Text>
          )}
          {blockedUsers.map(user => (
            <View key={user.id} style={styles.userRow}>
              <View style={styles.userInfo}>
                {user.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: colors.cardBorder }]} />
                )}
                <Text style={styles.userName}>{user.username}</Text>
              </View>
              <TouchableOpacity style={styles.unblockBtn} onPress={() => handleUnblock(user.userId)}>
                <Text style={styles.unblockText}>{tr("取消屏蔽", "Unblock")}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  emptyText: { textAlign: "center", color: colors.textSecondary, marginTop: 40 },
  userRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  userInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardBackground },
  userName: { fontSize: 16, fontWeight: "500", color: colors.textPrimary },
  unblockBtn: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.cardBackground, borderRadius: 16 },
  unblockText: { fontSize: 13, fontWeight: "600", color: colors.textPrimary },
});
