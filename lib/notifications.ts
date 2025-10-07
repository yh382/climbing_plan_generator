// app/lib/notifications.ts
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { useI18N } from "../lib/i18n";
/** 统一的提醒 ID 类型（expo 返回的是 string） */
export type ReminderId = string;

/**
 * 申请通知权限，并在 Android 上创建默认渠道
 * - iOS / Android 13+ 需要显式授权
 * - Android 低版本若不建 channel 可能静默
 */
export async function ensureNotifPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.status !== "granted") {
    const req = await Notifications.requestPermissionsAsync();
    if (req.status !== "granted") return false;
  }
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  return true;
}

/** 取消某个提醒 */
export async function cancelReminder(id: ReminderId): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {}
}

/** 取消全部提醒 */
export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** 获取已排程提醒（调试用） */
export async function listScheduledReminders() {
  return Notifications.getAllScheduledNotificationsAsync();
}

/**
 * 每天固定时间提醒（跨平台最稳）
 * @param hour 小时(0-23)
 * @param minute 分钟(0-59)
 * @param opts 文案与声音：建议从调用处传入多语言字符串
 */
export async function scheduleDailyReminder(
  hour = 9,
  minute = 0,
  opts?: { title?: string; body?: string; sound?: boolean }
): Promise<ReminderId> {
  const ok = await ensureNotifPermission();
  if (!ok) throw new Error("Notification permission not granted");

  const trigger: Notifications.DailyTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.DAILY,
    hour,
    minute,
  };

  const { tr } = useI18N();
  await scheduleDailyReminder(9, 0, {
    title: tr("查看今天的训练计划 ✅", "Check today's training plan ✅"),
    body: tr("打开训练日历，打卡你的训练项目。", "Open the calendar and log your training."),
    sound: true, // 需要声音就传 true；静音则删掉此行
  });


  const content: Notifications.NotificationContentInput = {
    title: opts?.title ?? "查看今天的训练计划 ✅",
    body: opts?.body ?? "打开训练日历，打卡你的训练项目。",
    // 不要传 null；需要声音则置为 true/ "default"
    ...(opts?.sound ? { sound: true } : {}),
  };

  return Notifications.scheduleNotificationAsync({ content, trigger });
}

/**
 * 每周指定星期的固定时间提醒
 * @param weekday 1=Sun, 2=Mon, ..., 7=Sat（注意：expo 定义如此）
 */
export async function scheduleWeeklyReminder(
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7,
  hour = 9,
  minute = 0,
  opts?: { title?: string; body?: string; sound?: boolean }
): Promise<ReminderId> {
  const ok = await ensureNotifPermission();
  if (!ok) throw new Error("Notification permission not granted");

  const trigger: Notifications.WeeklyTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
    weekday,
    hour,
    minute,
  };

  const content: Notifications.NotificationContentInput = {
    title: opts?.title ?? "每周提醒 ✅",
    body: opts?.body ?? "查看本周训练安排。",
    ...(opts?.sound ? { sound: true } : {}),
  };

  return Notifications.scheduleNotificationAsync({ content, trigger });
}

/**
 * 更灵活的“日历式”提醒（可月/日/周几/时/分组合）
 * 例如：每月 1 号 9:00 重复 —— 传 { month?:12, day:1, hour:9, minute:0, repeats:true }
 * 或：每年 12/1 9:00 —— 传 { month:12, day:1, hour:9, minute:0, repeats:true }
 */
export async function scheduleCalendarReminder(
  triggerLike: Omit<Notifications.CalendarTriggerInput, "type">,
  opts?: { title?: string; body?: string; sound?: boolean }
): Promise<ReminderId> {
  const ok = await ensureNotifPermission();
  if (!ok) throw new Error("Notification permission not granted");

  // 显式指定判别字段 type，避免 TS 报错
  const trigger: Notifications.CalendarTriggerInput = {
    type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
    ...triggerLike,
  };

  const content: Notifications.NotificationContentInput = {
    title: opts?.title ?? "日历提醒 ✅",
    body: opts?.body ?? "请查看训练计划。",
    ...(opts?.sound ? { sound: true } : {}),
  };

  return Notifications.scheduleNotificationAsync({ content, trigger });
}
