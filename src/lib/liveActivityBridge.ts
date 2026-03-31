// src/lib/liveActivityBridge.ts
import { Platform } from "react-native";

type LAProps = {
  gymName: string;
  discipline: string;
  startTime: number;
  routeCount: number;
  sendCount: number;
  bestGrade: string;
};

// LiveActivityFactory-like interface (avoid import type issues with dynamic require)
type LAFactory = {
  start(props: LAProps): LAInstance;
};
type LAInstance = {
  update(props: Partial<LAProps>): Promise<void>;
  end(policy: string, props?: Partial<LAProps>): Promise<void>;
};

// Lazy-load to avoid crashes in dev mode (same pattern as widgetBridge.ts)
let _factory: LAFactory | null | undefined;
function getFactory(): LAFactory | null {
  if (__DEV__) return null;
  if (_factory === null) return null;
  if (_factory) return _factory;
  try {
    _factory = require("../../widgets/ClimbingSession").default;
    return _factory!;
  } catch {
    _factory = null;
    return null;
  }
}

let _instance: LAInstance | null = null;

/** 开始 Live Activity (session 开始时调用) */
export function startLiveActivity(params: {
  gymName: string;
  discipline: string;
  startTime: number;
}) {
  if (Platform.OS !== "ios") return;
  try {
    const factory = getFactory();
    if (!factory) return;
    _instance = factory.start({
      gymName: params.gymName,
      discipline: params.discipline,
      startTime: params.startTime,
      routeCount: 0,
      sendCount: 0,
      bestGrade: "",
    });
  } catch (e) {
    if (__DEV__) console.warn("[liveActivity] start failed:", e);
  }
}

/** 更新 Live Activity (每次记录 log 时调用) */
export function updateLiveActivity(params: {
  routeCount: number;
  sendCount: number;
  bestGrade: string;
}) {
  if (!_instance) return;
  try {
    _instance.update(params).catch(() => {});
  } catch (e) {
    if (__DEV__) console.warn("[liveActivity] update failed:", e);
  }
}

/** 结束 Live Activity (session 结束时调用) */
export function endLiveActivity(params: {
  sendCount: number;
  bestGrade: string;
  routeCount: number;
}) {
  if (!_instance) return;
  try {
    _instance.end("default", params).catch(() => {});
    _instance = null;
  } catch (e) {
    if (__DEV__) console.warn("[liveActivity] end failed:", e);
    _instance = null;
  }
}
