// src/features/community/events/EventEditorScreen.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { EventInfoCardModel, EventListItem } from "./data/types";
import { HeaderButton } from "@/components/ui/HeaderButton";
import EventInfoCardEditor from "./component/EventInfoCardEditor";
import { eventApi, type MyOrgItem } from "./api";

const CATEGORIES = [
  { value: "competition", label: "Competition" },
  { value: "meetup", label: "Meetup" },
  { value: "training", label: "Training" },
  { value: "route_setting", label: "Route Setting" },
  { value: "community", label: "Community" },
] as const;

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

function parseDateToISO(dateStr: string, timeStr?: string): string {
  const normalized = dateStr.replace(/\//g, "-");
  if (timeStr) return `${normalized}T${timeStr}:00`;
  return `${normalized}T00:00:00`;
}

export default function EventEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ===== org =====
  const [myOrgs, setMyOrgs] = useState<MyOrgItem[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);

  useEffect(() => {
    eventApi.getMyOrgs()
      .then(setMyOrgs)
      .catch(() => {})
      .finally(() => setOrgLoading(false));
  }, []);

  // ===== basic fields =====
  const [title, setTitle] = useState("New Event");
  const [category, setCategory] = useState("meetup");

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

  const [publishing, setPublishing] = useState(false);

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
    if (publishing) return false;
    return true;
  }, [title, showLocation, locationName, showRewards, rewardsLine, publishing]);

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

  async function onPublish() {
    if (!canPublish) return;

    if (myOrgs.length === 0) {
      Alert.alert("No Organization", "You need to belong to an organization to create events.");
      return;
    }

    const org = myOrgs[0];
    setPublishing(true);

    try {
      const startISO = parseDateToISO(startDate, showTime ? startTime : undefined);
      const endISO = endDate ? parseDateToISO(endDate, showTime ? endTime : undefined) : undefined;
      const highlights = showRewards && rewardsLine.trim()
        ? rewardsLine.split("·").map((s) => s.trim()).filter(Boolean)
        : undefined;

      await eventApi.createEvent({
        publisher_org_id: org.org_id,
        title: title.trim(),
        category,
        start_at: startISO,
        end_at: endISO,
        location_text: showLocation ? [locationName, locationDetail].filter(Boolean).join(", ") : undefined,
        highlights,
      });

      router.back();
    } catch (err: any) {
      Alert.alert("Failed", err?.message || "Could not create event. Please try again.");
    } finally {
      setPublishing(false);
    }
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
          {publishing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.publishText}>Publish</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}
      >
        {/* org hint */}
        {!orgLoading && myOrgs.length === 0 && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={16} color="#92400E" />
            <Text style={styles.warningText}>You are not a member of any organization. Join one to create events.</Text>
          </View>
        )}

        {/* basic block */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basics</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Title</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Event title" />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setCategory(cat.value)}
                  style={[styles.chip, category === cat.value && styles.chipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, category === cat.value && styles.chipTextActive]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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

  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFBEB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warningText: { flex: 1, fontSize: 12, fontWeight: "700", color: "#92400E" },

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

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: { backgroundColor: "#111827" },
  chipText: { fontSize: 12, fontWeight: "800", color: "#6B7280" },
  chipTextActive: { color: "#FFF" },

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
