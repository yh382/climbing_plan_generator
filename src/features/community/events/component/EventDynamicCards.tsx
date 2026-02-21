// src/features/community/events/component/EventDynamicCards.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import EventListCard from "./EventListCard";
import type { EventInfoCardModel } from "../data/types";

export default function EventDynamicCards({ cards }: { cards?: EventInfoCardModel[] }) {
  if (!cards || cards.length === 0) return null;

  return (
    <View style={{ marginTop: 16 }}>
      {cards.map((c) => (
        <EventListCard key={c.id} card={c} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({});
