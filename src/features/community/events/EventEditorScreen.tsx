// src/features/community/events/EventEditorScreen.tsx
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { EventInfoCardModel, EventListItem } from "./data/types";
import { HeaderButton } from "@/components/ui/HeaderButton";
import EventInfoCardEditor from "./component/EventInfoCardEditor";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

export default function EventEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ===== basic fields =====
  const [title, setTitle] = useState("New Event");
  const [organizerName, setOrganizerName] = useState("ClimMate Community");

  const [locationName, setLocationName] = useState("");
  const [locationDetail, setLocationDetail] = useState("");

  const [startDate, setStartDate] = useState("2026/01/01");
  const [endDate, setEndDate] = useState(""); // 空表示单日
  const [showTime, setShowTime] = useState(false);
  const [startTime, setStartTime] = useState("18:30");
  const [endTime, setEndTime] = useState("20:00");

  const [showRewards, setShowRewards] = useState(false);
  const [rewardsLine, setRewardsLine] = useState("");

  const [showLocation, setShowLocation] = useState(true);
  const [showDate, setShowDate] = useState(true);

  // ===== dynamic cards =====
  const [cards, setCards] = useState<EventInfoCardModel[]>([
    {
      id: uid("card"),
      title: "Registrations",
      showRank: false,
      items: [{ id: uid("it"), primary: "Ava", secondary: "@ava", trailing: "Joined" }],
    },
  ]);

  const canPublish = useMemo(() => {
    if (!title.trim()) return false;
    if (showLocation && !locationName.trim()) return false;
    if (showRewards && !rewardsLine.trim()) return false;
    return true;
  }, [title, showLocation, locationName, showRewards, rewardsLine]);

  function addCard() {
    setCards((prev) => [
      ...prev,
      { id: uid("card"), title: "New Card", showRank: false, items: [] },
    ]);
  }

  function updateCard(next: EventInfoCardModel) {
    setCards((prev) => prev.map((c) => (c.id === next.id ? next : c)));
  }

  function deleteCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  function onPublish() {
    if (!canPublish) return;
    // TODO: 替换为后端 upsert
    router.back();
  }

  return (
    <View style={styles.container}>
      {/* topbar */}
      <View style={[styles.topbar, { paddingTop: insets.top }]}>
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
        <Text style={styles.topbarTitle}>Create Event</Text>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPublish}
          disabled={!canPublish}
          style={[styles.publishBtn, !canPublish && { opacity: 0.4 }]}
        >
          <Text style={styles.publishText}>Publish</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}
      >
        {/* basic block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basics</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Event title" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Organizer</Text>
            <TextInput value={organizerName} onChangeText={setOrganizerName} style={styles.input} placeholder="Organizer name" />
          </View>
        </View>

        {/* schedule block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>

          <View style={styles.row2}>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Start date</Text>
              <TextInput value={startDate} onChangeText={setStartDate} style={styles.input} placeholder="YYYY/MM/DD" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>End date (optional)</Text>
              <TextInput value={endDate} onChangeText={setEndDate} style={styles.input} placeholder="YYYY/MM/DD" />
            </View>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show time (hour & minute)</Text>
            <Switch value={showTime} onValueChange={setShowTime} />
          </View>

          {showTime ? (
            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Start time</Text>
                <TextInput value={startTime} onChangeText={setStartTime} style={styles.input} placeholder="HH:MM" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>End time (optional)</Text>
                <TextInput value={endTime} onChangeText={setEndTime} style={styles.input} placeholder="HH:MM" />
              </View>
            </View>
          ) : null}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show date row</Text>
            <Switch value={showDate} onValueChange={setShowDate} />
          </View>
        </View>

        {/* location block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show location</Text>
            <Switch value={showLocation} onValueChange={setShowLocation} />
          </View>

          {showLocation ? (
            <>
              <View style={styles.field}>
                <Text style={styles.label}>Location name</Text>
                <TextInput value={locationName} onChangeText={setLocationName} style={styles.input} placeholder="Gym name / venue" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Location detail (optional)</Text>
                <TextInput
                  value={locationDetail}
                  onChangeText={setLocationDetail}
                  style={styles.input}
                  placeholder="Address / check-in info"
                />
              </View>
            </>
          ) : null}
        </View>

        {/* rewards block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rewards</Text>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show rewards</Text>
            <Switch value={showRewards} onValueChange={setShowRewards} />
          </View>

          {showRewards ? (
            <View style={styles.field}>
              <Text style={styles.label}>Rewards line</Text>
              <TextInput
                value={rewardsLine}
                onChangeText={setRewardsLine}
                style={styles.input}
                placeholder="e.g. Gold badge · 50 XP · Featured in Gallery"
              />
            </View>
          ) : null}
        </View>

        {/* dynamic cards block */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Info Cards</Text>
            <TouchableOpacity onPress={addCard} activeOpacity={0.85} style={styles.addBtn}>
              <Ionicons name="add" size={18} color="#111" />
              <Text style={styles.addText}>Add card</Text>
            </TouchableOpacity>
          </View>

          {cards.map((c) => (
            <EventInfoCardEditor
              key={c.id}
              card={c}
              onChange={updateCard}
              onDelete={() => deleteCard(c.id)}
            />
          ))}
        </View>

        <View style={{ height: 18 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },

  topbar: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  topbarTitle: { flex: 1, fontSize: 16, fontWeight: "900", color: "#111", textAlign: "center" },
  publishBtn: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  publishText: { color: "#FFF", fontWeight: "900", fontSize: 12 },

  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { fontSize: 16, fontWeight: "900", color: "#111827" },

  field: { marginTop: 12 },
  label: { fontSize: 12, fontWeight: "900", color: "#6B7280", marginBottom: 8 },
  input: {
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "800",
    color: "#111",
  },

  row2: { flexDirection: "row", gap: 12, marginTop: 12 },

  switchRow: {
    marginTop: 14,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  switchLabel: { fontSize: 13, fontWeight: "900", color: "#111827" },

  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  addText: { fontSize: 12, fontWeight: "900", color: "#111" },
});
