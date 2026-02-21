// src/features/profile/components/LocationPickerSheet.tsx

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "src/lib/apiClient";

type LocationItem = {
  id: string;
  primary: string; // e.g. Draper
  secondary?: string | null; // e.g. Utah, United States
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

const SCREEN_HEIGHT = Dimensions.get("window").height;
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.75);

function formatDistance(distance_m?: number | null) {
  if (!distance_m || distance_m <= 0) return "";
  if (distance_m < 1000) return `${Math.round(distance_m)} m`;
  return `${(distance_m / 1000).toFixed(1)} km`;
}

async function getDeviceCoords(): Promise<{ lat: number; lng: number } | null> {
  // Lazy import to avoid crashing if expo-location isn't installed.
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
  const insets = useSafeAreaInsets();

  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const [showModal, setShowModal] = useState(visible);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [items, setItems] = useState<LocationItem[]>([]);
  const [query, setQuery] = useState("");

  const canUseNearby = useMemo(() => !!coords?.lat && !!coords?.lng, [coords]);

  const closeWithAnimation = () => {
    Animated.timing(translateY, {
      toValue: SHEET_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onClose();
    });
  };

  const openWithAnimation = () => {
    setShowModal(true);
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 22,
      stiffness: 120,
    }).start();
  };

  useEffect(() => {
    if (visible) openWithAnimation();
    else if (showModal) closeWithAnimation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.vy > 0.5 || gestureState.dy > 110) closeWithAnimation();
        else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            damping: 22,
            stiffness: 220,
          }).start();
        }
      },
    })
  ).current;

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
        `/geo/locations/nearby?lat=${encodeURIComponent(c.lat)}&lng=${encodeURIComponent(c.lng)}&limit=10`
      );
      setItems(res.items ?? []);
    } catch (e: any) {
      setItems([]);
      setErrorMsg(e?.message ?? "Failed to load nearby locations");
    } finally {
      setLoading(false);
    }
  };

  const fetchSearch = async (q: string, c: { lat: number; lng: number } | null) => {
    const trimmed = q.trim();
    if (!trimmed) {
      await fetchNearby(c);
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);

      const lat = c?.lat;
      const lng = c?.lng;
      const qs = new URLSearchParams({ q: trimmed, limit: "10" });
      if (lat != null && lng != null) {
        qs.set("lat", String(lat));
        qs.set("lng", String(lng));
      }

      const res = await api.get<{ items: LocationItem[] }>(`/geo/locations/search?${qs.toString()}`);
      setItems(res.items ?? []);
    } catch (e: any) {
      setItems([]);
      setErrorMsg(e?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  // Open: get coords once + fetch nearby
  useEffect(() => {
    let mounted = true;
    if (!visible) return;

    (async () => {
      setQuery("");
      setItems([]);
      setErrorMsg(null);

      const c = await getDeviceCoords();
      if (!mounted) return;
      setCoords(c);
      await fetchNearby(c);
    })();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Debounced search
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      fetchSearch(query, coords);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <Modal animationType="fade" transparent visible={showModal} onRequestClose={closeWithAnimation}>
      <Pressable style={styles.overlay} onPress={closeWithAnimation}>
        <Animated.View
          style={[
            styles.sheet,
            {
              height: SHEET_HEIGHT + insets.bottom,
              paddingBottom: insets.bottom + 12,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ flex: 1 }}>
            <View style={styles.dragHandleArea}>
              <View style={styles.dragIndicator} />
            </View>

            <View style={styles.headerRow}>
              <Text style={styles.title}>{title}</Text>
            </View>

            <View style={styles.searchWrap}>
              <Ionicons name="search" size={18} color="#64748B" />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search city/area"
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
              />
              {!!query && (
                <TouchableOpacity onPress={() => setQuery("")} hitSlop={10}>
                  <Ionicons name="close-circle" size={18} color="#94A3B8" />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.listArea}>
              {loading ? (
                <View style={styles.centerPad}>
                  <ActivityIndicator />
                  <Text style={styles.hintText}>Loading…</Text>
                </View>
              ) : items.length === 0 ? (
                <View style={styles.centerPad}>
                  <Text style={styles.emptyTitle}>No results</Text>
                  <Text style={styles.hintText}>
                    {errorMsg ? errorMsg : canUseNearby ? "Try searching." : "Enable location for nearby suggestions."}
                  </Text>
                </View>
              ) : (
                <View style={styles.list}>
                  {items.map((it) => {
                    const distance = formatDistance(it.distance_m);
                    return (
                      <TouchableOpacity
                        key={it.id}
                        activeOpacity={0.75}
                        style={styles.row}
                        onPress={() => {
                          onSelect(it);
                          closeWithAnimation();
                        }}
                      >
                        <View style={styles.rowLeft}>
                          <Ionicons name="location-outline" size={18} color="#0F172A" />
                        </View>

                        <View style={styles.rowMid}>
                          <Text style={styles.primaryText} numberOfLines={1}>
                            {it.primary}
                          </Text>
                          {!!it.secondary && (
                            <Text style={styles.secondaryText} numberOfLines={1}>
                              {it.secondary}
                            </Text>
                          )}
                        </View>

                        <View style={styles.rowRight}>
                          {!!distance && <Text style={styles.distanceText}>{distance}</Text>}
                          <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  dragHandleArea: {
    width: "100%",
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  dragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: "#E2E8F0",
    borderRadius: 3,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 10,
  },
  title: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  searchWrap: {
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: "#0F172A",
    fontSize: 14,
  },
  listArea: {
    flex: 1,
    paddingTop: 10,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E2E8F0",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  rowLeft: { width: 28, alignItems: "center" },
  rowMid: { flex: 1, paddingLeft: 6 },
  rowRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  primaryText: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  secondaryText: { marginTop: 2, fontSize: 12, color: "#64748B" },
  distanceText: { fontSize: 12, color: "#64748B" },
  centerPad: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 6 },
  hintText: { fontSize: 12, color: "#64748B", textAlign: "center" },
});
