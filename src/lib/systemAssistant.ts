// Mirror of climbing_plan_backend/lib/system_assistant.py.
// Keep in sync with docs/contracts/system_assistant.md when changing.
export const SYSTEM_ASSISTANT_USER_ID = "11111111-1111-1111-1111-111111111111";
export const SYSTEM_WELCOME_SENTINEL = "__SYSTEM_WELCOME__";
export const SYSTEM_AUTOREPLY_SENTINEL = "__SYSTEM_AUTOREPLY__";

export const isSystemAssistant = (
  userId: string | null | undefined,
): boolean => userId === SYSTEM_ASSISTANT_USER_ID;

type Tr = (zh: string, en: string) => string;

/**
 * Map a sentinel-or-real-content string to user-facing copy. Use both for
 * inbox preview and bubble body so future sentinels stay in one place.
 *
 * Pass `multiline=true` for the bubble (full welcome onboarding); leave it
 * off for the preview (single-line teaser).
 */
export function resolveSystemContent(
  content: string | null | undefined,
  tr: Tr,
  opts: { multiline?: boolean } = {},
): string | null {
  if (content == null) return null;
  if (content === SYSTEM_WELCOME_SENTINEL) {
    return opts.multiline
      ? tr(
          "欢迎使用 ClimMate！🧗\n\n开始你的第一次记录吧：\n• Map 找附近岩馆 / 户外路线\n• 记录每次 send + 视频\n• 关注其他攀岩者一起进步",
          "Welcome to ClimMate! 🧗\n\nGet started:\n• Map: find gyms + outdoor routes nearby\n• Log every send with video\n• Follow other climbers to learn",
        )
      : tr(
          "欢迎使用 ClimMate！点开了解…",
          "Welcome to ClimMate! Tap to learn more…",
        );
  }
  if (content === SYSTEM_AUTOREPLY_SENTINEL) {
    return tr(
      "感谢你的消息！我们会尽快人工回复 🙏",
      "Thanks for your message! We'll get back to you soon 🙏",
    );
  }
  return content;
}
