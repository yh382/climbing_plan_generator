// src/features/community/events/EventTypeIcons.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const typeIcon: Record<string, any> = {
  competition: "trophy-outline",
  meetup: "people-outline",
  training: "barbell-outline",
  route_setting: "construct-outline",
  youth: "school-outline",
  community: "heart-outline",
};

const venueIcon: Record<string, any> = {
  indoor: "home-outline",
  outdoor: "leaf-outline",
};

const disciplineIcon: Record<string, any> = {
  boulder: "cube-outline",
  toprope: "git-branch-outline",
  rope: "git-branch-outline",
  mixed: "shuffle-outline",
};

export default function EventTypeIcons({
  type,
  venue,
  discipline,
}: {
  type?: string;
  venue?: string;
  discipline?: string;
}) {
  const icons: string[] = [];
  if (type && typeIcon[type]) icons.push(typeIcon[type]);
  if (venue && venueIcon[venue]) icons.push(venueIcon[venue]);
  if (discipline && disciplineIcon[discipline]) icons.push(disciplineIcon[discipline]);

  if (icons.length === 0) return null;

  return (
    <View style={styles.row}>
      {icons.map((iconName, idx) => (
        <View key={idx} style={styles.chip}>
          <Ionicons name={iconName as any} size={14} color="#6B7280" />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginTop: 10 },
  chip: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
});
