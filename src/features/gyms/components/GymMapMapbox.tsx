import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, useColorScheme } from "react-native";
import MapboxGL from "@rnmapbox/maps";
import type { MapState } from "@rnmapbox/maps";
import Constants from "expo-constants";
import type { GymPlace } from "../../../../lib/poi/types";

const MAPBOX_TOKEN = (Constants.expoConfig?.extra as any)?.MAPBOX_TOKEN as string;
MapboxGL.setAccessToken(MAPBOX_TOKEN);

// Built-in layers in outdoors-v12 / dark-v11 / satellite-streets-v12 that we hide
// to reduce clutter on the gym map (POI + secondary road labels/geometry).
const HIDDEN_SYMBOL_LAYERS = [
  "poi-label",
  "transit-label",
  "airport-label",
  "road-label",
  "road-label-simple",
  "road-label-navigation",
  "road-number-shield",
  "road-exit-shield",
] as const;

const HIDDEN_LINE_LAYERS = [
  "road-minor",
  "road-minor-case",
  "road-minor-low",
  "road-street",
  "road-street-case",
  "road-street-low",
  "road-path",
  "road-path-bg",
  "road-pedestrian",
  "road-pedestrian-case",
  "road-steps",
  "road-service-track",
  "road-service-track-case",
] as const;

const HIDDEN_STYLE = { visibility: "none" as const };

interface GymMapMapboxProps {
  mapRef: React.RefObject<MapboxGL.MapView | null>;
  camRef: React.RefObject<MapboxGL.Camera | null>;
  gyms: GymPlace[];
  styleURL: string;
  pitch: number;
  onMapIdle: (state: MapState) => void;
  onCameraChanged?: (state: MapState) => void;
  onSelectGym: (gym: GymPlace) => void;
}

export function GymMapMapbox({
  mapRef,
  camRef,
  gyms,
  styleURL,
  pitch,
  onMapIdle,
  onCameraChanged,
  onSelectGym,
}: GymMapMapboxProps) {
  const scheme = useColorScheme();
  // Track which styleURL has finished loading natively; used to gate
  // `existing` layer overrides so they don't race the initial style setup.
  const [loadedStyleURL, setLoadedStyleURL] = useState<string | null>(null);
  const styleReady = loadedStyleURL === styleURL;

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
        onCameraChanged={onCameraChanged}
        onDidFinishLoadingStyle={() => setLoadedStyleURL(styleURL)}
      >
        <MapboxGL.Camera ref={camRef} pitch={pitch} heading={0} />

        {/* UserLocation is also gated on styleReady for the same reason
            as the gym layers below: when the styleURL swaps, the
            component's internal `mapboxUserLocationHeadingIndicator`
            symbol layer tries to update against a style that has
            already been torn down, producing
            "Layer mapboxUserLocationHeadingIndicator is not in style". */}
        {styleReady && (
          <MapboxGL.UserLocation animated={false} visible showsUserHeadingIndicator />
        )}

        {/* Gym source + layers are gated on styleReady so that when the
            user toggles outdoors ↔ satellite (or the system flips
            dark/light and we swap to dark-v11), the layers fully unmount
            before the old style tears down. Without this gate,
            @rnmapbox/maps can fire an updateLayer call on a layer whose
            parent style no longer exists, producing
            "Layer gyms-labels is not in style". */}
        {styleReady && (
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
                // Let Mapbox try alternate anchors before giving up and hiding
                // the label due to collision.
                textVariableAnchor: ["top", "bottom", "left", "right"],
                textRadialOffset: 1.1,
                textJustify: "auto",
                // Collision detection:
                // - allowOverlap false → Mapbox hides labels that collide with
                //   other placed symbols (its built-in solution to the
                //   "two gym names stacked on top of each other" problem).
                // - ignorePlacement false → this layer's labels also reserve
                //   space so neighbouring labels avoid them.
                // - textPadding adds breathing room so labels don't touch.
                textAllowOverlap: false,
                textIgnorePlacement: false,
                textPadding: 4,
                // Break long gym names onto multiple lines instead of one wide
                // string — narrower labels collide less often.
                textMaxWidth: 8,
                symbolZOrder: "auto",
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Hide built-in clutter layers (POI + secondary roads).
            Gated on styleReady so overrides don't race initial style load. */}
        {styleReady &&
          HIDDEN_SYMBOL_LAYERS.map((id) => (
            <MapboxGL.SymbolLayer key={id} id={id} existing style={HIDDEN_STYLE} />
          ))}
        {styleReady &&
          HIDDEN_LINE_LAYERS.map((id) => (
            <MapboxGL.LineLayer key={id} id={id} existing style={HIDDEN_STYLE} />
          ))}
      </MapboxGL.MapView>
    </>
  );
}

const styles = StyleSheet.create({
  missingToken: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  missingTokenText: { color: "#ef4444", fontSize: 16, textAlign: "center" },
});
