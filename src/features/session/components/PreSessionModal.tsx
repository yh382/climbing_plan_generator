// src/features/session/components/PreSessionModal.tsx
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { api } from "src/lib/apiClient";
import { theme } from "src/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";

type Discipline = "boulder" | "toprope" | "lead";

interface Props {
  visible: boolean;
  onClose: () => void;
  onStart: (gymName: string, discipline: Discipline) => void;
}

type GymItem = {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  distance_m?: number | null;
};

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
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [selectedGym, setSelectedGym] = useState<string | null>(null);
  const [discipline, setDiscipline] = useState<Discipline | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [items, setItems] = useState<GymItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const sheetRef = useRef<TrueSheet>(null);
  const isPresented = useRef(false);

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
        `/gyms/nearby?lat=${encodeURIComponent(c.lat)}&lng=${encodeURIComponent(c.lng)}&limit=3`
      );
      setItems(res.items ?? []);
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

  // Present/dismiss based on visible prop
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
    onClose();
  }, [onClose]);

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
    if (!query.trim()) return;
    const t = setTimeout(() => {
      fetchSearch(query, coords);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const handleClearSearch = () => {
    setQuery("");
    fetchNearby(coords);
  };

  const handleStart = () => {
    if (selectedGym && discipline) {
      onStart(selectedGym, discipline);
    }
  };


  return (
    <TrueSheet
      ref={sheetRef}
      detents={[0.5, 0.9]}
      backgroundColor={colors.sheetBackground}
      grabberOptions={{ height: 3, width: 36, topMargin: 6 }}
      dimmed
      dimmedDetentIndex={0}
      onDidDismiss={handleDismiss}
    >
      <Text style={styles.subTitle}>Where are you climbing today?</Text>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 0, paddingBottom: insets.bottom + 12 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={16} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search gyms..."
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {!!query && (
            <TouchableOpacity onPress={handleClearSearch} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Gym List */}
        <Text style={styles.sectionLabel}>
          {query.trim() ? "SEARCH RESULTS" : "NEARBY GYMS"}
        </Text>
        <View style={{ gap: 6 }}>
          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          ) : items.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="location-outline" size={28} color={colors.cardBorder} />
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
            items.slice(0, 3).map((gym, idx) => {
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
                      size={16}
                      color={isSelected ? '#FFFFFF' : colors.textTertiary}
                    />
                  </View>
                  <View style={{ flex: 1, justifyContent: "center" }}>
                    <Text
                      style={[
                        styles.gymName,
                        isSelected && styles.gymNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {gym.name}
                    </Text>
                    {!!(secondary || distance) && (
                      <Text style={styles.gymAddr} numberOfLines={1}>
                        {[secondary, distance].filter(Boolean).join(" · ")}
                      </Text>
                    )}
                  </View>
                  {isSelected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={24}
                      color={colors.accent}
                    />
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>

        {/* Discipline */}
        <Text style={[styles.sectionLabel, { marginTop: 10 }]}>DISCIPLINE</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {(["boulder", "toprope", "lead"] as Discipline[]).map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.disciplineBtn, discipline === d && styles.disciplineBtnActive]}
              onPress={() => setDiscipline(d)}
            >
              <Text style={[styles.disciplineBtnText, discipline === d && styles.disciplineBtnTextActive]}>
                {d === "toprope" ? "Top Rope" : d.charAt(0).toUpperCase() + d.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Button */}
        <TouchableOpacity
          style={[styles.startBtn, (!selectedGym || !discipline) && styles.startBtnDisabled]}
          onPress={handleStart}
          disabled={!selectedGym || !discipline}
        >
          <Text style={styles.startBtnText}>START CLIMBING</Text>
          <Ionicons name="arrow-forward" size={20} color={colors.pillText} />
        </TouchableOpacity>
      </ScrollView>
    </TrueSheet>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) => StyleSheet.create({
  subTitle: {
    fontSize: 14,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
    textAlign: "center",
  },
  searchWrap: {
    height: 40,
    borderRadius: theme.borderRadius.pill,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.sheetCardBackground,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontFamily: theme.fonts.regular,
    color: colors.textPrimary,
    fontSize: 14,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    fontFamily: theme.fonts.bold,
    color: colors.textTertiary,
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  loadingWrap: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
  },

  emptyWrap: {
    paddingVertical: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: colors.textSecondary,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 12,
    fontFamily: theme.fonts.regular,
    color: colors.textTertiary,
    textAlign: "center",
  },

  gymItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: theme.borderRadius.card,
    backgroundColor: colors.sheetCardBackground,
    borderWidth: 1.5,
    borderColor: "transparent",
    gap: 8,
  },
  gymItemActive: {
    backgroundColor: colors.cardDark,
    borderColor: colors.accent,
  },
  gymIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
    justifyContent: "center",
  },
  gymName: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "600",
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
  },
  gymNameActive: { color: '#FFFFFF' },
  gymAddr: {
    fontSize: 11,
    lineHeight: 14,
    fontFamily: theme.fonts.regular,
    color: colors.textSecondary,
  },

  disciplineBtn: {
    flex: 1,
    height: 44,
    backgroundColor: colors.sheetCardBackground,
    borderRadius: 22,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  disciplineBtnActive: {
    backgroundColor: colors.cardDark,
    borderColor: colors.accent,
  },
  disciplineBtnText: {
    fontSize: 14,
    fontWeight: "600" as const,
    fontFamily: theme.fonts.medium,
    color: colors.textPrimary,
  },
  disciplineBtnTextActive: {
    color: '#FFFFFF',
  },

  startBtn: {
    marginTop: 12,
    height: 52,
    backgroundColor: colors.cardDark,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  startBtnDisabled: { backgroundColor: colors.cardBorder },
  startBtnText: {
    color: colors.pillText,
    fontSize: 16,
    fontWeight: "800",
    fontFamily: theme.fonts.bold,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
});
