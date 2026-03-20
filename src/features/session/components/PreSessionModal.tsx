// src/features/session/components/PreSessionModal.tsx
import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
  Easing,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { api } from "src/lib/apiClient";

interface Props {
  visible: boolean;
  onClose: () => void;
  onStart: (gymName: string, discipline: "boulder" | "rope") => void;
}

type GymItem = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  distance_m?: number | null;
};

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

function formatDistance(distance_m?: number | null) {
  if (!distance_m || distance_m <= 0) return "";
  if (distance_m < 1000) return `${Math.round(distance_m)} m`;
  return `${(distance_m / 1000).toFixed(1)} km`;
}

function formatSecondary(it: GymItem) {
  const parts = [it.address, it.city, it.state].filter(Boolean);
  return parts.join(" · ");
}

async function getDeviceCoords(): Promise<{ lat: number; lng: number } | null> {
  try {
    const Location = require("expo-location") as typeof import("expo-location");
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}

export default function PreSessionModal({ visible, onClose, onStart }: Props) {
  const insets = useSafeAreaInsets();
  const [selectedGym, setSelectedGym] = useState<string | null>(null);
  const [discipline, setDiscipline] = useState<"boulder" | "rope" | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [items, setItems] = useState<GymItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // 动画值：0 = 关闭, 1 = 打开
  const animValue = useRef(new Animated.Value(0)).current;
  const [showModal, setShowModal] = useState(visible);

  // --- Data fetching ---

  const fetchNearby = async (c: { lat: number; lng: number } | null) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      if (!c) {
        setItems([]);
        setErrorMsg("Location permission not granted. You can still search.");
        return;
      }
      const res = await api.get<{ items: GymItem[] }>(
        `/gyms/nearby?lat=${encodeURIComponent(c.lat)}&lng=${encodeURIComponent(c.lng)}&limit=10`
      );
      setItems(res.items ?? []);
      // Auto-select first result
      if (res.items?.length) setSelectedGym(res.items[0].name);
    } catch (e: any) {
      setItems([]);
      setErrorMsg(e?.message ?? "Failed to load nearby gyms");
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
      const qs = new URLSearchParams({ q: trimmed, limit: "10" });
      if (c?.lat != null && c?.lng != null) {
        qs.set("lat", String(c.lat));
        qs.set("lng", String(c.lng));
      }
      const res = await api.get<{ items: GymItem[] }>(`/gyms/search?${qs.toString()}`);
      setItems(res.items ?? []);
      if (res.items?.length) setSelectedGym(res.items[0].name);
      else setSelectedGym(null);
    } catch (e: any) {
      setItems([]);
      setErrorMsg(e?.message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  // Auto-locate on open
  useEffect(() => {
    let mounted = true;
    if (!visible) return;

    setQuery("");
    setItems([]);
    setErrorMsg(null);
    setSelectedGym(null);
    setDiscipline(null);

    (async () => {
      setIsLocating(true);
      const c = await getDeviceCoords();
      if (!mounted) return;
      setCoords(c);
      setIsLocating(false);
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
    if (!query.trim()) return; // empty handled by fetchNearby on clear
    const t = setTimeout(() => {
      fetchSearch(query, coords);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // When query is cleared, go back to nearby
  const handleClearSearch = () => {
    setQuery("");
    fetchNearby(coords);
  };

  // 监听 visible 变化来驱动进场/退场动画
  useEffect(() => {
    if (visible) {
      setShowModal(true);
      Animated.timing(animValue, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }).start();
    } else {
      if (!showModal) return;
      Animated.timing(animValue, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => setShowModal(false));
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(animValue, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      onClose();
    });
  };

  const handleStart = () => {
    if (selectedGym && discipline) {
      onStart(selectedGym, discipline);
    }
  };

  const handleLocate = async () => {
    setIsLocating(true);
    setQuery("");
    const c = await getDeviceCoords();
    setCoords(c);
    setIsLocating(false);
    await fetchNearby(c);
  };

  const handleOpenMap = () => {
    // Placeholder for future map selection
  };

  // 动画插值
  const backdropOpacity = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const sheetTranslateY = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_HEIGHT, 0],
  });

  if (!showModal) return null;

  return (
    <Modal
      transparent
      visible={showModal}
      animationType="none"
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: backdropOpacity }]}>
        <Pressable style={styles.overlayPressable} onPress={handleClose} />
      </Animated.View>

      <Animated.View
        style={[
          styles.sheetContainer,
          { transform: [{ translateY: sheetTranslateY }] },
        ]}
      >
        <View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Start Session</Text>
              <Text style={styles.subTitle}>Where are you climbing today?</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.locateBtn]}
              onPress={handleLocate}
              disabled={isLocating}
            >
              {isLocating ? (
                <ActivityIndicator size="small" color="#374151" />
              ) : (
                <Ionicons name="navigate" size={20} color="#374151" />
              )}
              <Text style={styles.locateText}>
                {isLocating ? "Locating..." : "Current Location"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleOpenMap}>
              <Ionicons name="map-outline" size={20} color="#374151" />
              <Text style={styles.mapText}>Map</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* Search */}
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search gyms..."
              placeholderTextColor="#9CA3AF"
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {!!query && (
              <TouchableOpacity onPress={handleClearSearch} hitSlop={10}>
                <Ionicons name="close-circle" size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* List */}
          <Text style={styles.sectionLabel}>
            {query.trim() ? "SEARCH RESULTS" : "NEARBY GYMS"}
          </Text>
          <ScrollView
            style={{ maxHeight: 220 }}
            contentContainerStyle={{ gap: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {loading ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="small" color="#306E6F" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            ) : items.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Ionicons name="location-outline" size={28} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  {errorMsg || "No gyms found"}
                </Text>
                {!errorMsg && (
                  <Text style={styles.emptySubtext}>
                    Try searching by name
                  </Text>
                )}
              </View>
            ) : (
              items.map((gym, idx) => {
                const isSelected = selectedGym === gym.name;
                const secondary = formatSecondary(gym);
                const distance = formatDistance(gym.distance_m);
                return (
                  <TouchableOpacity
                    key={gym.id ?? `gym-${idx}`}
                    style={[styles.gymItem, isSelected && styles.gymItemActive]}
                    onPress={() => setSelectedGym(gym.name)}
                  >
                    <View style={styles.gymIconWrap}>
                      <Ionicons
                        name="business"
                        size={20}
                        color={isSelected ? "#FFF" : "#9CA3AF"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.gymName,
                          isSelected && styles.gymNameActive,
                        ]}
                        numberOfLines={1}
                      >
                        {gym.name}
                      </Text>
                      <Text style={styles.gymAddr} numberOfLines={1}>
                        {[secondary, distance].filter(Boolean).join(" · ")}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#10B981"
                      />
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Discipline */}
          <Text style={[styles.sectionLabel, { marginTop: 16 }]}>DISCIPLINE</Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={[styles.gymItem, { flex: 1 }, discipline === "boulder" && styles.gymItemActive]}
              onPress={() => setDiscipline("boulder")}
            >
              <Text style={[styles.gymName, discipline === "boulder" && styles.gymNameActive]}>
                Bouldering
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gymItem, { flex: 1 }, discipline === "rope" && styles.gymItemActive]}
              onPress={() => setDiscipline("rope")}
            >
              <Text style={[styles.gymName, discipline === "rope" && styles.gymNameActive]}>
                Rope
              </Text>
            </TouchableOpacity>
          </View>

          {/* Button */}
          <TouchableOpacity
            style={[styles.startBtn, (!selectedGym || !discipline) && styles.startBtnDisabled]}
            onPress={handleStart}
            disabled={!selectedGym || !discipline}
          >
            <Text style={styles.startBtnText}>START CLIMBING</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1,
  },
  overlayPressable: { flex: 1 },

  sheetContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    justifyContent: "flex-end",
  },

  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },

  handleContainer: { alignItems: "center", marginBottom: 16 },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#111" },
  subTitle: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  closeBtn: { padding: 4, backgroundColor: "#F3F4F6", borderRadius: 20 },

  actionRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
    backgroundColor: "#F9FAFB",
  },
  locateBtn: {},
  locateText: { fontWeight: "600", color: "#374151", fontSize: 13 },
  mapText: { fontWeight: "600", color: "#374151", fontSize: 13 },

  divider: { height: 1, backgroundColor: "#F3F4F6", marginBottom: 16 },

  searchWrap: {
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: "#111",
    fontSize: 14,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    marginBottom: 12,
    letterSpacing: 0.5,
  },

  loadingWrap: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
  },
  loadingText: { fontSize: 13, color: "#9CA3AF" },

  emptyWrap: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },

  gymItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "transparent",
    gap: 12,
  },
  gymItemActive: { backgroundColor: "#111827", borderColor: "#111827" },
  gymIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  gymName: { fontSize: 16, fontWeight: "600", color: "#111" },
  gymNameActive: { color: "#FFF" },
  gymAddr: { fontSize: 12, color: "#6B7280" },

  startBtn: {
    marginTop: 24,
    height: 56,
    backgroundColor: "#10B981",
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#10B981",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  startBtnDisabled: { backgroundColor: "#D1D5DB", shadowOpacity: 0 },
  startBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
