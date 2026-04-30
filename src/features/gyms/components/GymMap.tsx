import React from "react";
import MapboxGL from "@rnmapbox/maps";
import type { MapState } from "@rnmapbox/maps";
import type { GymPlace } from "../../../../lib/poi/types";
import { GymMapAmap } from "./GymMapAmap";

// GymsScreen is CN-only — overseas (Mapbox) users are redirected from
// app/gyms.tsx to the unified /map screen (MapScreenMapbox), which is now
// the canonical gym+crag map. This component only ever renders the Amap
// stub in CN. The previous GymMapMapbox fallback was removed once /map
// stabilized on TestFlight.

/** Lightweight crag pin data for the map layer */
export interface CragPin {
  id: string;
  name: string;
  lat: number;
  lng: number;
  route_count?: number;
  region?: string;
}

export interface GymMapProps {
  mapRef: React.RefObject<MapboxGL.MapView | null>;
  camRef: React.RefObject<MapboxGL.Camera | null>;
  gyms: GymPlace[];
  crags?: CragPin[];
  styleURL: string;
  pitch: number;
  onMapIdle: (state: MapState) => void;
  onCameraChanged?: (state: MapState) => void;
  onSelectGym: (gym: GymPlace) => void;
  onSelectCrag?: (crag: CragPin) => void;
}

export function GymMap(props: GymMapProps) {
  return <GymMapAmap gyms={props.gyms} onSelectGym={props.onSelectGym} />;
}
