// src/features/outdoor/components/AddToListSheet.tsx
// TrueSheet for toggling an outdoor route in/out of the user's lists.
// ✓ indicator uses useRouteContainment; "+ Create new list" row opens CreateListSheet inline.

import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { Ionicons } from "@expo/vector-icons";
import { useThemeColors } from "../../../lib/useThemeColors";
import { theme } from "../../../lib/theme";
import { useSettings } from "../../../contexts/SettingsContext";
import { outdoorListsApi } from "../listsApi";
import { useRouteContainment } from "../useUserLists";
import type { OutdoorList } from "../types";
import CreateListSheet from "./CreateListSheet";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Props = {
  visible: boolean;
  onClose: () => void;
  routeId: string | undefined;
  routeName?: string;
};

export default function AddToListSheet({ visible, onClose, routeId, routeName }: Props) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const { tr } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);

  const [lists, setLists] = useState<OutdoorList[]>([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const { contains, toggle } = useRouteContainment(routeId);
  const [busyListId, setBusyListId] = useState<string | null>(null);

  useEffect(() => {
    if (visible && !isPresented.current) {
      sheetRef.current?.present();
      isPresented.current = true;
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoadingLists(true);
    outdoorListsApi
      .listMine()
      .then((data) => {
        if (!cancelled) setLists(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingLists(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const handleToggle = async (listId: string) => {
    if (!routeId || busyListId) return;
    // Mock routes (dev-only) have short ids like "r4" — backend requires UUID,
    // so short-circuit with a clear message instead of hitting a 422.
    if (__DEV__ && !UUID_RE.test(routeId)) {
      Alert.alert(
        tr("Mock 数据不支持", "Mock data not supported"),
        tr(
          "这条是 mock 路线,无法添加到真实清单。请使用后端真实路线测试此功能。",
          "This is a mock route and can't be added to a real list. Use a backend route to test this flow.",
        ),
      );
      return;
    }
    setBusyListId(listId);
    try {
      await toggle(listId);
    } catch (e: any) {
      Alert.alert(tr("操作失败", "Action failed"), e?.message ?? "");
    } finally {
      setBusyListId(null);
    }
  };

  const handleCreated = (newList: OutdoorList) => {
    setLists((prev) => [newList, ...prev]);
    setCreateVisible(false);
    // Auto-add the current route to the new list.
    if (routeId) {
      handleToggle(newList.id);
    }
  };

  return (
    <>
      <TrueSheet
        ref={sheetRef}
        detents={["auto"]}
        backgroundColor={colors.sheetBackground}
        grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
        dimmed
        onDidDismiss={() => {
          isPresented.current = false;
          onClose();
        }}
      >
        <View style={{ paddingTop: 16, paddingBottom: insets.bottom + 12 }}>
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>
              {tr("添加到清单", "Add to List")}
            </Text>
            {routeName ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {routeName}
              </Text>
            ) : null}
          </View>

          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {loadingLists ? (
              <View style={styles.centered}>
                <ActivityIndicator color={colors.accent} />
              </View>
            ) : (
              <>
                {lists.map((list) => {
                  const checked = contains(list.id);
                  const busy = busyListId === list.id;
                  return (
                    <TouchableOpacity
                      key={list.id}
                      style={[styles.row, checked && styles.rowChecked]}
                      onPress={() => handleToggle(list.id)}
                      disabled={busy}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="list"
                        size={14}
                        color={checked ? "#FFFFFF" : colors.textTertiary}
                      />
                      <Text style={[styles.rowName, checked && styles.rowNameChecked]} numberOfLines={1}>
                        {list.name}
                      </Text>
                      <Text style={[styles.rowCount, checked && styles.rowCountChecked]}>
                        {list.item_count}
                      </Text>
                      {busy ? (
                        <ActivityIndicator color={checked ? "#FFFFFF" : colors.accent} />
                      ) : checked ? (
                        <Ionicons name="checkmark-circle" size={22} color="#FFFFFF" />
                      ) : (
                        <Ionicons name="ellipse-outline" size={22} color={colors.textTertiary} />
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={styles.createRow}
                  onPress={() => setCreateVisible(true)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.plusCircle, { backgroundColor: colors.accent }]}>
                    <Ionicons name="add" size={18} color="#FFFFFF" />
                  </View>
                  <Text style={[styles.createText, { color: colors.textPrimary }]}>
                    {tr("新建清单", "Create new list")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </TrueSheet>

      <CreateListSheet
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
        onCreated={handleCreated}
      />
    </>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    header: { paddingHorizontal: 20, marginBottom: 12 },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 17,
      color: c.textPrimary,
      textAlign: "center",
    },
    subtitle: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textTertiary,
      textAlign: "center",
      marginTop: 2,
    },
    centered: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: c.sheetCardBackground,
      marginBottom: 8,
      gap: 10,
    },
    rowChecked: { backgroundColor: c.accent },
    rowName: {
      flex: 1,
      fontFamily: theme.fonts.medium,
      fontSize: 15,
      color: c.textPrimary,
    },
    rowNameChecked: { color: "#FFFFFF" },
    rowCount: {
      fontFamily: theme.fonts.regular,
      fontSize: 12,
      color: c.textTertiary,
    },
    rowCountChecked: { color: "rgba(255,255,255,0.8)" },
    createRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 14,
      backgroundColor: c.sheetCardBackground,
      gap: 12,
      marginTop: 4,
    },
    plusCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    createText: { fontFamily: theme.fonts.medium, fontSize: 15 },
  });
