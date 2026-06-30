// Compact verified-affiliation display for the profile id-block (over the
// cover → white text + shadow). Collapsed by default; a multi-gym setter taps
// to expand the list. See docs decisions D11/D12.
import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../../../lib/theme";
import { useSettings } from "../../../contexts/SettingsContext";
import type { Affiliation } from "../types";

type Tr = (zh: string, en: string) => string;

/** A "staff-worthy" affiliation = the kind that earns a verified badge. */
export function isStaff(a: Affiliation): boolean {
  return a.is_setter || a.is_head_setter || a.role === "owner";
}

function roleLabel(a: Affiliation, tr: Tr): string {
  if (a.is_head_setter) return tr("主力定线员", "Head setter");
  if (a.is_setter) return tr("定线员", "Setter");
  if (a.role === "owner") return tr("馆主", "Owner");
  return a.role;
}

function place(a: Affiliation): string {
  return a.gym?.name ?? a.org_name;
}

export default function ProfileAffiliations({
  affiliations,
}: {
  affiliations: Affiliation[];
}) {
  const { tr } = useSettings();
  const staff = useMemo(() => affiliations.filter(isStaff), [affiliations]);
  const [expanded, setExpanded] = useState(false);

  if (staff.length === 0) return null;

  const single = staff.length === 1;
  const summary = single
    ? `${roleLabel(staff[0], tr)} @ ${place(staff[0])}`
    : `${tr("认证定线员", "Verified setter")} · ${staff.length} ${tr("个岩馆", "gyms")}`;

  return (
    <View style={styles.wrap}>
      <Pressable
        style={styles.row}
        onPress={single ? undefined : () => setExpanded((e) => !e)}
        disabled={single}
        hitSlop={6}
        accessibilityRole={single ? "text" : "button"}
      >
        <Ionicons name="checkmark-circle" size={14} color="#FFFFFF" />
        <Text style={styles.text} numberOfLines={1}>
          {summary}
        </Text>
        {!single ? (
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={13}
            color="rgba(255,255,255,0.85)"
          />
        ) : null}
      </Pressable>
      {expanded && !single ? (
        <View style={styles.list}>
          {staff.map((a) => (
            <Text key={a.org_id} style={styles.item} numberOfLines={1}>
              {roleLabel(a, tr)} @ {place(a)}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const SHADOW = {
  textShadowColor: "rgba(0,0,0,0.4)",
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 3,
} as const;

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 5 },
  text: {
    fontFamily: theme.fonts.medium,
    fontSize: 12,
    color: "#FFFFFF",
    maxWidth: 230,
    ...SHADOW,
  },
  list: { marginTop: 3, gap: 2, paddingLeft: 19 },
  item: {
    fontFamily: theme.fonts.regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    ...SHADOW,
  },
});
