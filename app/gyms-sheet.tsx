import { useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGymsStore } from "../src/store/useGymsStore";
import { useGymsColors } from "../src/features/gyms/useGymsColors";
import { useSettings } from "../src/contexts/SettingsContext";
import { searchGymsNearby } from "../lib/poi";
import { sortAndFilterGyms } from "../src/features/gyms/utils/sortAndFilter";
import { GymSearchBar } from "../src/features/gyms/components/GymSearchBar";
import { GymList } from "../src/features/gyms/components/GymList";
import type { GymPlace } from "../lib/poi/types";

export default function GymsSheetRoute() {
  const insets = useSafeAreaInsets();
  const { tr } = useSettings();
  const { colors, primary, primaryBg } = useGymsColors();

  const gyms = useGymsStore((s) => s.gyms);
  const loading = useGymsStore((s) => s.loading);
  const error = useGymsStore((s) => s.error);
  const selectedGym = useGymsStore((s) => s.selectedGym);
  const query = useGymsStore((s) => s.query);
  const center = useGymsStore((s) => s.center);

  const fetchNearby = useCallback(async (q: string) => {
    const s = useGymsStore.getState();
    const c = s.center;
    if (!c) return;
    s.setLoading(true);
    s.setError(null);
    try {
      const raw = await searchGymsNearby(c, 30, q);
      const filtered = sortAndFilterGyms(raw, c);
      s.setGyms(filtered);
    } catch (e: any) {
      s.setError(e?.message ?? "获取附近岩馆失败");
    } finally {
      s.setLoading(false);
    }
  }, []);

  const onSubmitSearch = useCallback(() => {
    fetchNearby(useGymsStore.getState().query.trim());
  }, [fetchNearby]);

  const onSelectGym = useCallback((gym: GymPlace) => {
    useGymsStore.getState().setSelectedGym(gym);
  }, []);

  const searchPlaceholder = tr("搜索附近的岩馆…", "Search nearby climbing gyms…");
  const emptyText = center
    ? tr("附近没有匹配结果", "No gyms found nearby.")
    : tr("等待定位或输入搜索关键字。", "Waiting for your location or a keyword…");

  return (
    <View style={styles.root}>
      <GymSearchBar
        query={query}
        onChangeText={useGymsStore.getState().setQuery}
        onSubmitSearch={onSubmitSearch}
        placeholder={searchPlaceholder}
      />

      <GymList
        gyms={gyms}
        selectedGym={selectedGym}
        onSelectGym={onSelectGym}
        onCloseDetail={() => useGymsStore.getState().setSelectedGym(null)}
        loading={loading}
        error={error}
        insets={insets}
        colors={colors}
        primary={primary}
        primaryBg={primaryBg}
        emptyText={emptyText}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
