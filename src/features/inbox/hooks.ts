import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import { inboxApi } from "./api";
import { chatApi } from "../chat/api";

/**
 * Total unread across the inbox surfaces: chat conversations + activity
 * notifications. Refetches whenever the calling screen regains focus, so a
 * visit to the inbox (which marks things read) updates the badge on return.
 */
export function useInboxUnreadCount(): number {
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      Promise.allSettled([chatApi.getUnreadCount(), inboxApi.getUnreadCount()]).then(
        ([chat, activity]) => {
          if (!alive) return;
          // Both failed (offline blip): keep the last known count instead of
          // clearing an existing dot with a false 0.
          if (chat.status === "rejected" && activity.status === "rejected") return;
          const chatN = chat.status === "fulfilled" ? chat.value.unread_count : 0;
          const actN = activity.status === "fulfilled" ? activity.value.count : 0;
          setCount(chatN + actN);
        },
      );
      return () => {
        alive = false;
      };
    }, []),
  );

  return count;
}
