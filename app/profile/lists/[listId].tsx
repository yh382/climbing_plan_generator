// List detail page — routes inside a user list. Owner can edit/delete the list
// and swipe-delete items. Viewer sees read-only.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { Swipeable } from "react-native-gesture-handler";
import { TouchableOpacity } from "react-native-gesture-handler";
import { Ionicons } from "@expo/vector-icons";
import { HeaderButton } from "../../../src/components/ui/HeaderButton";
import { ScrollEdgeFallback } from "@/components/shared/ScrollEdgeFallback";
import { useThemeColors } from "../../../src/lib/useThemeColors";
import { theme } from "../../../src/lib/theme";
import { useSettings } from "../../../src/contexts/SettingsContext";
import { outdoorListsApi } from "../../../src/features/outdoor/listsApi";
import type { OutdoorListDetail, OutdoorListItem } from "../../../src/features/outdoor/types";
import RouteListCard from "../../../src/features/outdoor/components/RouteListCard";
import CreateListSheet from "../../../src/features/outdoor/components/CreateListSheet";
import { listMapHref } from "../../../src/features/mapscreen/navigation";

export default function ListDetailPage() {
  const navigation = useNavigation();
  const router = useRouter();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const { listId, userId } = useLocalSearchParams<{ listId: string; userId?: string }>();
  const viewingOtherUser = typeof userId === "string" && userId.length > 0;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [detail, setDetail] = useState<OutdoorListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editVisible, setEditVisible] = useState(false);
  const mountedRef = useRef(true);

  const isOwner = !viewingOtherUser && !!detail; // owner check also enforced backend-side via /me

  const fetchDetail = useCallback(async () => {
    if (!listId) return;
    try {
      const data = await outdoorListsApi.getDetail(listId);
      if (mountedRef.current) setDetail(data);
    } catch (e: any) {
      if (mountedRef.current) {
        Alert.alert(tr("加载失败", "Failed to load"), e?.message ?? "");
      }
    }
  }, [listId, tr]);

  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      await fetchDetail();
      if (mountedRef.current) setLoading(false);
    })();
    return () => {
      mountedRef.current = false;
    };
  }, [fetchDetail]);

  const handleDeleteList = useCallback(() => {
    if (!detail) return;
    Alert.alert(
      tr("删除清单", "Delete List"),
      tr("确定删除这个清单吗？此操作不可撤销。", "Delete this list? This cannot be undone."),
      [
        { text: tr("取消", "Cancel"), style: "cancel" },
        {
          text: tr("删除", "Delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await outdoorListsApi.delete(detail.id);
              router.back();
            } catch (e: any) {
              Alert.alert(tr("删除失败", "Delete failed"), e?.message ?? "");
            }
          },
        },
      ]
    );
  }, [detail, router, tr]);

  const handleRemoveItem = useCallback(
    async (item: OutdoorListItem) => {
      if (!detail) return;
      const prevItems = detail.items;
      setDetail((p) =>
        p ? { ...p, items: p.items.filter((i) => i.id !== item.id), item_count: p.item_count - 1 } : p
      );
      try {
        await outdoorListsApi.removeItem(detail.id, item.id);
      } catch (e: any) {
        setDetail((p) => (p ? { ...p, items: prevItems, item_count: prevItems.length } : p));
        Alert.alert(tr("移除失败", "Remove failed"), e?.message ?? "");
      }
    },
    [detail, tr]
  );

  // --- Header setup ---
  useLayoutEffect(() => {
    navigation.setOptions({
      title: detail?.name ?? tr("清单", "List"),
      headerLargeTitle: true,
      headerLargeTitleShadowVisible: false,
      headerLeft: () => <HeaderButton icon="chevron.backward" onPress={() => router.back()} />,
    });
  }, [navigation, detail?.name, tr, router]);

  // --- Render ---
  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }
  if (!detail) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.textSecondary, fontFamily: theme.fonts.regular }}>
          {tr("未找到清单", "List not found")}
        </Text>
      </View>
    );
  }

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDetail();
    setRefreshing(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Toolbar placement="right">
        {detail.item_count > 0 ? (
          <Stack.Toolbar.Button
            icon="map"
            onPress={() => router.push(listMapHref(detail.id))}
          />
        ) : null}
        {isOwner ? (
          <Stack.Toolbar.Menu icon="ellipsis">
            <Stack.Toolbar.MenuAction icon="pencil" onPress={() => setEditVisible(true)}>
              {tr("编辑详情", "Edit details")}
            </Stack.Toolbar.MenuAction>
            <Stack.Toolbar.MenuAction icon="trash" onPress={handleDeleteList}>
              {tr("删除清单", "Delete list")}
            </Stack.Toolbar.MenuAction>
          </Stack.Toolbar.Menu>
        ) : null}
      </Stack.Toolbar>

      <ScrollEdgeFallback>
      <FlatList
        data={detail.items}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          detail.description ? (
            <Text style={styles.description}>{detail.description}</Text>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="add-circle-outline" size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {tr("清单暂无路线", "No routes yet")}
            </Text>
            {isOwner ? (
              <Text style={[styles.emptySub, { color: colors.textTertiary }]}>
                {tr(
                  "从路线详情页的右上菜单添加",
                  "Add routes from a route detail's menu"
                )}
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => {
          if (!item.route) {
            return (
              <View style={styles.unavailable}>
                <Text style={{ color: colors.textTertiary, fontFamily: theme.fonts.regular }}>
                  {tr("路线不可用", "Route unavailable")}
                </Text>
              </View>
            );
          }
          const routeId = item.route.id;
          const card = (
            <RouteListCard
              route={item.route}
              onPress={() =>
                router.push(`/outdoor/outdoor-route-detail?id=${encodeURIComponent(routeId)}` as any)
              }
            />
          );
          if (!isOwner) return card;
          return (
            <Swipeable
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.deleteAction}
                  onPress={() => handleRemoveItem(item)}
                >
                  <Ionicons name="trash" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              overshootRight={false}
            >
              {card}
            </Swipeable>
          );
        }}
      />
      </ScrollEdgeFallback>

      <CreateListSheet
        visible={editVisible}
        onClose={() => setEditVisible(false)}
        onCreated={(updated) => {
          setDetail((p) => (p ? { ...p, ...updated } : p));
          setEditVisible(false);
        }}
        editing={detail}
      />
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center" },
    description: {
      fontFamily: theme.fonts.regular,
      fontSize: 14,
      color: c.textSecondary,
      marginBottom: 12,
    },
    emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: 72, gap: 8 },
    emptyText: { fontFamily: theme.fonts.bold, fontSize: 16 },
    emptySub: { fontFamily: theme.fonts.regular, fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
    unavailable: {
      padding: 14,
      backgroundColor: c.backgroundSecondary,
      borderRadius: 14,
      marginBottom: 8,
      alignItems: "center",
    },
    deleteAction: {
      backgroundColor: "#FF3B30",
      width: 72,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 8,
      borderTopRightRadius: 14,
      borderBottomRightRadius: 14,
    },
  });
