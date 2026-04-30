// src/features/outdoor/components/ListsSection.tsx
// Renders the user's lists (owner or viewer). Reused by:
//   - Profile tab "lists" page
//   - Standalone /profile/lists page
//   - Other-user profile public-lists section

import { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../../lib/useThemeColors";
import { theme } from "../../../lib/theme";
import { useSettings } from "../../../contexts/SettingsContext";
import { outdoorListsApi } from "../listsApi";
import type { OutdoorList } from "../types";
import ListCard from "./ListCard";
import CreateListSheet from "./CreateListSheet";

type Props = {
  /** When present, show that user's public lists (read-only). When absent, show current user's own lists. */
  userId?: string;
  /** When true, render a Create-list row at the top (only for self). */
  showCreate?: boolean;
  /** Optional outer padding override (used in Profile tab which already has horizontal padding). */
  contentPaddingHorizontal?: number;
  /** Set true when embedded inside a parent ScrollView (e.g. Profile tab's PagerView).
   *  Renders plain views instead of a FlatList to avoid the "nested VirtualizedList"
   *  warning, and disables the built-in RefreshControl (the outer scroll handles it). */
  inScrollView?: boolean;
};

export default function ListsSection({ userId, showCreate = true, contentPaddingHorizontal = 16, inScrollView = false }: Props) {
  const colors = useThemeColors();
  const router = useRouter();
  const { tr } = useSettings();
  const isSelf = !userId;

  const [lists, setLists] = useState<OutdoorList[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const mountedRef = useRef(true);

  const fetchLists = useCallback(async () => {
    try {
      const data = isSelf
        ? await outdoorListsApi.listMine()
        : await outdoorListsApi.listByUser(userId!);
      if (mountedRef.current) setLists(data);
    } catch {
      // silent
    }
  }, [isSelf, userId]);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      await fetchLists();
      if (mountedRef.current) setLoading(false);
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchLists]);

  useFocusEffect(
    useCallback(() => {
      fetchLists();
    }, [fetchLists])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLists();
    setRefreshing(false);
  };

  const handleCardPress = (list: OutdoorList) => {
    const params = userId ? `?userId=${encodeURIComponent(userId)}` : "";
    router.push(`/profile/lists/${list.id}${params}` as any);
  };

  const handleCreated = (newList: OutdoorList) => {
    setLists((prev) => [newList, ...prev]);
    setCreateVisible(false);
    router.push(`/profile/lists/${newList.id}` as any);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  const empty = lists.length === 0;
  const showCreateBtn = isSelf && showCreate;

  const header = showCreateBtn ? (
    <TouchableOpacity
      style={[styles.createRow, { backgroundColor: colors.backgroundSecondary }]}
      onPress={() => setCreateVisible(true)}
      activeOpacity={0.7}
    >
      <View style={[styles.plusCircle, { backgroundColor: colors.accent }]}>
        <Ionicons name="add" size={20} color="#FFFFFF" />
      </View>
      <Text style={[styles.createText, { color: colors.textPrimary }]}>
        {tr("新建清单", "Create List")}
      </Text>
    </TouchableOpacity>
  ) : null;

  const emptyView = empty ? (
    <View style={styles.emptyWrap}>
      <Ionicons name="list-outline" size={40} color={colors.textTertiary} />
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
        {isSelf ? tr("还没有清单", "No lists yet") : tr("暂无公开清单", "No public lists")}
      </Text>
      {isSelf ? (
        <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
          {tr("创建你的第一个清单", "Create your first list")}
        </Text>
      ) : null}
    </View>
  ) : null;

  const body = inScrollView ? (
    <View
      style={{
        paddingHorizontal: contentPaddingHorizontal,
        paddingTop: 12,
        paddingBottom: 32,
      }}
    >
      {header}
      {empty
        ? emptyView
        : lists.map((item) => (
            <ListCard key={item.id} list={item} onPress={() => handleCardPress(item)} />
          ))}
    </View>
  ) : (
    <FlatList
      data={lists}
      keyExtractor={(l) => l.id}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: contentPaddingHorizontal,
        paddingTop: 12,
        paddingBottom: 32,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      ListHeaderComponent={header}
      ListEmptyComponent={emptyView}
      renderItem={({ item }) => <ListCard list={item} onPress={() => handleCardPress(item)} />}
    />
  );

  return (
    <>
      {body}
      {showCreateBtn ? (
        <CreateListSheet
          visible={createVisible}
          onClose={() => setCreateVisible(false)}
          onCreated={handleCreated}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 48 },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    gap: 12,
  },
  plusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  createText: { fontFamily: theme.fonts.medium, fontSize: 15 },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 72, gap: 8 },
  emptyTitle: { fontFamily: theme.fonts.bold, fontSize: 16 },
  emptySub: { fontFamily: theme.fonts.regular, fontSize: 13 },
});
