import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { searchApi, type SearchUserResult, type RecommendedUser } from "@/features/search/api";
import UserRecommendCard from "@/features/search/UserRecommendCard";
import type { ChallengeOut } from "@/features/community/challenges/types";
import type { EventOut } from "@/features/community/events/types";

type SearchTab = "community" | "activity" | "knowledge";

const TABS: { key: SearchTab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: "community", label: "Community", icon: "people" },
  { key: "activity", label: "Activity", icon: "trophy" },
  { key: "knowledge", label: "Knowledge", icon: "book" },
];

export default function UniversalSearchScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<SearchTab>("community");
  const [loading, setLoading] = useState(false);

  // Search results per tab
  const [users, setUsers] = useState<SearchUserResult[]>([]);
  const [challenges, setChallenges] = useState<ChallengeOut[]>([]);
  const [events, setEvents] = useState<EventOut[]>([]);

  // Recommended users for Community tab
  const [recommended, setRecommended] = useState<RecommendedUser[]>([]);
  const [recLoading, setRecLoading] = useState(false);

  // Recommended content for Activity tab (no query)
  const [recChallenge, setRecChallenge] = useState<ChallengeOut | null>(null);
  const [recEvent, setRecEvent] = useState<EventOut | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recommended content on mount
  useEffect(() => {
    setRecLoading(true);
    searchApi.getRecommendedUsers()
      .then(setRecommended)
      .catch(() => {})
      .finally(() => setRecLoading(false));
    searchApi.searchChallenges("").then((all) => {
      if (all.length > 0) setRecChallenge(all[0]);
    }).catch(() => {});
    searchApi.searchEvents("").then((all) => {
      if (all.length > 0) setRecEvent(all[0]);
    }).catch(() => {});
  }, []);

  const doSearch = useCallback(
    async (q: string, tab: SearchTab) => {
      setLoading(true);
      try {
        if (tab === "community") {
          const u = await searchApi.searchUsers(q).catch(() => [] as SearchUserResult[]);
          setUsers(u);
        } else if (tab === "activity") {
          const [c, e] = await Promise.all([
            searchApi.searchChallenges(q).catch(() => [] as ChallengeOut[]),
            searchApi.searchEvents(q).catch(() => [] as EventOut[]),
          ]);
          setChallenges(c);
          setEvents(e);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const onChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!text.trim()) {
        setUsers([]);
        setChallenges([]);
        setEvents([]);
        return;
      }
      debounceRef.current = setTimeout(() => doSearch(text, activeTab), 400);
    },
    [doSearch, activeTab]
  );

  const onTabChange = useCallback(
    (tab: SearchTab) => {
      setActiveTab(tab);
      // Re-search with current query under new tab
      if (query.trim()) {
        doSearch(query, tab);
      }
    },
    [query, doSearch]
  );

  const onClear = useCallback(() => {
    setQuery("");
    setUsers([]);
    setChallenges([]);
    setEvents([]);
  }, []);

  const hasQuery = query.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Search everything..."
            autoFocus
            value={query}
            onChangeText={onChangeText}
          />
          {hasQuery && (
            <TouchableOpacity onPress={onClear}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const active = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabChip, active && styles.tabChipActive]}
              onPress={() => onTabChange(t.key)}
            >
              <Ionicons name={t.icon} size={14} color={active ? "#FFF" : "#6B7280"} />
              <Text style={[styles.tabChipText, active && styles.tabChipTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Loading */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      )}

      {/* Tab Content */}
      {!loading && (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* ===== Community Tab ===== */}
          {activeTab === "community" && (
            <>
              {!hasQuery ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.sectionLabel}>Suggested Climbers</Text>
                  {recLoading ? (
                    <ActivityIndicator size="small" color="#111" style={{ marginTop: 20 }} />
                  ) : recommended.length > 0 ? (
                    recommended.map((u) => (
                      <UserRecommendCard
                        key={u.user_id}
                        user={u}
                        onPress={(id) => router.push(`/community/u/${id}`)}
                      />
                    ))
                  ) : (
                    <View style={styles.hintBox}>
                      <Ionicons name="search" size={32} color="#E5E7EB" />
                      <Text style={styles.hintText}>Search for climbers by name</Text>
                    </View>
                  )}
                </View>
              ) : users.length === 0 ? (
                <View style={styles.hintBox}>
                  <Ionicons name="search-outline" size={40} color="#E5E7EB" />
                  <Text style={styles.emptyText}>No users found</Text>
                </View>
              ) : (
                <>
                  {users.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={styles.userRow}
                      onPress={() => router.push(`/community/u/${u.id}`)}
                    >
                      {u.avatarUrl ? (
                        <Image source={{ uri: u.avatarUrl }} style={styles.avatar} />
                      ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={16} color="#9CA3AF" />
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle}>{u.displayName}</Text>
                        <Text style={styles.rowSub}>@{u.username}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </>
          )}

          {/* ===== Activity Tab ===== */}
          {activeTab === "activity" && (
            <>
              {!hasQuery ? (
                /* Recommended content */
                <View style={{ gap: 8 }}>
                  <Text style={styles.sectionLabel}>Recommended</Text>
                  {recChallenge && (
                    <TouchableOpacity
                      style={styles.resultRow}
                      onPress={() =>
                        router.push({
                          pathname: "/community/challenges/[challengeId]",
                          params: { challengeId: recChallenge.id },
                        })
                      }
                    >
                      <Ionicons name="trophy" size={20} color="#F59E0B" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {recChallenge.title}
                        </Text>
                        <Text style={styles.rowSub}>
                          {recChallenge.participantCount} joined
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                  )}
                  {recEvent && (
                    <TouchableOpacity
                      style={styles.resultRow}
                      onPress={() =>
                        router.push({
                          pathname: "/community/events/[eventId]",
                          params: { eventId: recEvent.id },
                        })
                      }
                    >
                      <MaterialCommunityIcons
                        name="ticket-confirmation"
                        size={20}
                        color="#16A34A"
                      />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {recEvent.title}
                        </Text>
                        <Text style={styles.rowSub}>
                          {new Date(recEvent.start_at).toLocaleDateString()}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                  )}
                  {!recChallenge && !recEvent && (
                    <Text style={styles.emptyText}>No content available</Text>
                  )}
                </View>
              ) : challenges.length === 0 && events.length === 0 ? (
                <View style={styles.hintBox}>
                  <Ionicons name="search-outline" size={40} color="#E5E7EB" />
                  <Text style={styles.emptyText}>No results found</Text>
                </View>
              ) : (
                <>
                  {/* Challenges */}
                  {challenges.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>Challenges</Text>
                      {challenges.map((c) => (
                        <TouchableOpacity
                          key={c.id}
                          style={styles.resultRow}
                          onPress={() =>
                            router.push({
                              pathname: "/community/challenges/[challengeId]",
                              params: { challengeId: c.id },
                            })
                          }
                        >
                          <Ionicons name="trophy" size={20} color="#F59E0B" />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {c.title}
                            </Text>
                            <Text style={styles.rowSub}>
                              {c.participantCount} joined
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Events */}
                  {events.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>Events</Text>
                      {events.map((e) => (
                        <TouchableOpacity
                          key={e.id}
                          style={styles.resultRow}
                          onPress={() =>
                            router.push({
                              pathname: "/community/events/[eventId]",
                              params: { eventId: e.id },
                            })
                          }
                        >
                          <MaterialCommunityIcons
                            name="ticket-confirmation"
                            size={20}
                            color="#16A34A"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.rowTitle} numberOfLines={1}>
                              {e.title}
                            </Text>
                            <Text style={styles.rowSub}>
                              {new Date(e.start_at).toLocaleDateString()}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {/* ===== Knowledge Tab ===== */}
          {activeTab === "knowledge" && (
            <View style={styles.comingSoon}>
              <Ionicons name="book-outline" size={32} color="#D1D5DB" />
              <Text style={styles.comingSoonText}>Coming Soon</Text>
              <Text style={styles.comingSoonSub}>
                Blog, exercises, and training plans
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.backgroundSecondary,
    height: 40,
    borderRadius: theme.borderRadius.pill,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: theme.fonts.regular,
    height: "100%",
  },

  // Tabs
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 8,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
  },
  tabChipActive: { backgroundColor: colors.cardDark },
  tabChipText: {
    fontSize: 13,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
  },
  tabChipTextActive: { color: "#FFF" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: colors.textTertiary,
    fontFamily: theme.fonts.regular,
    fontSize: 15,
    textAlign: "center",
  },

  hintBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  hintText: {
    color: colors.textTertiary,
    fontFamily: theme.fonts.regular,
    fontSize: 15,
  },

  // Result sections
  section: { marginTop: 16 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundSecondary,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
  },
  rowSub: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    marginTop: 1,
  },

  // Coming soon
  comingSoon: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  comingSoonText: {
    fontSize: 16,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textTertiary,
  },
  comingSoonSub: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
  },
});
