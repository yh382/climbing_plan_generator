// Shared styles for BasicInfoSection cards.
// Originally these lived inline in profile/index.tsx createStyles and were
// passed down as the `styles` prop. Body-info now also has its own
// formSheet route (`app/profile/body-info.tsx`) which needs the same
// look — so the entries are centralised here.

import { StyleSheet } from "react-native";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

export const createBasicInfoStyles = (
  colors: ReturnType<typeof useThemeColors>,
) =>
  StyleSheet.create({
    basicInfoContainer: { padding: 16, backgroundColor: colors.background },
    analysisCard: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
      padding: theme.spacing.cardPadding,
      borderRadius: theme.borderRadius.cardSmall,
      marginBottom: 12,
    },
    analysisText: {
      fontSize: 14,
      fontWeight: "600",
      fontFamily: theme.fonts.medium,
      marginLeft: 8,
      color: colors.textPrimary,
    },
    radarCard: {
      backgroundColor: colors.backgroundSecondary,
      padding: 16,
      borderRadius: theme.borderRadius.cardSmall,
      marginBottom: 12,
      alignItems: "center",
    },
    cardTitle: {
      fontSize: 15,
      fontWeight: "bold",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    radarPlaceholder: {
      width: 200,
      height: 180,
      justifyContent: "center",
      alignItems: "center",
      marginTop: 10,
      position: "relative",
    },
    bodyMetricsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    metricCard: {
      flex: 1,
      backgroundColor: colors.backgroundSecondary,
      padding: 12,
      borderRadius: theme.borderRadius.cardSmall,
      alignItems: "center",
      marginHorizontal: 4,
    },
    metricLabel: {
      fontSize: theme.typography.label.fontSize,
      fontFamily: theme.fonts.regular,
      color: colors.textTertiary,
      marginBottom: 4,
    },
    metricValue: {
      fontSize: 16,
      fontWeight: "bold",
      fontFamily: theme.fonts.monoMedium,
      color: colors.textPrimary,
    },
    metricUnit: {
      fontSize: 12,
      fontWeight: "normal",
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    statCard: {
      backgroundColor: colors.backgroundSecondary,
      padding: 16,
      borderRadius: theme.borderRadius.cardSmall,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    statRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 8,
    },
    statKey: {
      color: colors.textSecondary,
      fontSize: 14,
      fontFamily: theme.fonts.regular,
    },
    statVal: {
      fontWeight: "600",
      fontSize: 14,
      fontFamily: theme.fonts.monoMedium,
      color: colors.textPrimary,
    },
    divider: { height: 1, backgroundColor: colors.border },
  });
