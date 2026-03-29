import { useState, useCallback, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Platform,
  Keyboard,
} from "react-native";
import { useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { HeaderButton } from "../src/components/ui/HeaderButton";
import { NativeSegmentedControl } from "../src/components/ui";
import { NativeSearchBar } from "../modules/native-input/src";
import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { searchApi, type SearchUserResult, type RecommendedUser } from "@/features/search/api";
import UserRecommendCard from "@/features/search/UserRecommendCard";
import type { ChallengeOut } from "@/features/community/challenges/types";
import type { EventOut } from "@/features/community/events/types";

type SearchTab = "community" | "activity" | "knowledge";
const TAB_KEYS: SearchTab[] = ["community", "activity", "knowledge"];
const TAB_LABELS = ["Community", "Activity", "Knowledge"];

export default function UniversalSearchScreen() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const navigation = useNavigation();
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

  // Native header with scroll edge effects
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: true,
      headerTransparent: true,
      scrollEdgeEffects: { top: "soft" },
      title: "",
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={() => router.back()} />
      ),
    });
  }, [navigation, router]);

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

  // NativeSearchBar event handlers
  const handleNativeChangeText = useCallback(
    (e: { nativeEvent: { text: string } }) => {
      onChangeText(e.nativeEvent.text);
    },
    [onChangeText]
  );

  const handleNativeSubmit = useCallback(
    (e: { nativeEvent: { text: string } }) => {
      if (query.trim()) doSearch(query, activeTab);
    },
    [query, activeTab, doSearch]
  );

  const handleClear = useCallback(() => {
    setQuery("");
    setUsers([]);
    setChallenges([]);
    setEvents([]);
  }, []);

  const handleCancel = useCallback(() => {
    handleClear();
    Keyboard.dismiss();
  }, [handleClear]);

  const onTabChange = useCallback(
    (tab: SearchTab) => {
      setActiveTab(tab);
      if (query.trim()) {
        doSearch(query, tab);
      }
    },
    [query, doSearch]
  );

  const hasQuery = query.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Native Search Bar */}
        {Platform.OS === "ios" ? (
          <View style={styles.searchWrap} collapsable={false}>
            <NativeSearchBar
              style={styles.nativeSearchBar}
              placeholder="Search everything..."
              text={query}
              showsCancelButton
              autoCapitalize="none"
              searchFieldHeight={40}
              onChangeText={handleNativeChangeText}
              onSubmitSearch={handleNativeSubmit}
              onCancel={handleCancel}
              onClear={handleClear}
            />
          </View>
        ) : (
          <View style={styles.androidSearchWrap}>
            <View style={styles.androidSearchRow}>
              <Ionicons name="search" size={18} color="#9CA3AF" style={{ marginLeft: 12 }} />
              <TextInput
                style={styles.androidInput}
                value={query}
                onChangeText={onChangeText}
                onSubmitEditing={() => { if (query.trim()) doSearch(query, activeTab); }}
                placeholder="Search everything..."
                placeholderTextColor="#9CA3AF"
                autoCapitalize="none"
                autoFocus
                returnKeyType="search"
              />
              {hasQuery && (
                <TouchableOpacity onPress={handleClear} style={styles.androidClear} activeOpacity={0.7}>
                  <Ionicons name="close-circle" size={18} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Native Segmented Control */}
        <View style={styles.segmentWrap}>
          <NativeSegmentedControl
            options={TAB_LABELS}
            selectedIndex={TAB_KEYS.indexOf(activeTab)}
            onSelect={(i) => onTabChange(TAB_KEYS[i])}
            style={{ height: 32 }}
          />
        </View>

        {/* Loading */}
        {loading && (
          <View style={styles.centerInline}>
            <ActivityIndicator size="large" color={colors.textSecondary} />
          </View>
        )}

        {/* Tab Content */}
        {!loading && (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {/* ===== Community Tab ===== */}
          {activeTab === "community" && (
            <>
              {!hasQuery ? (
                <View style={{ gap: 8 }}>
                  <Text style={styles.sectionLabel}>Suggested Climbers</Text>
                  {recLoading ? (
                    <ActivityIndicator size="small" color={colors.textSecondary} style={{ marginTop: 20 }} />
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
                      <Ionicons name="search" size={32} color={colors.textTertiary} />
                      <Text style={styles.hintText}>Search for climbers by name</Text>
                    </View>
                  )}
                </View>
              ) : users.length === 0 ? (
                <View style={styles.hintBox}>
                  <Ionicons name="search-outline" size={40} color={colors.textTertiary} />
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
                  <Ionicons name="search-outline" size={40} color={colors.textTertiary} />
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
              <Ionicons name="book-outline" size={32} color={colors.textTertiary} />
              <Text style={styles.comingSoonText}>Coming Soon</Text>
              <Text style={styles.comingSoonSub}>
                Blog, exercises, and training plans
              </Text>
            </View>
          )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  // Native search bar
  searchWrap: {
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  nativeSearchBar: {
    height: 56,
  },
  // Android search bar fallback
  androidSearchWrap: {
    paddingHorizontal: 12,
    paddingTop: 4,
  },
  androidSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.backgroundSecondary,
  },
  androidInput: {
    flex: 1,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  androidClear: {
    paddingHorizontal: 12,
    height: 40,
    justifyContent: "center",
  },

  // Segmented control
  segmentWrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
  },

  centerInline: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
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
