// src/features/community/events/EventTypeIcons.tsx
import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { EventType, EventVenue, EventDiscipline } from "./mockEvents";

const typeIcon: Record<EventType, any> = {
  competition: "trophy-outline",
  meetup: "people-outline",
  training: "barbell-outline",
  route_setting: "construct-outline",
  youth: "school-outline",
  community: "heart-outline",
};

const venueIcon: Record<EventVenue, any> = {
  indoor: "home-outline",
  outdoor: "leaf-outline",
};

const disciplineIcon: Record<EventDiscipline, any> = {
  boulder: "cube-outline",
  toprope: "git-branch-outline",
  mixed: "shuffle-outline",
};

export default function EventTypeIcons({
  type,
  venue,
  discipline,
}: {
  type: EventType;
  venue: EventVenue;
  discipline: EventDiscipline;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.chip}>
        <Ionicons name={typeIcon[type]} size={14} color="#6B7280" />
      </View>
      <View style={styles.chip}>
        <Ionicons name={venueIcon[venue]} size={14} color="#6B7280" />
      </View>
      <View style={styles.chip}>
        <Ionicons name={disciplineIcon[discipline]} size={14} color="#6B7280" />
      </View>
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
