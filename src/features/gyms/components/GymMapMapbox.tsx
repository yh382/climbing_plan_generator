import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import type { MapState } from "@rnmapbox/maps";
import Constants from "expo-constants";
import type { GymPlace } from "../../../../lib/poi/types";

const MAPBOX_TOKEN = (Constants.expoConfig?.extra as any)?.MAPBOX_TOKEN as string;
MapboxGL.setAccessToken(MAPBOX_TOKEN);

interface GymMapMapboxProps {
  mapRef: React.RefObject<MapboxGL.MapView | null>;
  camRef: React.RefObject<MapboxGL.Camera | null>;
  gyms: GymPlace[];
  styleURL: string;
  pitch: number;
  onMapIdle: (state: MapState) => void;
  onSelectGym: (gym: GymPlace) => void;
}

export function GymMapMapbox({
  mapRef,
  camRef,
  gyms,
  styleURL,
  pitch,
  onMapIdle,
  onSelectGym,
}: GymMapMapboxProps) {
  const scheme = useColorScheme();

  const gymsGeoJSON = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: gyms.map((g) => ({
        type: "Feature" as const,
        id: g.place_id,
        properties: { name: g.name, place_id: g.place_id },
        geometry: {
          type: "Point" as const,
          coordinates: [g.location.lng, g.location.lat],
        },
      })),
    }),
    [gyms],
  );

  const handlePress = useCallback(
    (e: { features: GeoJSON.Feature[] }) => {
      const placeId = e.features?.[0]?.properties?.place_id;
      if (!placeId) return;
      const gym = gyms.find((g) => g.place_id === placeId);
      if (gym) onSelectGym(gym);
    },
    [gyms, onSelectGym],
  );

  if (!MAPBOX_TOKEN) {
    return (
      <View style={styles.missingToken}>
        <Text style={styles.missingTokenText}>
          缺少 MAPBOX_TOKEN（请在 app.json 的 extra 中配置）。
        </Text>
      </View>
    );
  }

  return (
    <>
      <MapboxGL.MapView
        ref={mapRef}
        styleURL={styleURL}
        style={StyleSheet.absoluteFillObject}
        logoEnabled={false}
        scaleBarEnabled={false}
        compassEnabled={false}
        onMapIdle={onMapIdle}
      >
        <MapboxGL.Camera ref={camRef} pitch={pitch} heading={0} />
        <MapboxGL.UserLocation animated={false} visible showsUserHeadingIndicator />

        <MapboxGL.ShapeSource
          id="gyms-src"
          shape={gymsGeoJSON}
          onPress={handlePress}
        >
          <MapboxGL.CircleLayer
            id="gyms-pins"
            style={{
              circleRadius: 7,
              circleColor: "#306E6F",
              circleStrokeWidth: 2.5,
              circleStrokeColor: "#fff",
            }}
          />
          <MapboxGL.SymbolLayer
            id="gyms-labels"
            style={{
              textField: ["get", "name"],
              textSize: 12,
              textColor: scheme === "dark" ? "#E2E8F0" : "#0F172A",
              textHaloColor: scheme === "dark" ? "rgba(11,18,32,0.85)" : "rgba(255,255,255,0.85)",
              textHaloWidth: 1.2,
              textVariableAnchor: ["top", "bottom", "left", "right"],
              textOffset: [0, 1.2],
              textAllowOverlap: true,
              symbolZOrder: "auto",
            }}
          />
        </MapboxGL.ShapeSource>
      </MapboxGL.MapView>
    </>
  );
}

const styles = StyleSheet.create({
  missingToken: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  missingTokenText: { color: "#ef4444", fontSize: 16, textAlign: "center" },
});
