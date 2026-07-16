// P2-B — pending gym invites (accept / decline). FormSheet route (registered
// in app/_layout.tsx). Reached from the org_invite push deep-link + inbox.
// DL v1: single-invite focus — the sheet is a decision surface, so the first
// pending invite fills the paper (no card shell, §2.1) and the CTAs pin to
// the sheet bottom (§2.7 footer standard: paddingBottom = max(insets, 15)).
// Accept = solid accent primary, Decline = accent text button (§2.4); role
// renders as a stroked micro-label tag (§2.6). Further invites surface one
// at a time after each decision.
import React, { useLayoutEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PressableScale from "@/components/ui/PressableScale";
import { theme } from "@/lib/theme";
import { haptic } from "@/lib/haptics";
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
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
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
      if (accept) {
        await orgsApi.acceptInvite(i.membership_id);
        haptic.confirm();
      } else {
        await orgsApi.declineInvite(i.membership_id);
      }
      // Close only when the server says nothing is left — a concurrent new
      // invite keeps the sheet open on the refreshed list.
      const remaining = await refetch();
      if (remaining.length === 0) router.back();
    } catch {
      // leave the invite up; user can retry
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
        <Ionicons name="mail-open-outline" size={24} color={colors.textTertiary} />
        <Text style={styles.emptyText}>{tr("没有待处理的邀请", "No pending invites")}</Text>
      </View>
    );
  }

  const invite = invites[0];
  const isBusy = busy === invite.membership_id;
  const morePending = invites.length - 1;

  return (
    // ScrollView must stay at the root: UIKit's formSheet sizes its content
    // view from the root scroll view (recent-climbs pattern) — a plain View
    // root collapses an inner flex:1 ScrollView to zero height. The footer
    // lives inside the scroll content; flexGrow pins it to the sheet bottom.
    // NOTE: no contentInsetAdjustmentBehavior here — the automatic top inset
    // stacks on top of the flexGrow full-frame container and pushes the
    // footer below the fold by exactly headerHeight. Explicit paddingTop
    // keeps the content sized to the frame instead.
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        { paddingTop: headerHeight, paddingBottom: Math.max(insets.bottom, 15) },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>{invite.org_name.slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.orgName} numberOfLines={2}>
          {invite.org_name}
        </Text>
        <Text style={styles.sub} numberOfLines={2}>
          {invite.gym
            ? `${tr("邀请你加入", "Invites you to join")} ${invite.gym.name}`
            : tr("向你发出了加入邀请", "Sent you a membership invite")}
        </Text>
        <View style={styles.roleTag}>
          <Text style={styles.roleTagText}>{roleLabel(invite)}</Text>
        </View>
        {morePending > 0 ? (
          <Text style={styles.moreHint}>
            {tr(`还有 ${morePending} 条待处理`, `${morePending} more pending`)}
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PressableScale style={styles.accept} onPress={() => act(invite, true)} disabled={isBusy}>
          {isBusy ? (
            <ActivityIndicator color={colors.textOnAccent} size="small" />
          ) : (
            <Text style={styles.acceptText}>{tr("接受邀请", "Accept invite")}</Text>
          )}
        </PressableScale>
        <PressableScale style={styles.decline} onPress={() => act(invite, false)} disabled={isBusy}>
          <Text style={styles.declineText}>{tr("拒绝", "Decline")}</Text>
        </PressableScale>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.sheetBackground },
    center: { alignItems: "center", justifyContent: "center", gap: 10 },
    emptyText: { fontFamily: theme.fonts.regular, fontSize: 13, color: colors.textTertiary },

    scrollContent: { flexGrow: 1 },
    content: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
      paddingVertical: 16,
    },
    logo: {
      width: 64,
      height: 64,
      borderRadius: theme.borderRadius.card,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    logoText: { fontFamily: theme.fonts.black, fontSize: 26, color: colors.textOnAccent },
    orgName: {
      fontFamily: theme.fonts.bold,
      fontSize: 21,
      color: colors.textPrimary,
      textAlign: "center",
      marginTop: 16,
      letterSpacing: -0.3,
    },
    sub: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center",
      marginTop: 6,
      lineHeight: 20,
    },
    roleTag: {
      borderWidth: 1,
      borderColor: colors.accent,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      marginTop: 14,
    },
    roleTagText: { ...theme.textStyles.microLabel, color: colors.accent },
    moreHint: {
      ...theme.textStyles.microLabel,
      color: colors.textTertiary,
      marginTop: 18,
    },

    footer: {
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: 8,
    },
    // Pill: this is the sheet's single primary CTA (§1 圆角三档 / §2.4) —
    // the capsule also stays concentric with the sheet's device-radius corners.
    accept: {
      height: 50,
      borderRadius: theme.borderRadius.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    acceptText: { fontFamily: theme.fonts.bold, fontSize: 15, color: colors.textOnAccent },
    decline: {
      height: 42,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
    },
    declineText: { fontFamily: theme.fonts.bold, fontSize: 14, color: colors.accent },
  });
