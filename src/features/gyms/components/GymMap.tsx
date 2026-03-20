import React from "react";
import MapboxGL from "@rnmapbox/maps";
import type { MapState } from "@rnmapbox/maps";
import type { GymPlace } from "../../../../lib/poi/types";
import { isCN } from "../../../lib/region";
import { GymMapMapbox } from "./GymMapMapbox";
import { GymMapAmap } from "./GymMapAmap";

export interface GymMapProps {
  mapRef: React.RefObject<MapboxGL.MapView | null>;
  camRef: React.RefObject<MapboxGL.Camera | null>;
  gyms: GymPlace[];
  styleURL: string;
  pitch: number;
  onMapIdle: (state: MapState) => void;
  onSelectGym: (gym: GymPlace) => void;
}

export function GymMap(props: GymMapProps) {
  if (isCN) {
    return <GymMapAmap gyms={props.gyms} onSelectGym={props.onSelectGym} />;
  }

  return (
    <GymMapMapbox
      mapRef={props.mapRef}
      camRef={props.camRef}
      gyms={props.gyms}
      styleURL={props.styleURL}
      pitch={props.pitch}
      onMapIdle={props.onMapIdle}
      onSelectGym={props.onSelectGym}
    />
  );
}
