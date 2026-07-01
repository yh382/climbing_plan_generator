// P2-F — self-score sheet. Reached from the "记录成绩 / Log my scores" CTA on the
// competition hub once you're enrolled and the comp is live. Lists every problem
// with Zone / Top buttons (Top ⊇ Zone). Optimistic local update + onScored()
// tells the parent to refetch standings.
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { TrueSheet } from "@lodev09/react-native-true-sheet";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { theme } from "@/lib/theme";
import { compApi } from "./api";
import type { CompDetail, CompProblem, CompScorecardEntry } from "./types";

export interface CompScoreSheetHandle {
  present: () => void;
  dismiss: () => void;
}

interface Props {
  comp: CompDetail;
  onScored: () => void;
}

const CompScoreSheet = forwardRef<CompScoreSheetHandle, Props>(function CompScoreSheet(
  { comp, onScored },
  ref,
) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { tr } = useSettings();
  const sheetRef = useRef<TrueSheet>(null);
  const [cards, setCards] = useState<Record<string, CompScorecardEntry>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const sync = useCallback(() => {
    const m: Record<string, CompScorecardEntry> = {};
    for (const s of comp.my_scorecards) m[s.comp_problem_id] = s;
    setCards(m);
  }, [comp.my_scorecards]);

  useImperativeHandle(ref, () => ({
    present: () => {
      sync();
      sheetRef.current?.present().catch(() => {});
    },
    dismiss: () => sheetRef.current?.dismiss().catch(() => {}),
  }));

  // Each button is a toggle: re-tapping the active result clears it (undo a
  // mis-tap). Top ⊇ Zone, so tapping Top always implies Zone.
  async function score(p: CompProblem, target: "zone" | "top") {
    const cur = cards[p.id];
    let top: boolean;
    let zone: boolean;
    if (target === "zone") {
      if (cur?.zone && !cur?.top) {
        top = false;
        zone = false; // toggle off
      } else {
        top = false;
        zone = true;
      }
    } else {
      if (cur?.top) {
        top = false;
        zone = false; // toggle off
      } else {
        top = true;
        zone = true;
      }
    }

    const prev = cards;
    setBusy(p.id);
    setCards((m) => ({
      ...m,
      [p.id]: {
        comp_problem_id: p.id,
        top,
        zone,
        attempts: m[p.id]?.attempts ?? 1,
        flashed: m[p.id]?.flashed ?? false,
      },
    }));
    try {
      await compApi.selfScore(comp.id, { comp_problem_id: p.id, top, zone });
      onScored();
    } catch {
      setCards(prev); // roll back optimistic update
      Alert.alert(
        tr("保存失败", "Couldn't save"),
        tr("请检查网络后重试", "Check your connection and try again."),
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <TrueSheet ref={sheetRef} name="comp-score-sheet" detents={["auto"]} dimmed cornerRadius={24}>
      <View style={styles.wrap}>
        <Text style={styles.title}>{tr("记录成绩", "Log my scores")}</Text>
        <Text style={styles.sub}>{tr("点 Top 会自动含 Zone", "Top automatically includes Zone")}</Text>
        <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingBottom: 8 }}>
          {comp.problems.map((p, i) => {
            const sc = cards[p.id];
            return (
              <View
                key={p.id}
                style={[styles.row, i === comp.problems.length - 1 && { borderBottomWidth: 0 }]}
              >
                <Text style={styles.pName} numberOfLines={1}>
                  {p.label || `#${i + 1}`}
                  {p.points != null ? `  ·  ${p.points}` : ""}
                </Text>
                <View style={styles.btns}>
                  <Pressable
                    style={[styles.btn, sc?.zone && !sc?.top && styles.zoneOn]}
                    disabled={busy === p.id}
                    onPress={() => score(p, "zone")}
                  >
                    <Text style={[styles.btnT, sc?.zone && !sc?.top && styles.btnTOn]}>Zone</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.btn, sc?.top && styles.topOn]}
                    disabled={busy === p.id}
                    onPress={() => score(p, "top")}
                  >
                    <Text style={[styles.btnT, sc?.top && styles.btnTOn]}>Top</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </TrueSheet>
  );
});

export default CompScoreSheet;

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    wrap: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 8 },
    title: { fontFamily: theme.fonts.black, fontSize: 20, color: colors.textPrimary, letterSpacing: -0.3 },
    sub: { fontFamily: theme.fonts.regular, fontSize: 13, color: colors.textSecondary, marginTop: 4, marginBottom: 12 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: 10,
    },
    pName: { flex: 1, fontFamily: theme.fonts.bold, fontSize: 15, color: colors.textPrimary },
    btns: { flexDirection: "row", gap: 8 },
    btn: {
      paddingHorizontal: 15,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.backgroundSecondary,
    },
    zoneOn: { backgroundColor: "#D9770622" },
    topOn: { backgroundColor: colors.accent },
    btnT: { fontFamily: theme.fonts.bold, fontSize: 13, color: colors.textSecondary },
    btnTOn: { color: "#FFFFFF" },
  });
