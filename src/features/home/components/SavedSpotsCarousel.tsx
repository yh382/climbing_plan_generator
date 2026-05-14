import { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Image } from "react-native";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import { outdoorApi } from "@/features/outdoor/api";
import type { Area } from "@/features/outdoor/types";
import { mapHref } from "@/features/mapscreen/navigation";
import useMapSavedSpotHighlightStore from "@/store/useMapSavedSpotHighlightStore";

const MAX_SPOTS = 8;

export function SavedSpotsCarousel() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const { tr } = useSettings();
  const [areas, setAreas] = useState<Area[]>([]);

  useEffect(() => {
    let cancelled = false;
    outdoorApi
      .listAreas()
      .then((data) => {
        if (cancelled || !data) return;
        // Until a "recent visited" backend lands, prefer favorited areas
        // first, then alphabetic. Caps at MAX_SPOTS.
        const sorted = [...data]
          .sort((a, b) => {
            const favDelta = (b.is_favorited ? 1 : 0) - (a.is_favorited ? 1 : 0);
            if (favDelta !== 0) return favDelta;
            return a.name.localeCompare(b.name);
          })
          .slice(0, MAX_SPOTS);
        setAreas(sorted);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (areas.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>{tr("收藏地点", "Saved Spots")}</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {areas.map((area) => {
          const cover = area.cover_url ?? null;
          return (
            <Pressable
              key={area.id}
              style={styles.card}
              onPress={() => {
                // Home Saved Spot tap = "go to map, with this spot
                // highlighted at the top of the gyms-sheet row". The
                // user then taps the highlighted spot inside the sheet
                // to actually drill into area mode. Single entry path
                // (always lands in gyms mode) sidesteps NativeTabs
                // param-propagation issues and the cross-spot state
                // sync bug.
                useMapSavedSpotHighlightStore.getState().setHighlight(area.id);
                router.navigate(mapHref());
              }}
            >
              <View style={styles.cover}>
                {cover ? (
                  <Image source={{ uri: cover }} style={styles.coverImage} />
                ) : (
                  <View style={[styles.coverImage, styles.coverFallback]} />
                )}
                {/* Weather pill placeholder — hidden until weather hook lands. */}
              </View>
              <Text style={styles.name} numberOfLines={1}>{area.name}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const createStyles = (c: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    section: {
      marginBottom: theme.spacing.sectionGap,
    },
    headerRow: {
      paddingHorizontal: 16,
      marginBottom: 12,
    },
    title: {
      fontFamily: theme.fonts.bold,
      fontSize: 16,
      color: c.textPrimary,
      letterSpacing: -0.3,
    },
    scroll: {
      paddingHorizontal: 16,
      gap: 12,
    },
    card: {
      width: 120,
    },
    cover: {
      width: 120,
      height: 80,
      borderRadius: 10,
      overflow: "hidden",
      marginBottom: 6,
    },
    coverImage: {
      width: "100%",
      height: "100%",
    },
    coverFallback: {
      backgroundColor: c.backgroundSecondary,
    },
    name: {
      fontFamily: theme.fonts.medium,
      fontSize: 13,
      color: c.textPrimary,
    },
  });
