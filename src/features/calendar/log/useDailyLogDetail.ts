import { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";

import useLogsStore, { useSegmentsByDate } from "../../../store/useLogsStore";
import { usePlanStore } from "../../../store/usePlanStore";
import { colorForBoulder, colorForYDS } from "../../../../lib/gradeColors";

// ✅ 改为从 storage 读 “逐条 items”
import { readDayList, readSessionList, readNotesByRoutes } from "../../journal/loglist/storage";

function safeDayKey(input?: string): string {
  if (!input) return "";
  const s = String(input);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const sliced = s.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(sliced)) return sliced;
  try {
    return format(parseISO(s), "yyyy-MM-dd");
  } catch {
    return sliced;
  }
}

const isBoulderGrade = (g?: string) => typeof g === "string" && /^V\d+/i.test(g.trim());
const isRouteGrade = (g?: string) => typeof g === "string" && /^5\./.test(g.trim());

export type UseDailyLogDetailResult = {
  dateKey: string;
  displayDate: string;

  isPublicView: boolean;
  modeParam?: "boulder" | "rope";
  gymName: string;

  dailyLogs: any[];
  localNotes: Record<string, string>;

  hasBoulder: boolean;
  hasRoutes: boolean;

  trainingPct: number;

  boulderParts: { grade: string; count: number; color: string }[];
  routeParts: { grade: string; count: number; color: string }[];
  boulderTotal: number;
  routeTotal: number;
};

export function useDailyLogDetail(params: {
  date?: string;
  origin?: string;
  readonly?: string;
  gymNameParam?: string;
  modeParam?: "boulder" | "rope";
}): UseDailyLogDetailResult {
  const { sessions } = useLogsStore();
  const { percentForDate } = usePlanStore();

  const dateKey = useMemo(() => safeDayKey(params.date), [params.date]);

  const isPublicView = useMemo(() => {
    if (params.readonly === "1") return true;
    if (params.origin === "community") return true;
    if (params.origin === "public") return true;
    return false;
  }, [params.readonly, params.origin]);

  // ✅ end_log 时：从 sessions[0].startTime(ISO) 反推出 sessionKey(ms string)
  const sessionKeyToLoad = useMemo(() => {
    if (params.origin !== "end_log") return "";
    const first: any = sessions?.[0];
    if (!first?.startTime) return "";
    const ms = Date.parse(first.startTime);
    return Number.isFinite(ms) ? String(ms) : "";
  }, [params.origin, sessions]);

  const [dailyLogs, setDailyLogs] = useState<any[]>([]);
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!dateKey && !sessionKeyToLoad) {
        if (!cancelled) {
          setDailyLogs([]);
          setLocalNotes({});
        }
        return;
      }

      // 1) 优先读 session list（仅 end_log）
      let b: any[] = [];
      let r: any[] = [];

      if (sessionKeyToLoad) {
        const [sb, str, sl] = await Promise.all([
          readSessionList(sessionKeyToLoad, "boulder"),
          readSessionList(sessionKeyToLoad, "toprope"),
          readSessionList(sessionKeyToLoad, "lead"),
        ]);
        b = Array.isArray(sb) ? sb : [];
        r = [...(Array.isArray(str) ? str : []), ...(Array.isArray(sl) ? sl : [])];
      }

      // 2) session 为空才 fallback 到 day list
      if (!sessionKeyToLoad || (b.length === 0 && r.length === 0)) {
        const [db, dtr, dl] = await Promise.all([
          readDayList(dateKey, "boulder"),
          readDayList(dateKey, "toprope"),
          readDayList(dateKey, "lead"),
        ]);
        b = Array.isArray(db) ? db : [];
        r = [...(Array.isArray(dtr) ? dtr : []), ...(Array.isArray(dl) ? dl : [])];
      }

      if (cancelled) return;

      const merged = [...b, ...r];
      setDailyLogs(merged);

      const names = merged
        .map((x: any) => (x?.name || x?.routeName || x?.route || "").trim())
        .filter(Boolean);

      const notes = await readNotesByRoutes(names);
      if (!cancelled) setLocalNotes(notes);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [dateKey, sessionKeyToLoad]);

  const displayDate = useMemo(() => {
    if (!dateKey) return "Unknown Date";
    try {
      return format(parseISO(dateKey), "EEEE, MMM dd");
    } catch {
      return dateKey;
    }
  }, [dateKey]);

  const gymName = useMemo(() => {
    if (params.gymNameParam) return params.gymNameParam;
    const first: any = dailyLogs[0];
    return first?.gymName || first?.gym || first?.location || "";
  }, [params.gymNameParam, dailyLogs]);

  const hasBoulder = useMemo(() => dailyLogs.some((l: any) => isBoulderGrade(l?.grade)), [dailyLogs]);
  const hasRoutes = useMemo(() => dailyLogs.some((l: any) => isRouteGrade(l?.grade)), [dailyLogs]);

  // ✅ ring segments：仍沿用 store 聚合（不动你原逻辑）
  const boulderSegments = useSegmentsByDate(dateKey, "boulder");
  const topropeSegments = useSegmentsByDate(dateKey, "toprope");
  const leadSegments = useSegmentsByDate(dateKey, "lead");
  const routeSegments = useMemo(
    () => [...topropeSegments, ...leadSegments],
    [topropeSegments, leadSegments]
  );

  const boulderParts = useMemo(
    () =>
      boulderSegments.map((p) => ({
        grade: p.grade,
        count: p.count,
        color: colorForBoulder(p.grade),
      })),
    [boulderSegments]
  );

  const routeParts = useMemo(
    () =>
      routeSegments.map((p) => ({
        grade: p.grade,
        count: p.count,
        color: colorForYDS(p.grade),
      })),
    [routeSegments]
  );

  const boulderTotal = useMemo(() => boulderSegments.reduce((s, x) => s + x.count, 0), [boulderSegments]);
  const routeTotal = useMemo(() => routeSegments.reduce((s, x) => s + x.count, 0), [routeSegments]);

  const [trainingPct, setTrainingPct] = useState(0);
  useEffect(() => {
    if (!dateKey) return;
    try {
      percentForDate(parseISO(dateKey)).then(setTrainingPct).catch(() => setTrainingPct(0));
    } catch {
      setTrainingPct(0);
    }
  }, [dateKey, percentForDate]);

  return {
    dateKey,
    displayDate,
    isPublicView,
    modeParam: params.modeParam,
    gymName,
    dailyLogs,
    localNotes,
    hasBoulder,
    hasRoutes,
    trainingPct,
    boulderParts,
    routeParts,
    boulderTotal,
    routeTotal,
  };
}
