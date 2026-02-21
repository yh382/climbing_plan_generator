// src/features/community/events/data/useEventDetailData.ts
import { useMemo, useState } from "react";
import { EVENT_DETAIL_MOCK } from "./mockEventDetail";
import type { EventDetailModel } from "./types";

export function useEventDetailData(): {
  event: EventDetailModel;
  joined: boolean;
  onToggleJoin: () => void;
} {
  // 这里先用 mock；后续你接后端时，只需要替换 event 来源
  const event = useMemo(() => EVENT_DETAIL_MOCK, []);
  const [joined, setJoined] = useState(false);

  return {
    event,
    joined,
    onToggleJoin: () => setJoined((v) => !v),
  };
}
