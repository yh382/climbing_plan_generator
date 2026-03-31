// src/lib/widgetBridge.ts
import type { SessionEntry } from "../store/useLogsStore";
import type { Widget } from "expo-widgets";

// Widget requires a production build — the Metro bundler compiles widget JSX to
// a serialized string at build time. In dev mode (__DEV__), the raw function is
// passed to the native constructor which expects a string, causing a crash.
// Since widgets need the WidgetKit extension (only available after prebuild +
// production build), we skip widget operations entirely in dev mode.
let _widget: Widget<WidgetData> | null | undefined;
function getWidget(): Widget<WidgetData> | null {
  if (__DEV__) return null;
  if (_widget === null) return null; // already failed
  if (_widget) return _widget;
  try {
    _widget = require("../../widgets/ClimMateWidget").default;
    return _widget!;
  } catch {
    _widget = null;
    return null;
  }
}

export type WidgetData = {
  weekClimbDays: number;
  weekSends: number;
  streak: number;
  lastSessionGym: string;
  lastSessionDate: string;
  lastSessionBest: string;
  lastSessionDuration: string;
  hasActiveSession: boolean;
};

/** 获取本周一 00:00 */
function getWeekStart(now: Date): Date {
  const d = new Date(now);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 计算连续攀登天数 */
function computeStreak(sessions: SessionEntry[]): number {
  if (sessions.length === 0) return 0;

  const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let expected = new Date(today);

  for (const dateStr of dates) {
    const d = new Date(dateStr + "T00:00:00");
    const diffDays = Math.round(
      (expected.getTime() - d.getTime()) / 86400000
    );

    if (diffDays === 0) {
      streak++;
      expected.setDate(expected.getDate() - 1);
    } else if (diffDays === 1 && streak === 0) {
      // 今天还没爬，从昨天开始算
      streak++;
      expected = new Date(d);
      expected.setDate(expected.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

/** 从 Zustand sessions 计算 widget 数据 */
export function computeWidgetData(
  sessions: SessionEntry[],
  activeSession: { startTime: number; gymName: string } | null
): WidgetData {
  const now = new Date();
  const weekStart = getWeekStart(now);

  const weekSessions = sessions.filter(
    (s) => new Date(s.date) >= weekStart
  );

  const weekClimbDays = new Set(weekSessions.map((s) => s.date)).size;
  const weekSends = weekSessions.reduce((sum, s) => sum + s.sends, 0);
  const streak = computeStreak(sessions);

  const last = sessions[0];

  return {
    weekClimbDays,
    weekSends,
    streak,
    lastSessionGym: last?.gymName ?? "",
    lastSessionDate: last?.date ?? "",
    lastSessionBest: last?.best ?? "",
    lastSessionDuration: last?.duration ?? "",
    hasActiveSession: activeSession !== null,
  };
}

/** 写入 widget 数据并刷新 timeline */
export function syncWidgetData(data: WidgetData) {
  try {
    const widget = getWidget();
    if (!widget) return;
    widget.updateSnapshot(data);
  } catch (e) {
    if (__DEV__) console.warn("[widgetBridge] sync failed:", e);
  }
}

/** 便捷方法: 直接从 Zustand state 同步 widget */
export function syncWidgetFromStore() {
  try {
    const { default: useLogsStore } = require("../store/useLogsStore");
    const { sessions, activeSession } = useLogsStore.getState();
    const data = computeWidgetData(sessions, activeSession);
    syncWidgetData(data);
  } catch (e) {
    if (__DEV__) console.warn("[widgetBridge] syncFromStore failed:", e);
  }
}
