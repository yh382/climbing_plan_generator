import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Store
import useLogsStore, { useSegmentsByDate } from "../src/store/useLogsStore";
import { usePlanStore, toDateString } from "../src/store/usePlanStore";
import { useSettings } from "src/contexts/SettingsContext";

// Components
import CollapsibleCalendarOverlay from "../components/CollapsibleCalendarOverlay";
import DualMiniRings from "../components/DualMiniRings";
import LogSendModal, { LogSendDraft } from "../src/features/journal/LogSendModal";
import QuickLogCard from "../src/features/journal/QuickLogCard";
import { TodayDetailsList } from "../src/features/journal/loglist";
import type { LocalDayLogItem } from "../src/features/journal/loglist/types";
import { enqueueLogEvent } from "../src/features/journal/sync/logsOutbox";
import FirstLogTooltip from "../src/features/home/components/FirstLogTooltip";
import { flushLogsOutbox } from "../src/features/journal/sync/logsOutbox";
import { readAllServerIds, setServerId } from "../src/features/journal/sync/serverIdMap";
import { flushSessionsOutbox } from "../src/features/journal/sync/sessionsOutbox";
import {
  readAllSessionServerIds,
  setSessionServerId as setSessionSId,
} from "../src/features/journal/sync/sessionServerIdMap";
import { syncAllLocalSessions } from "../src/features/journal/sync/syncAllLocalSessions";
import { useAuthStore } from "../src/store/useAuthStore";
import { readDayList } from "../src/features/journal/loglist/storage";
import { computeDailyIntensity, saveIntensityForDate } from "../src/services/stats/intensityCalculator";

// Native header
import { withHeaderTheme } from "../src/lib/nativeHeaderOptions";
import { HeaderButton } from "../src/components/ui/HeaderButton";
import { useThemeColors } from "../src/lib/useThemeColors";

// Utils
import { colorForBoulder, colorForYDS } from "../lib/gradeColors";


const YDS_GROUPS = {
  Beginner: ["5.6", "5.7", "5.8", "5.9"],
  "5.10": ["5.10a", "5.10b", "5.10c", "5.10d"],
  "5.11": ["5.11a", "5.11b", "5.11c", "5.11d"],
  "5.12": ["5.12a", "5.12b", "5.12c", "5.12d"],
  Elite: ["5.13a", "5.13b", "5.13c", "5.13d", "5.14a"],
};
type YdsGroupKey = keyof typeof YDS_GROUPS;

const YDS_TO_FRENCH: Record<string, string> = {
  "5.6": "5a", "5.7": "5b", "5.8": "5c", "5.9": "6a", "5.10a": "6a+",
  "5.10b": "6a+", "5.10c": "6b", "5.10d": "6b+", "5.11a": "6c",
  "5.11b": "6c+", "5.11c": "7a", "5.11d": "7a+", "5.12a": "7b",
  "5.12b": "7b+", "5.12c": "7c", "5.12d": "7c+", "5.13a": "7c+",
  "5.13b": "8a", "5.13c": "8a+", "5.13d": "8b", "5.14a": "8b+",
  "5.14b": "8c", "5.14c": "8c+", "5.14d": "9a",
};

const V_TO_FONT: Record<string, string> = {
  VB: "3", V0: "4", V1: "5", V2: "5+", V3: "6A", V4: "6B", V5: "6C",
  V6: "7A", V7: "7A+", V8: "7B", V9: "7C", V10: "7C+", V11: "8A",
  V12: "8A+", V13: "8B", V14: "8B+", V15: "8C", V16: "8C+", V17: "9A",
};

function pad(n: number) { return n < 10 ? `0${n}` : `${n}`; }
function dateStr(d: Date) {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const da = pad(d.getDate());
  return `${y}-${m}-${da}`;
}
const formatBarLabel = (d: Date, isZH: boolean) => {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const wCN = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][d.getDay()];
  const wEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
  return isZH ? `${mm}/${dd} · ${wCN}` : `${wEN}, ${mm}/${dd}`;
};

