// app/community/search.tsx

import { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useSearchUsers, PublicProfile } from "../../src/features/community/hooks";

export default function SearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  const { results, loading, search, clear } = useSearchUsers();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!text.trim()) {
        clear();
        return;
      }
      debounceRef.current = setTimeout(() => {
        search(text);
      }, 400);
    },
    [search, clear]
  );

  const onClear = useCallback(() => {
    setQuery("");
    clear();
  }, [clear]);

  const renderUser = ({ item }: { item: PublicProfile }) => (
    <TouchableOpacity
      style={styles.userRow}
      activeOpacity={0.7}
      onPress={() => router.push(`/community/u/${item.id}`)}
    >
      {item.avatarUrl ? (
        <Image source={{ uri: item.avatarUrl }} style={styles.avatarImg} />
      ) : (
        <View style={[styles.avatarImg, styles.avatarPlaceholder]}>
          <Ionicons name="person" size={18} color="#9CA3AF" />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.username}>{item.displayName}</Text>
        <Text style={styles.userSub} numberOfLines={1}>
          @{item.username}
          {item.bio ? ` · ${item.bio}` : ""}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const hasQuery = query.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF", paddingTop: insets.top }}>
      {/* Search Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#111" />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9CA3AF" />
          <TextInput
            style={styles.input}
            placeholder="Search climbers..."
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

      {/* Results */}
      {loading && results.length === 0 ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#111" />
        </View>
      ) : hasQuery && results.length === 0 && !loading ? (
        <View style={styles.centerContainer}>
          <Ionicons name="search-outline" size={48} color="#E5E7EB" />
          <Text style={styles.emptyText}>No results found</Text>
        </View>
      ) : hasQuery ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
        />
      ) : (
        <View style={styles.hintContainer}>
          <Ionicons name="search" size={40} color="#E5E7EB" />
          <Text style={styles.hintText}>Search for climbers by name</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#F3F4F6",
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 12,
  },
  input: { flex: 1, marginLeft: 8, fontSize: 16, height: "100%" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F3F4F6",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
  },
  username: { fontWeight: "700", color: "#111", fontSize: 15 },
  userSub: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: { color: "#9CA3AF", fontSize: 15 },
  hintContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    opacity: 0.6,
  },
  hintText: { color: "#9CA3AF", fontSize: 15 },
});
