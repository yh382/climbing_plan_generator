// src/features/profile/components/LocationPickerSheet.tsx

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { theme } from "src/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { api } from "src/lib/apiClient";

type LocationItem = {
  id: string;
  primary: string;
  secondary?: string | null;
  lat?: number | null;
  lng?: number | null;
  distance_m?: number | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (item: LocationItem) => void;
  title?: string;
};

function formatDistance(distance_m?: number | null) {
  if (!distance_m || distance_m <= 0) return "";
  if (distance_m < 1000) return `${Math.round(distance_m)} m`;
  return `${(distance_m / 1000).toFixed(1)} km`;
}

async function getDeviceCoords(): Promise<{ lat: number; lng: number } | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Location = require("expo-location") as typeof import("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

export default function LocationPickerSheet({ visible, onClose, onSelect, title = "Location" }: Props) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const sheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);
  const coordsRef = useRef<{ lat: number; lng: number } | null>(null);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<LocationItem[]>([]);
  const [query, setQuery] = useState("");

  const canUseNearby = useMemo(() => !!coords?.lat && !!coords?.lng, [coords]);

  // Present / dismiss
  useEffect(() => {
    if (visible && !isPresented.current) {
      sheetRef.current?.present();
      isPresented.current = true;
    } else if (!visible && isPresented.current) {
      sheetRef.current?.dismiss();
      isPresented.current = false;
    }
  }, [visible]);

  const handleDismiss = useCallback(() => {
    isPresented.current = false;
    setQuery("");
    onClose();
  }, [onClose]);

  // --- API ---
  const fetchNearby = async (c: { lat: number; lng: number } | null) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      if (!c) {
        setItems([]);
        setErrorMsg("Location permission not granted. You can still search.");
        return;
      }
      const res = await api.get<{ items: LocationItem[] }>(
        `/geo/locations/nearby?lat=${encodeURIComponent(c.lat)}&lng=${encodeURIComponent(c.lng)}&limit=5`
      );
      setItems(res.items ?? []);
    } catch (e: any) {
      setItems([]);
      setErrorMsg(e?.message ?? "Failed to load nearby locations");
    } finally {
      setLoading(false);
    }
  };

  const fetchSearch = useCallback(async (q: string, c: { lat: number; lng: number } | null) => {
    const trimmed = q.trim();
    if (!trimmed) {
      await fetchNearby(c);
      return;
    }
    try {
      setLoading(true);
      setErrorMsg(null);
      const qs = new URLSearchParams({ q: trimmed, limit: "10" });
      if (c?.lat != null && c?.lng != null) {
        qs.set("lat", String(c.lat));
        qs.set("lng", String(c.lng));
      }
      const res = await api.get<{ items: LocationItem[] }>(`/geo/locations/search?${qs.toString()}`);
      setItems(res.items ?? []);
    } catch (e: any) {
      setItems([]);
      setErrorMsg(e?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open: get coords + fetch nearby
  useEffect(() => {
    let mounted = true;
    if (!visible) return;

    (async () => {
      setQuery("");
      setItems([]);
      setErrorMsg(null);
      setLoading(true);
      const c = await getDeviceCoords();
      if (!mounted) return;
      setCoords(c);
      coordsRef.current = c;
      await fetchNearby(c);
    })();

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Debounced search
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      fetchSearch(query, coordsRef.current);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleSelect = useCallback((item: LocationItem) => {
    onSelect(item);
    sheetRef.current?.dismiss();
  }, [onSelect]);

  const renderItem = useCallback(({ item }: { item: LocationItem }) => {
    const distance = formatDistance(item.distance_m);
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.row}
        onPress={() => handleSelect(item)}
      >
        <View style={styles.rowLeft}>
          <Ionicons name="location-outline" size={18} color={colors.textPrimary} />
        </View>
        <View style={styles.rowMid}>
          <Text style={styles.primaryText} numberOfLines={1}>{item.primary}</Text>
          {!!item.secondary && (
            <Text style={styles.secondaryText} numberOfLines={1}>{item.secondary}</Text>
          )}
        </View>
        <View style={styles.rowRight}>
          {!!distance && <Text style={styles.distanceText}>{distance}</Text>}
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }, [styles, colors, handleSelect]);

  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.4, 0.9]}
      backgroundColor={colors.sheetBackground}
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      dimmed
      dimmedDetentIndex={0}
      onDidDismiss={handleDismiss}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textSecondary} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search city/area"
          placeholderTextColor={colors.textTertiary}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => fetchSearch(query, coordsRef.current)}
        />
        {!!query && (
          <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
            <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.textSecondary} />
          <Text style={styles.hintText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.hintText}>
                {errorMsg || (canUseNearby ? "Try searching." : "Enable location for nearby suggestions.")}
              </Text>
            </View>
          }
          style={{ flex: 1 }}
          contentContainerStyle={items.length === 0 ? { flexGrow: 1 } : { paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </TrueSheet>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    header: {
      paddingHorizontal: 22,
      paddingTop: 20,
      paddingBottom: 14,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    headerTitle: {
      fontSize: 15,
      fontWeight: "600",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      textAlign: "center",
    },
    searchWrap: {
      height: 44,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.cardBorder,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: colors.backgroundSecondary,
      marginHorizontal: 22,
      marginTop: 12,
      marginBottom: 8,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      color: colors.textPrimary,
      fontSize: 14,
      fontFamily: theme.fonts.regular,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 22,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.cardBorder,
    },
    rowLeft: { width: 28, alignItems: "center" },
    rowMid: { flex: 1, paddingLeft: 8 },
    rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    primaryText: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },
    secondaryText: {
      marginTop: 2,
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    distanceText: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
    },
    loadingWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 60,
    },
    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      paddingVertical: 60,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: "700",
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
      marginBottom: 6,
    },
    hintText: {
      fontSize: 12,
      fontFamily: theme.fonts.regular,
      color: colors.textSecondary,
      textAlign: "center",
    },
  });