// ✅ 本地 note key（与 LogSendModal 保持一致）
const NOTE_BY_ROUTE_KEY = (routeName: string) => `logsend_note_by_route_${routeName}`;

type Feel = "soft" | "solid" | "hard";
const isFeel = (x: any): x is Feel => x === "soft" || x === "solid" || x === "hard";

export default function Journal() {
  const { boulderScale, ropeScale, lang } = useSettings();
  const tr = (zh: string, en: string) => (lang === "zh" ? zh : en);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const router = useRouter();
  const navigation = useNavigation();
  const [pendingAppend, setPendingAppend] = useState<LocalDayLogItem | null>(null);

  const lastSubmitAtRef = useRef<number>(0);
  const submitSeqRef = useRef<number>(0);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const [sessionDetailCount, setSessionDetailCount] = useState(0);


  const { logs, upsertCount, activeSession, endSession } = useLogsStore();
  const mode = activeSession?.discipline ?? "boulder";
  const { monthMap } = usePlanStore();

  // timer
  const [sessionDuration, setSessionDuration] = useState("00:00:00");
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (activeSession) {
      interval = setInterval(() => {
        const now = Date.now();
        const diff = now - activeSession.startTime;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setSessionDuration(
          `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
        );
      }, 1000);
    }
    return () => interval && clearInterval(interval);
  }, [activeSession]);

  useFocusEffect(
    useCallback(() => {
      // 每次回到 Journal（从 detail back）都触发一次
      setRefreshNonce((n) => n + 1);

      // Retry any pending outbox events on focus: sessions FIRST, then logs
      const token = useAuthStore.getState().accessToken;
      if (token) {
        (async () => {
          try {
            // 1. Flush sessions first (so logs can resolve session_id)
            const sMap = await readAllSessionServerIds();
            await flushSessionsOutbox({
              resolveServerId: (k) => sMap[k] ?? null,
              saveServerId: async (k, id) => {
                await setSessionSId(k, id);
                sMap[k] = id;
              },
            });

            // 2. Sync any remaining unsynced local sessions
            syncAllLocalSessions({
              getSessions: () => useLogsStore.getState().sessions,
              updateSession: (sessionKey, patch) => {
                const { sessions } = useLogsStore.getState();
                useLogsStore.setState({
                  sessions: sessions.map((s) =>
                    s.sessionKey === sessionKey ? { ...s, ...patch } : s
                  ),
                });
              },
            });
          } catch {}

          try {
            // 3. Flush logs after sessions are resolved
            const idMap = await readAllServerIds();
            await flushLogsOutbox({
              token,
              resolveServerId: (localId) => idMap[localId] ?? null,
              saveServerId: async (localId, serverId) => {
                await setServerId(localId, serverId);
              },
            });
          } catch {}
        })();
      }
    }, [])
  );

  const handleBack = () => router.back();

  const handleEndSession = () => {
    Alert.alert(tr("结束训练?", "End Session?"), tr("这就结束今天的训练了吗？", "Are you done climbing for today?"), [
      { text: tr("取消", "Cancel"), style: "cancel" },
      {
        text: tr("结束并保存", "End & Save"),
        style: "destructive",
          onPress: async () => {
            // 1) 先把 Journal 页面的"追加态"清掉，避免残留
            setPendingAppend(null);

            // 2) 触发 TodayDetailsList 重新 load
            setRefreshNonce((n) => n + 1);

            // 3) 再真正结束 session（写入 storage / 后端）
            const newSession = await endSession();

            // 4) Compute & save intensity for today (fire-and-forget)
            const intensityDate = todayKey;
            Promise.all(
              (["boulder", "toprope", "lead"] as const).map(async (t) => {
                const items = await readDayList(intensityDate, t);
                const result = computeDailyIntensity(items);
                if (result) await saveIntensityForDate(intensityDate, t, result);
              })
            ).catch(() => {});

            // 5) Flush outbox → backend: sessions FIRST (so logs can resolve session_id)
            const token = useAuthStore.getState().accessToken;
            if (token) {
              try {
                const sMap = await readAllSessionServerIds();
                await flushSessionsOutbox({
                  resolveServerId: (k) => sMap[k] ?? null,
                  saveServerId: async (k, id) => {
                    await setSessionSId(k, id);
                    sMap[k] = id;
                  },
                });
              } catch {}

              try {
                const idMap = await readAllServerIds();
                await flushLogsOutbox({
                  token,
                  resolveServerId: (localId) => idMap[localId] ?? null,
                  saveServerId: async (localId, serverId) => {
                    await setServerId(localId, serverId);
                    idMap[localId] = serverId;
                  },
                });
              } catch {}
            }

            if (newSession) {
              router.replace({
                pathname: "/library/log-detail",
                params: {
                  date: newSession.date,
                  origin: "end_log",
                  gymName: newSession.gymName ?? activeSession?.gymName ?? "",
                  sessionKey: newSession.sessionKey,
                },
              });
            }
          }

      },
    ]);
  };

  // ===== Native header =====
  useLayoutEffect(() => {
    navigation.setOptions({
      ...withHeaderTheme(colors),
      headerTitle: activeSession
        ? tr("训练记录中", "Logging Session")
        : tr("训练日志", "Journal"),
      headerLeft: () => (
        <HeaderButton icon="chevron.backward" onPress={handleBack} />
      ),
      headerRight: activeSession
        ? () => (
            <HeaderButton
              icon="stop.circle"
              onPress={handleEndSession}
            />
          )
        : undefined,
    });
  }, [activeSession, colors, navigation, tr]);

  const todayKey = useMemo(() => dateStr(selectedDate), [selectedDate]);
  const logType = mode; // "boulder" | "toprope" | "lead"

  // 仍保留 segments 用于上方 ring/统计等逻辑（不动）
  const daySegments = useSegmentsByDate(todayKey, logType);

  const todayTotal = useMemo(() => {
    return logs
      .filter((l: any) => l.date === todayKey && l.type === logType)
      .reduce((acc: number, cur: any) => acc + cur.count, 0);
  }, [logs, todayKey, logType]);

  // ✅ 用于 Session's Details：拿当天「单条 log」列表
  const todayLogs = useMemo(() => {
    return logs.filter((l: any) => l?.date === todayKey && (l?.type ? l.type === logType : true));
  }, [logs, todayKey, logType]);

  // ✅ 本地 note：按 routeName 批量读取（优先显示本地）
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const names = Array.from(
        new Set(
          todayLogs
            .map((x: any) => (x?.name || x?.routeName || x?.route || "").trim())
            .filter(Boolean)
        )
      );

      if (names.length === 0) {
        if (!cancelled) setLocalNotes({});
        return;
      }

      const pairs = await Promise.all(
        names.map(async (n) => {
          try {
            const v = await AsyncStorage.getItem(NOTE_BY_ROUTE_KEY(n));
            return [n, (v || "").trim()] as const;
          } catch {
            return [n, ""] as const;
          }
        })
      );

      if (cancelled) return;

      const map: Record<string, string> = {};
      for (const [n, v] of pairs) {
        if (v) map[n] = v;
      }
      setLocalNotes(map);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [todayLogs]);

  const renderDayExtra = (d: Date) => {
    const k = toDateString(d);
    const outerPct = (monthMap[k] ?? 0) / 100;
    const dayLogsCount = logs.filter((l: any) => l.date === k).reduce((s: number, l: any) => s + l.count, 0);
    const climbGoal = 10;
    const innerVal = dayLogsCount / climbGoal;
    if (outerPct === 0 && dayLogsCount === 0) return null;
    return (
      <View style={{ position: "absolute", top: 40, left: 0, right: 0, alignItems: "center" }}>
        <DualMiniRings
          size={34}
          outerValue={outerPct}
          innerValue={innerVal}
          outerColor="#A5D23D"
          innerColor="#306E6F"
          outerThickness={3}
          innerThickness={3}
          gap={2}
        />
      </View>
    );
  };

  // ===== modal state =====
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [pendingGrade, setPendingGrade] = useState<string | null>(null);

  const labelOf = (g: string) => {
    if (mode === "boulder") return boulderScale === "Font" ? V_TO_FONT[g] || g : g;
    return ropeScale === "French" ? YDS_TO_FRENCH[g] || g : g;
  };

  const openForGrade = (g: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPendingGrade(g);
    setSendModalOpen(true);
  };

  const sessionKey = useMemo(
    () => (activeSession ? String(activeSession.startTime) : "nosession"),
    [activeSession]
  );

  const feelPill = (feelRaw: any) => {
    if (!isFeel(feelRaw)) return null;
    if (feelRaw === "solid") return null;
    const text = feelRaw === "soft" ? "SOFT" : "HARD";
    return (
      <View style={[styles.feelPill, { backgroundColor: colors.cardDark }]}>
        <Text style={[styles.feelPillText, { color: colors.pillText }]}>{text}</Text>
      </View>
    );
  };

  const renderTodayCard = (item: any, idx: number) => {
    const routeName = (item?.name || item?.routeName || item?.route || "").trim() || tr("未命名路线", "Unnamed Route");
    const note = (localNotes[routeName] || item?.note || item?.notes || "").trim();
    const feel = isFeel(item?.feel) ? item.feel : (isFeel(item?.difficultyFeel) ? item.difficultyFeel : undefined);

    return (
      <View key={`${item?.id ?? "today"}_${idx}`} style={{ paddingHorizontal: 16 }}>
        <View style={styles.detailCard}>
          <View style={styles.detailImageWrap}>
            {item?.image ? (
              <Image source={{ uri: item.image }} style={styles.detailImage} resizeMode="cover" />
            ) : (
              <View style={[styles.detailImage, styles.noImage]}>
                <Text style={styles.noImageText}>{item?.grade ? labelOf(item.grade) : "—"}</Text>
              </View>
            )}
          </View>

          <View style={styles.detailInfo}>
            <View style={styles.detailTopRow}>
              <Text style={styles.routeName} numberOfLines={2}>
                {routeName}
              </Text>
              {feelPill(feel)}
            </View>
          </View>
        </View>

        {note ? (
          <View style={styles.noteBubble}>
            <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.textSecondary} />
            <Text style={styles.noteText} numberOfLines={2}>
              {note}
            </Text>
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CollapsibleCalendarOverlay
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        date={selectedDate}
        onSelect={(d) => {
          setSelectedDate(d);
          setCalendarOpen(false);
        }}
        lang={lang === "zh" ? "zh" : "en"}
        firstDay={1}
        topOffset={0}
        renderDayExtra={renderDayExtra}
        onMonthChange={() => {}}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        style={{ flex: 1, backgroundColor: colors.background }}
      >
        <View style={{ paddingHorizontal: 16 }}>
          <View style={{ marginTop: 12 }}>
            <FirstLogTooltip />
            <View>
              <QuickLogCard
                mode={mode}
                tr={tr}
                labelOf={labelOf}
                onPickGrade={openForGrade}
                cardPadding={16}
              />
            </View>
          </View>

          {/* Session's Details */}
          <View style={{ marginTop: 24 }}>
            {/* header row: title + badge */}
            <View style={styles.detailsRow}>
              <Text style={styles.sectionTitle}>{tr("本次详情", "Session's Details")}</Text>
              <View style={styles.countBadge}>
                <Text style={styles.detailsCount}>{(activeSession ? sessionDetailCount : 0)} sends</Text>
              </View>
            </View>

            {/* list below */}
            {activeSession ? (
              <View style={{ marginTop: 12, width: "100%" }}>
                <TodayDetailsList
                  key={`${todayKey}_${logType}_${sessionKey}_${refreshNonce}`}
                  sessionKey={sessionKey}
                  date={todayKey}
                  logType={logType}
                  labelOf={labelOf}
                  tr={tr}
                  pendingAppend={pendingAppend}
                  onAppended={() => setPendingAppend(null)}
                  refreshKey={refreshNonce}
                  onCountChange={setSessionDetailCount}
                />
              </View>
            ) : (
              <View style={[styles.emptyBox, { marginTop: 12 }]}>{/* empty UI */}</View>
            )}
          </View>
        </View>
      </ScrollView>

      <LogSendModal
        visible={sendModalOpen}
        title={pendingGrade ? `${tr("记录", "Log")} ${labelOf(pendingGrade)}` : tr("记录", "Log")}
        tr={tr}
        onClose={() => {
          setSendModalOpen(false);
          setPendingGrade(null);
        }}
        onDone={(draft: LogSendDraft) => {
          if (!pendingGrade) return;

          // Prevent accidental rapid double-submit from inserting the same item twice
          const now = Date.now();
          if (now - lastSubmitAtRef.current < 500) return;
          lastSubmitAtRef.current = now;
          submitSeqRef.current += 1;

          upsertCount({ date: todayKey, type: logType, grade: pendingGrade, delta: 1 });

          // @ts-ignore
          const uuid = (globalThis as any)?.crypto?.randomUUID?.() as string | undefined;

          const item: LocalDayLogItem = {
            id: uuid ?? `${now}_${Math.random().toString(16).slice(2)}_${submitSeqRef.current}`,
            date: todayKey,
            type: logType,
            grade: pendingGrade,
            name: (draft?.name || "").trim() || labelOf(pendingGrade),

            style: draft.style,
            attempts: draft.attempts ?? 1,
            feel: draft.feel,
            sendCount:
              draft.style === "redpoint" || draft.style === "flash" || draft.style === "onsight" ? 1 : 0,

            attemptsTotal: draft.attempts ?? 1,
            note: (draft.note || "").trim(),
            media: draft.media,
            createdAt: now,
          };

          setPendingAppend(item);

          setSendModalOpen(false);
          setPendingGrade(null);

          const routeName = (draft?.name || "").trim();
          const note = (draft?.note || "").trim();
          if (routeName && note) {
            setLocalNotes((prev) => ({ ...prev, [routeName]: note }));
          }
        }}

      />
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    detailsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 2,
      marginBottom: 14,
    },
    sectionTitle: { fontSize: 18, fontFamily: "DMSans_900Black", color: colors.textPrimary, letterSpacing: -0.5 },
    countBadge: {
      backgroundColor: colors.border,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    detailsCount: { color: colors.textSecondary, fontSize: 12, fontWeight: "700" },

    detailCard: {
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 12,
      flexDirection: "row",
      overflow: "hidden",
    },
    detailImageWrap: { width: 96, height: 96 },
    detailImage: { width: "100%", height: "100%" },
    noImage: { backgroundColor: colors.cardDark, alignItems: "center", justifyContent: "center" },
    noImageText: { fontSize: 16, fontFamily: "DMMono_500Medium", color: colors.textSecondary },

    detailInfo: { flex: 1, padding: 12, justifyContent: "center" },
    detailTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
    routeName: { flex: 1, fontSize: 15, fontFamily: "DMSans_900Black", color: colors.textPrimary, letterSpacing: -0.2 },

    feelPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      alignSelf: "flex-start",
    },
    feelPillText: {
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.8,
    },

    noteBubble: {
      marginTop: 8,
      backgroundColor: colors.backgroundSecondary,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    noteText: {
      flex: 1,
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: "700",
    },

    emptyBox: {
      padding: 30,
      alignItems: "center",
      justifyContent: "center",
      borderStyle: "dashed",
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 20,
    },
  });
