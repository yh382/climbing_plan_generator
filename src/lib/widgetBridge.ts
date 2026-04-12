// src/lib/widgetBridge.ts
import type { SessionEntry } from "../store/useLogsStore";
import type { Widget } from "expo-widgets";

// The widget stub (ClimMateWidget.tsx) returns null — all UI is pure SwiftUI.
// We only need the expo-widgets WidgetObject to write data to shared UserDefaults
// via updateSnapshot(). The try-catch handles any dev-mode serialization issues.
let _widget: Widget<WidgetData> | null | undefined;
function getWidget(): Widget<WidgetData> | null {
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
  monthSessions: number;
  monthSends: number;
  streak: number;
  lastSessionGym: string;
  lastSessionDate: string;
  lastSessionBest: string;
  hasActiveSession: boolean;
};

/** 获取本月 1 号 00:00 */
function getMonthStart(now: Date): Date {
  const d = new Date(now);
  d.setDate(1);
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
  const monthStart = getMonthStart(now);

  const filteredSessions = sessions.filter(
    (s) => new Date(s.date) >= monthStart
  );

  const monthSessions = filteredSessions.length;
  const monthSends = filteredSessions.reduce((sum, s) => sum + s.sends, 0);
  const streak = computeStreak(sessions);

  const last = sessions[0];

  return {
    monthSessions,
    monthSends,
    streak,
    lastSessionGym: last?.gymName ?? "",
    lastSessionDate: last?.date ?? "",
    lastSessionBest: last?.best ?? "",
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
