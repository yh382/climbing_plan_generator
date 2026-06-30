// P2-B — pending gym invites (accept / decline). FormSheet route (registered
// in app/_layout.tsx). Reached from the org_invite push deep-link + inbox.
import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { useMyInvites } from "@/features/orgs/hooks";
import { orgsApi } from "@/features/orgs/api";
import type { OrgInvite } from "@/features/orgs/types";

export default function OrgInvitesScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr } = useSettings();
  const navigation = useNavigation();
  const router = useRouter();
  const { invites, loading, refetch } = useMyInvites();
  const [busy, setBusy] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: tr("岩馆邀请", "Gym invites") });
  }, [navigation, tr]);

  const roleLabel = (i: OrgInvite) =>
    i.is_setter ? tr("定线员", "Setter") : i.role === "owner" ? tr("馆主", "Owner") : i.role;

  async function act(i: OrgInvite, accept: boolean) {
    setBusy(i.membership_id);
    try {
      if (accept) await orgsApi.acceptInvite(i.membership_id);
      else await orgsApi.declineInvite(i.membership_id);
      const remaining = invites.length - 1;
      await refetch();
      if (remaining <= 0) router.back();
    } catch {
      // leave the row; user can retry
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  if (invites.length === 0) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="mail-open-outline" size={40} color={colors.textTertiary} />
        <Text style={styles.emptyText}>{tr("没有待处理的邀请", "No pending invites")}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      {invites.map((i) => (
        <View key={i.membership_id} style={styles.card}>
          <View style={styles.row}>
            <View style={styles.logo}>
              <Text style={styles.logoText}>{i.org_name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.orgName} numberOfLines={1}>
                {i.org_name}
              </Text>
              <Text style={styles.sub} numberOfLines={1}>
                {tr("邀你作为", "Invited as")} {roleLabel(i)}
                {i.gym ? ` · ${i.gym.name}` : ""}
              </Text>
            </View>
          </View>
          <View style={styles.actions}>
            <Pressable
              style={[styles.btn, styles.decline]}
              onPress={() => act(i, false)}
              disabled={busy === i.membership_id}
            >
              <Text style={styles.declineText}>{tr("拒绝", "Decline")}</Text>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.accept]}
              onPress={() => act(i, true)}
              disabled={busy === i.membership_id}
            >
              {busy === i.membership_id ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.acceptText}>{tr("接受", "Accept")}</Text>
              )}
            </Pressable>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center", gap: 10 },
    emptyText: { fontFamily: theme.fonts.medium, fontSize: 14, color: colors.textSecondary },
    card: {
      backgroundColor: colors.cardBackground,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      padding: 14,
      marginBottom: 12,
    },
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    logo: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: { fontFamily: theme.fonts.black, fontSize: 18, color: "#FFFFFF" },
    orgName: { fontFamily: theme.fonts.bold, fontSize: 16, color: colors.textPrimary },
    sub: { fontFamily: theme.fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 2 },
    actions: { flexDirection: "row", gap: 10, marginTop: 14 },
    btn: { flex: 1, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    decline: { backgroundColor: colors.backgroundSecondary },
    declineText: { fontFamily: theme.fonts.bold, fontSize: 15, color: colors.textSecondary },
    accept: { backgroundColor: colors.accent },
    acceptText: { fontFamily: theme.fonts.bold, fontSize: 15, color: "#FFFFFF" },
  });
