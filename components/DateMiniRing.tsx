// app/components/DateMiniRing.tsx
import React from "react";
import { MiniRing } from "./MiniRing";
import { useSegmentsByDate } from "@/store/useLogsStore";
import type { LogType } from "@/store/useLogsStore";

type Props = {
  dateKey: string;        // 'YYYY-MM-DD'
  type?: LogType;         // 不传=合并 boulder+yds
  size?: number;
  thickness?: number;
  selected?: boolean;
  onPress?: () => void;
};

export const DateMiniRing: React.FC<Props> = ({
  dateKey,
  type,
  size = 24,
  thickness = 3,
  selected,
  onPress,
}) => {
  const segments = useSegmentsByDate(dateKey, type);
  return (
    <MiniRing
      segments={segments}
      size={size}
      thickness={thickness}
      selected={selected}
      onPress={onPress}
    />
  );
};

