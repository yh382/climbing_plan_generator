import * as Notifications from "expo-notifications";
import { router } from "expo-router";

/**
 * Route a push-tap payload to the right in-app screen.
 *
 * Backend shape: `data` is `{ kind, ...meta }` where `kind` is the notification
 * kind string (e.g. `"chat_message"`, `"post_liked"`) and `meta` fields depend
 * on kind (see services/notifications.py `notify_user` + call sites).
 *
 * Falls back to `/inbox?section=activity` when kind/target is missing or unknown.
 */
function routeForPushData(data: Record<string, any> | undefined | null): string {
  if (!data || typeof data !== "object") return "/inbox?section=activity";

  const kind = data.kind;
  switch (kind) {
    case "chat_message": {
      const cid = data.conversation_id;
      return cid ? `/chat/${cid}` : "/inbox?section=conversations";
    }
    case "post_liked": {
      const pid = data.post_id;
      return pid ? `/community/post/${pid}` : "/inbox?section=activity";
    }
    case "post_commented":
    case "comment_replied":
    case "mention": {
      const pid = data.post_id;
      const cid = data.comment_id;
      if (pid && cid) return `/community/post/${pid}?commentId=${cid}`;
      if (pid) return `/community/post/${pid}`;
      return "/inbox?section=activity";
    }
    case "new_follower": {
      const actor = data.actor_id;
      return actor ? `/community/u/${actor}` : "/inbox?section=activity";
    }
    case "badge_awarded":
      return "/(drawer)/(tabs)/profile?tab=badges";
    case "challenge_started":
    case "challenge_ended": {
      const ch = data.challenge_id;
      return ch ? `/community/challenges/${ch}` : "/inbox?section=activity";
    }
    case "event_reminder":
    case "event_started": {
      const ev = data.event_id;
      return ev ? `/community/events/${ev}` : "/inbox?section=activity";
    }
    case "org_invite":
      return "/org-invites";
    default:
      return "/inbox?section=activity";
  }
}

/**
 * Handle a notification tap response (user pressed the push banner).
 * Uses the module-level `router` from expo-router so this can be called
 * from anywhere (hook cleanup, cold-start recovery, etc.).
 */
export function handlePushTap(response: Notifications.NotificationResponse): void {
  const data = response.notification.request.content.data as
    | Record<string, any>
    | undefined;
  const href = routeForPushData(data);
  // Use `as any` because Expo Router's typed routes don't know dynamic paths
  router.push(href as any);
}

let _handledColdStart = false;

/**
 * If the app was launched from a push tap (cold start), route to the target
 * screen once mounted. Safe to call multiple times — only runs once.
 */
export async function handleColdStartPushTap(): Promise<void> {
  if (_handledColdStart) return;
  _handledColdStart = true;
  try {
    const response = await Notifications.getLastNotificationResponseAsync();
    if (response) handlePushTap(response);
  } catch {
    // silently ignore
  }
}
