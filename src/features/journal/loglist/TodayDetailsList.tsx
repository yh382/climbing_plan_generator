import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";

import LogItemCard from "./LogItemCard";
import { LocalDayLogItem } from "./types";
import { readNotesByRoutes, readSessionList, writeSessionList } from "./storage";
import { enqueueLogEvent } from "../sync/logsOutbox";
import useLogsStore from "../../../store/useLogsStore";
import { getSessionServerId } from "../sync/sessionServerIdMap";

type Props = {
  /** Stable id for the current session (recommended: String(activeSession.startTime)) */
  sessionKey: string;
  /** Date string used for payload + navigation context */
  date: string; // YYYY-MM-DD
  logType: "boulder" | "toprope" | "lead";
  labelOf: (grade: string) => string;
  tr: (zh: string, en: string) => string;
  refreshKey?: number | string;
  pendingAppend?: LocalDayLogItem | null;
  onAppended?: () => void;
  onCountChange?: (count: number) => void;
  onStatsChange?: (stats: { sends: number; best: string; routeCount: number }) => void;
};

function dedupeById(list: LocalDayLogItem[]) {
  const seen = new Set<string>();
  const out: LocalDayLogItem[] = [];
  for (const x of list) {
    const k = x?.id;
    if (!k) {
      out.push(x);
      continue;
    }
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function TodayDetailsList({
  sessionKey,
  date,
  logType,
  labelOf,
  tr,
  refreshKey,
  pendingAppend,
  onAppended,
  onCountChange,
  onStatsChange,
}: Props) {
  const router = useRouter();
  const [items, setItems] = useState<LocalDayLogItem[]>([]);
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const itemsRef = useRef<LocalDayLogItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
    onCountChange?.(items.length);
  }, [items, onCountChange]);

  // Live Activity stats
  useEffect(() => {
    if (!onStatsChange) return;
    const sends = items.reduce((s, it) => {
      if (typeof (it as any)?.sendCount === "number") return s + (it as any).sendCount;
      const style = (it as any)?.style;
      if (style === "redpoint" || style === "flash" || style === "onsight") return s + 1;
      return s;
    }, 0);

    const grades = items
      .map((it) => String(it?.grade || "").trim())
      .filter((g) => g.length > 0);

    let best = "";
    if (logType === "boulder") {
      best = grades
        .filter((g) => /^V\d+/i.test(g))
        .sort((a, b) => {
          const va = parseInt(a.replace(/^V/i, ""), 10);
          const vb = parseInt(b.replace(/^V/i, ""), 10);
          return vb - va;
        })[0] || "";
    } else {
      best = grades
        .filter((g) => /^5\./.test(g))
        .sort((a, b) => b.localeCompare(a))[0] || "";
    }

    onStatsChange({ sends, best, routeCount: items.length });
  }, [items, onStatsChange, logType]);

  const load = useCallback(async () => {
    const raw = await readSessionList(sessionKey, logType);
    const list = dedupeById(raw);
    setItems(list);

    const routeNames = list.map((x) => x.name).filter(Boolean);
    const notes = await readNotesByRoutes(routeNames);
    setNotesMap(notes);
  }, [sessionKey, logType]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!pendingAppend) return;

    const item = pendingAppend;
    const current = itemsRef.current;

    // already exists -> clear pending
    if (item?.id && current.some((x) => x?.id === item.id)) {
      queueMicrotask(() => onAppended?.());
      return;
    }

    const next = dedupeById([item, ...current]);

    // UI first
    setItems(next);
    itemsRef.current = next;

    if (item.name && item.note) {
      setNotesMap((prev) => ({ ...prev, [item.name]: item.note!.trim() }));
    }

    (async () => {
      try {
        await writeSessionList(sessionKey, logType, next);

        const routeName = (item.name || "").trim() || item.grade;
        const note = (item.note || "").trim();

        // Resolve session server ID — await in-flight session creation to avoid NULL
        const sessionServerId =
          (await useLogsStore.getState().awaitSessionServerId()) ||
          (await getSessionServerId(sessionKey)) ||
          null;

        await enqueueLogEvent({
          type: "create",
          localId: item.id,
          payload: {
            session_id: sessionServerId,
            _sessionKey: sessionKey, // fallback key for outbox flush if still null
            date: item.date,
            log_type: item.type,
            grade_text: item.grade,
            route_name: routeName,
            style: item.style,
            feel: item.feel ?? null,
            attempts_total: item.attemptsTotal ?? item.attempts ?? 1,
            send_count:
              typeof item.sendCount === "number"
                ? item.sendCount
                : item.style === "redpoint" || item.style === "flash" || item.style === "onsight"
                ? 1
                : 0,
            note: note || null,
            media: (item as any).media ?? null,
          },
        });

        queueMicrotask(() => onAppended?.());
      } catch (e) {
        console.warn("pendingAppend persist/enqueue failed:", e);
      }
    })();
  }, [pendingAppend, sessionKey, logType, onAppended]);

  const list = useMemo(() => items, [items]);

  return (
    <View style={{ gap: 10 }}>
      {list.map((it, idx) => (
        <LogItemCard
          key={`${it.id ?? "it"}_${idx}`}
          item={it}
          labelOf={labelOf}
          note={(notesMap[it.name] || it.note || "").trim() || undefined}
          tr={tr}
          onPress={() => {
            router.push({
              pathname: "/library/route-detail",
              params: {
                date,
                itemId: it.id,
                type: logType,
                sessionKey,
              },
            });
          }}
        />
      ))}
    </View>
  );
}

export { TodayDetailsList };
export default TodayDetailsList;
