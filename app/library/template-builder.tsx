// app/library/template-builder.tsx
// TR4b-2 — Workout Template editor (Motra-inspired UX redesign).
//
// Changes from the first cut (per user feedback after seeing the
// initial UI):
//   - Removed Level (users design for themselves)
//   - Removed Equipment (folded into Tags)
//   - Single Description field (writes to short_desc_zh OR _en based
//     on current locale, the other is null)
//   - Tags row → app/tags-picker.tsx formSheet (Variant 2 handoff)
//   - Removed Accessory block_type (warmup / main / cooldown only)
//   - Cover image upload (R2 presign, covers/ category)
//   - Item editor:
//       · Removed Notes
//       · "Add Item" opens picker directly (no empty stub row)
//       · Picker is multi-select, returns N items at once
//       · Numeric fields auto-fill from exercise.protocol defaults
//       · Rest field opens RestPickerSheet (native UIPickerView wheels)
//   - Picker selection bug fix: caller subscribes to handoff store via
//     useEffect on the result slot (useFocusEffect doesn't fire when
//     a formSheet dismisses to its parent — parent never "blurred")
//   - Save button uses a ref to read the latest closure on every press,
//     fixing the stale-first-render-state bug from the first iteration.

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

import { theme } from "@/lib/theme";
import { useThemeColors } from "@/lib/useThemeColors";
import { useSettings } from "@/contexts/SettingsContext";
import { HeaderButton } from "@/components/ui/HeaderButton";
import { MenuPill, type MenuOption } from "@/components/ui/MenuPill";
import { workoutsApi } from "../../src/features/workouts/api";
import type {
  LoadUnit,
  Phase,
  TemplateVisibility,
  WorkoutItem,
  WorkoutTemplateIn,
  WorkoutTemplateOut,
  WorkoutTemplateSummary,
  WorkoutTemplateUpdateIn,
} from "../../src/features/workouts/types";
import useWorkoutTemplateStore from "../../src/features/workouts/store/useWorkoutTemplateStore";
import useExercisePickerHandoffStore from "../../src/store/useExercisePickerHandoffStore";
import useTagsPickerHandoffStore from "../../src/store/useTagsPickerHandoffStore";
import {
  exercisesApi,
  type ExerciseListItem,
} from "../../src/features/exercises/api";
import type { ProtocolVariant } from "../../src/features/exercises/types";
import useValuePickerHandoffStore from "../../src/store/useValuePickerHandoffStore";
import {
  EQUIPMENT_TAG_SLUGS,
  TEMPLATE_TAG_PRESETS,
  formatTagLabel,
} from "../../src/features/workouts/constants";
import { uploadImageToR2 } from "../../src/features/profile/api";

// TR4c — phases the FE auto-sections by. Order is rendering order;
// inside a phase items keep the user's authoring order.
const PHASES: Phase[] = ["warmup", "main", "cooldown"];

// Apple HIG minimum tap target = 44×44pt. Small label-style pills
// (variant chips, etc.) intentionally render compact for visual
// hierarchy; this hitSlop pads the touch area outward so the
// effective tap zone still reaches the 44pt floor.
const SMALL_PILL_HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };

interface DraftSet {
  rest_per_set_sec: number | null;
  reps: number | null;
  /** Time per rep / hang duration (sec). Independent column from
   *  `reps` — climbing items often need both (e.g. hangboard
   *  repeaters: 6 reps × 7s hang). */
  seconds: number | null;
  load: number | null;
}

interface DraftItem {
  /** Phase the exercise sits in. Drives visual grouping; user can move
   *  via the per-item menu. New items default to "main". */
  phase: Phase;
  action_id: string;
  variant_id: string | null;
  variants: ProtocolVariant[] | null;
  displayName: string | null;
  sets: DraftSet[];
  collapsed: boolean;
  loadUnit: LoadUnit;
  /** Micro-rest between reps within a set (hangboard interval style).
   *  Single value applied to all sets — not a per-set field. */
  rest_per_rep_sec: number | null;
}

function emptySet(): DraftSet {
  return {
    rest_per_set_sec: null,
    reps: null,
    seconds: null,
    load: null,
  };
}

function makeDraftItem(
  action_id: string,
  displayName: string,
  phase: Phase = "main",
): DraftItem {
  return {
    phase,
    action_id,
    variant_id: null,
    variants: null,
    displayName,
    sets: [emptySet()],
    collapsed: false,
    loadUnit: "lb",
    rest_per_rep_sec: null,
  };
}

function itemsFromTemplate(t: WorkoutTemplateOut): DraftItem[] {
  return (t.items ?? []).map((it) => {
    const numSets = Math.max(1, it.sets ?? 1);
    // Replicate flat BE values into N identical sets; user can
    // diverge later via per-row editing.
    const sets: DraftSet[] = Array.from({ length: numSets }, () => ({
      rest_per_set_sec: it.rest_sec ?? null,
      reps: it.reps ?? null,
      seconds: it.seconds ?? null,
      load: it.load ?? null,
    }));
    return {
      phase: it.phase ?? "main",
      action_id: it.action_id,
      variant_id: it.variant_id ?? null,
      variants: null,
      displayName: null,
      sets,
      // Saved items load collapsed so the user sees the overview
      // first; expand by tapping the title row.
      collapsed: true,
      loadUnit: (it.load_unit ?? "lb") as LoadUnit,
      rest_per_rep_sec: it.rest_per_rep_sec ?? null,
    };
  });
}

function phaseLabel(
  p: Phase,
  tr: (zh: string, en: string) => string,
): string {
  switch (p) {
    case "warmup":   return tr("热身", "Warm-up");
    case "main":     return tr("主体", "Main");
    case "cooldown": return tr("放松", "Cooldown");
  }
}

function formatDurationDisplay(sec: number | null): string {
  if (sec == null || sec <= 0) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}:00`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function loadUnitLabel(unit: LoadUnit, tr: (zh: string, en: string) => string): string {
  switch (unit) {
    case "lb":  return "lb";
    case "kg":  return "kg";
    case "pct": return tr("% 最大", "% Max");
  }
}

/** Pull protocol numeric defaults into a Draft item — only fills
 *  fields the user hasn't already touched. Replicates the protocol
 *  defaults across all sets (auto-align). */
function applyProtocolDefaults(
  draft: DraftItem,
  protocol: Record<string, any> | null | undefined,
): DraftItem {
  if (!protocol) return draft;
  // Action library JSON (libraries/v1/actions/*.json) is the source of
  // truth for protocol field names. It uses multiple synonyms:
  //   - sets             → numSets
  //   - reps_per_set | reps                                → reps
  //   - hang_sec | work_sec | seconds                      → seconds
  //   - rest_between_sets_sec | rest_sec                   → rest
  //   - rest_between_sets_min (×60 → sec)                  → rest fallback
  //   - rest_between_reps_sec | rest_per_rep_sec           → restPerRep
  // `reps_per_set` is sometimes a range string ("3-5", "8-12") — we
  // only inject numeric values; ranges fall through to null and the
  // user picks a concrete number themselves.
  const toNumber = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  const numSets = toNumber(protocol.sets);
  const reps =
    toNumber(protocol.reps_per_set) ??
    toNumber(protocol.reps);
  const seconds =
    toNumber(protocol.hang_sec) ??
    toNumber(protocol.work_sec) ??
    toNumber(protocol.seconds);
  const restMin = toNumber(protocol.rest_between_sets_min);
  const rest =
    toNumber(protocol.rest_sec) ??
    toNumber(protocol.rest_between_sets_sec) ??
    (restMin != null ? restMin * 60 : null);
  const restPerRep =
    toNumber(protocol.rest_between_reps_sec) ??
    toNumber(protocol.rest_per_rep_sec);

  const isPristine = draft.sets.every(
    (s) =>
      s.reps == null && s.seconds == null && s.rest_per_set_sec == null && s.load == null,
  );

  // Resize sets[] to protocol.sets count only if user hasn't touched.
  let nextSets = draft.sets;
  if (numSets != null && numSets >= 1 && isPristine && draft.sets.length === 1) {
    nextSets = Array.from({ length: numSets }, () => emptySet());
  }

  nextSets = nextSets.map((s) => ({
    rest_per_set_sec: s.rest_per_set_sec ?? rest,
    reps: s.reps ?? (reps ?? null),
    seconds: s.seconds ?? (seconds ?? null),
    load: s.load,
  }));

  return {
    ...draft,
    sets: nextSets,
    // Don't overwrite an already-set user value.
    rest_per_rep_sec: draft.rest_per_rep_sec ?? restPerRep,
  };
}

export default function TemplateBuilderScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const { tr, lang } = useSettings();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const params = useLocalSearchParams<{ templateId?: string }>();
  const templateId = params.templateId ?? null;
  const isEdit = !!templateId;

  // ── Form state ───────────────────────────────────────────────────────
  const [loadingExisting, setLoadingExisting] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [title, setTitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  // Decorative tint applied to the tag chips on the Tags row.
  // FE-only: not persisted to the backend (extra="forbid" rejects
  // unknown fields). Resets to undefined on cold edit-load, default
  // tint is taken from the Tags sheet when the user opens it.
  const [tagColor, setTagColor] = useState<string | undefined>(undefined);
  const [description, setDescription] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  // Flat draft list. Visual section headers (Warmup / Main / Cooldown)
  // emerge at render time by grouping on `phase`.
  const [items, setItems] = useState<DraftItem[]>([]);
  // private | public — both supported BE-side
  // (schemas/workout_template.py:TemplateVisibility).
  const [visibility, setVisibility] = useState<TemplateVisibility>("private");

  // ── Value picker (wheel sheet) wiring ───────────────────────────────
  // Encoded targetId for the generic value-picker formSheet so we can
  // route each result back to the right cell. Format (flat items —
  // TR4c, no outer block index):
  //   "${iIdx}:set${sIdx}:${field}" — field ∈
  //   { rest_per_set, reps, seconds, load }
  // or
  //   "${iIdx}:item:rest_per_rep" — item-level rest_per_rep.

  // ── Edit-mode load existing ──────────────────────────────────────────
  useEffect(() => {
    if (!templateId) return;
    let alive = true;
    (async () => {
      try {
        const t = await workoutsApi.get(templateId);
        if (!alive) return;
        setTitle(t.title);
        setTags(t.goal_tags ?? []);
        // Single Description field: prefer current-locale value, fall
        // back to the other so editing a Chinese template in English
        // mode still shows the user's content.
        setDescription(
          (lang === "zh"
            ? t.short_desc_zh ?? t.short_desc_en
            : t.short_desc_en ?? t.short_desc_zh) ?? "",
        );
        setCoverUrl(t.cover_image_url ?? null);
        setVisibility(t.visibility ?? "private");
        setItems(itemsFromTemplate(t));
      } catch (e: any) {
        Alert.alert(
          tr("载入失败", "Failed to load"),
          e?.message ?? tr("请稍后再试", "Please try again"),
        );
      } finally {
        if (alive) setLoadingExisting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [templateId, tr, lang]);

  // ── Resolve display name + variants for any items that arrived
  // with an action_id but no cache (edit mode). Re-run guard: only
  // mutates items that are still missing data; otherwise the spread
  // returns the same `it` reference and React doesn't re-render. ───
  useEffect(() => {
    const need = new Set<string>();
    for (const it of items) {
      if (it.action_id && (it.displayName === null || it.variants === null)) {
        need.add(it.action_id);
      }
    }
    if (need.size === 0) return;
    let alive = true;
    Promise.all(
      Array.from(need).map(async (id) => {
        try {
          const detail = await exercisesApi.getExerciseDetail(id);
          return { id, detail };
        } catch {
          return { id, detail: null };
        }
      }),
    ).then((resolved) => {
      if (!alive) return;
      setItems((prev) =>
        prev.map((it) => {
          const hit = resolved.find((r) => r.id === it.action_id);
          if (!hit) return it;
          if (it.displayName !== null && it.variants !== null) return it;
          const name = hit.detail
            ? lang === "zh"
              ? hit.detail.name_zh
              : hit.detail.name_en
            : it.action_id;
          const nextDisplay = it.displayName ?? name;
          const nextVariants =
            it.variants ?? hit.detail?.protocol_variants ?? [];
          if (
            nextDisplay === it.displayName &&
            nextVariants === it.variants
          ) {
            return it;
          }
          return {
            ...it,
            displayName: nextDisplay,
            variants: nextVariants,
          };
        }),
      );
    });
    return () => {
      alive = false;
    };
  }, [items, lang]);

  // ── Picker handoff — proper subscriber pattern (NOT useFocusEffect).
  // formSheet dismiss back to parent stack does NOT fire focus on the
  // parent because the parent screen was never blurred (the sheet
  // overlaid it). useEffect on the store's result slot fires reliably
  // because Zustand notifies on any setState. ─────────────────────────
  const pickerResult = useExercisePickerHandoffStore((s) => s.result);
  useEffect(() => {
    // Defensive: pickerResult can be null after we cleared it (own
    // setResult) but before React re-runs the effect's cleanup — the
    // top-line null check handles both that race and React 18's strict
    // mode double-invoke.
    if (!pickerResult) return;
    if (pickerResult.targetId === "*") return;
    handlePickerResult(pickerResult.targetId, pickerResult.exercises);
    useExercisePickerHandoffStore.getState().setResult(null);
    // handlePickerResult is defined below with useCallback; React
    // tolerates the forward reference because the effect body runs
    // after the function declaration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerResult]);

  const fetchProtocolDefaults = useCallback(
    async (action_id: string) => {
      try {
        const detail = await exercisesApi.getExerciseDetail(action_id);
        return {
          protocol: detail.protocol,
          variants: detail.protocol_variants ?? [],
          displayName:
            lang === "zh" ? detail.name_zh : detail.name_en,
        };
      } catch {
        return null;
      }
    },
    [lang],
  );

  const handlePickerResult = useCallback(
    (targetId: string, exercises: ExerciseListItem[]) => {
      if (exercises.length === 0) return;
      // targetId formats:
      //   "add:<phase>"     — append N items to the given phase
      //   "<iIdx>:replace"  — swap exercise on existing item at iIdx
      const parts = targetId.split(":");
      const mode = parts[1] ?? "";

      if (mode === "replace") {
        const iIdx = parseInt(parts[0], 10);
        if (!Number.isFinite(iIdx)) return;
        const ex = exercises[0];
        const displayName = lang === "zh" ? ex.name_zh : ex.name_en;
        setItems((prev) =>
          prev.map((it, i) =>
            i !== iIdx
              ? it
              : {
                  ...it,
                  action_id: ex.id,
                  variant_id: null,
                  variants: null,
                  displayName,
                },
          ),
        );
        fetchProtocolDefaults(ex.id).then((res) => {
          if (!res) return;
          setItems((prev) =>
            prev.map((it, i) =>
              i !== iIdx || it.action_id !== ex.id
                ? it
                : applyProtocolDefaults(
                    { ...it, variants: res.variants },
                    res.protocol,
                  ),
            ),
          );
        });
        return;
      }

      if (parts[0] === "add") {
        const phase: Phase =
          parts[1] === "warmup" || parts[1] === "cooldown" ? parts[1] : "main";
        const newDrafts = exercises.map((ex) =>
          makeDraftItem(
            ex.id,
            lang === "zh" ? ex.name_zh : ex.name_en,
            phase,
          ),
        );
        setItems((prev) => [...prev, ...newDrafts]);
        // Fan-out detail fetches to auto-fill defaults per row.
        exercises.forEach((ex) => {
          fetchProtocolDefaults(ex.id).then((res) => {
            if (!res) return;
            setItems((prev) =>
              prev.map((it) => {
                if (it.action_id !== ex.id || it.variants !== null) return it;
                const pristine = it.sets.every(
                  (s) =>
                    s.reps == null &&
                    s.seconds == null &&
                    s.rest_per_set_sec == null &&
                    s.load == null,
                );
                if (!pristine) return it;
                return applyProtocolDefaults(
                  { ...it, variants: res.variants },
                  res.protocol,
                );
              }),
            );
          });
        });
      }
    },
    [lang, fetchProtocolDefaults],
  );

  // ── Header (Save in headerRight) ────────────────────────────────────
  // Stable callback reads latest closure via ref — fixes the
  // first-iteration stale-state bug where Save submitted whatever state
  // was captured at first render (= empty draft).
  const handleSaveRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    navigation.setOptions({
      title: isEdit
        ? tr("编辑模板", "Edit Template")
        : tr("新建模板", "New Template"),
      // X close on the top-left (Motra parity). Overrides the default
      // chevron-back from the library Stack — visually signals
      // "this is an edit/action screen, dismiss to cancel".
      headerBackVisible: false,
      headerLeft: () => (
        <HeaderButton icon="xmark" onPress={() => router.back()} />
      ),
    });
  }, [navigation, isEdit, lang, tr, router]);

  // ── Item / set mutators ─────────────────────────────────────────────
  const removeItem = (iIdx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== iIdx));

  const patchItem = (iIdx: number, patch: Partial<DraftItem>) =>
    setItems((prev) =>
      prev.map((it, i) => (i !== iIdx ? it : { ...it, ...patch })),
    );

  /** Toggle the item's collapsed state (tap title area). */
  const toggleCollapse = (iIdx: number) =>
    setItems((prev) =>
      prev.map((it, i) =>
        i !== iIdx ? it : { ...it, collapsed: !it.collapsed },
      ),
    );

  /** Add a new set to the item's set table — duplicates the last set's
   *  values so newly added sets carry the running prescription. */
  const addSet = (iIdx: number) =>
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== iIdx) return it;
        const last = it.sets[it.sets.length - 1] ?? emptySet();
        return { ...it, sets: [...it.sets, { ...last }] };
      }),
    );

  const removeSet = (iIdx: number, sIdx: number) =>
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== iIdx) return it;
        // Keep at least 1 set so the table never disappears.
        if (it.sets.length <= 1) return it;
        return { ...it, sets: it.sets.filter((_, k) => k !== sIdx) };
      }),
    );

  /** Patch a single set's field AND auto-align downward — every set
   *  after `sIdx` gets the same value. Editing row N is interpreted as
   *  "use this value for all subsequent sets too" (per user spec). */
  type SetField = keyof DraftSet;
  const patchSetAutoAlign = (
    iIdx: number,
    sIdx: number,
    field: SetField,
    value: number | null,
  ) =>
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== iIdx) return it;
        return {
          ...it,
          sets: it.sets.map((s, k) =>
            k >= sIdx ? { ...s, [field]: value } : s,
          ),
        };
      }),
    );

  // ── Picker openers ──────────────────────────────────────────────────
  const openPickerAdd = (phase: Phase = "main") => {
    useExercisePickerHandoffStore.getState().setRequest({
      targetId: `add:${phase}`,
      singleSelect: false,
    });
    router.push("/exercise-picker" as any);
  };
  const openPickerReplace = (iIdx: number) => {
    useExercisePickerHandoffStore.getState().setRequest({
      targetId: `${iIdx}:replace`,
      singleSelect: true,
    });
    router.push("/exercise-picker" as any);
  };

  // ── Cover image ─────────────────────────────────────────────────────
  const pickCover = useCallback(async () => {
    if (uploadingCover) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        tr("无权限", "Permission denied"),
        tr(
          "请在设置中允许访问照片",
          "Please allow photo library access in Settings",
        ),
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [3, 2],
    });
    if (res.canceled) return;
    const localUri = res.assets[0]?.uri;
    if (!localUri) return;
    setUploadingCover(true);
    try {
      const publicUrl = await uploadImageToR2(localUri, "covers");
      setCoverUrl(publicUrl);
    } catch (e: any) {
      Alert.alert(
        tr("上传失败", "Upload failed"),
        e?.message ?? tr("请稍后再试", "Please try again"),
      );
    } finally {
      setUploadingCover(false);
    }
  }, [uploadingCover, tr]);

  // ── Tags sheet (formSheet route, Variant 2 handoff) ─────────────────
  const tagsResult = useTagsPickerHandoffStore((s) => s.result);
  useEffect(() => {
    if (!tagsResult) return;
    if (tagsResult.targetId !== "template") return;
    setTags(tagsResult.tags);
    if (tagsResult.color) setTagColor(tagsResult.color);
    useTagsPickerHandoffStore.getState().setResult(null);
  }, [tagsResult]);

  const openTagsSheet = useCallback(() => {
    useTagsPickerHandoffStore.getState().setRequest({
      targetId: "template",
      initial: tags,
      presets: TEMPLATE_TAG_PRESETS,
      initialColor: tagColor,
    });
    router.push("/tags-picker" as any);
  }, [tags, tagColor, router]);

  // ── Value picker (wheel sheet) ──────────────────────────────────────
  type CellSpec =
    | { kind: "set"; iIdx: number; sIdx: number; field: SetField }
    | { kind: "item-rest-per-rep"; iIdx: number };

  const encodeCell = (spec: CellSpec): string => {
    if (spec.kind === "item-rest-per-rep") {
      return `${spec.iIdx}:item:rest_per_rep`;
    }
    return `${spec.iIdx}:set${spec.sIdx}:${spec.field}`;
  };

  const decodeCell = (targetId: string): CellSpec | null => {
    const parts = targetId.split(":");
    if (parts.length < 3) return null;
    const iIdx = parseInt(parts[0], 10);
    if (!Number.isFinite(iIdx)) return null;
    if (parts[1] === "item" && parts[2] === "rest_per_rep") {
      return { kind: "item-rest-per-rep", iIdx };
    }
    if (parts[1].startsWith("set")) {
      const sIdx = parseInt(parts[1].slice(3), 10);
      const field = parts[2] as SetField;
      if (!Number.isFinite(sIdx)) return null;
      return { kind: "set", iIdx, sIdx, field };
    }
    return null;
  };

  const openValuePicker = (
    spec: CellSpec,
    title: string,
    mode: "duration" | "count" | "load",
    initial: number,
    unitLabel?: string,
    max?: number,
    step?: number,
  ) => {
    useValuePickerHandoffStore.getState().setRequest({
      targetId: encodeCell(spec),
      title,
      mode,
      initial,
      unitLabel,
      max,
      step,
    });
    router.push("/value-picker" as any);
  };

  const valueResult = useValuePickerHandoffStore((s) => s.result);
  useEffect(() => {
    if (!valueResult) return;
    const spec = decodeCell(valueResult.targetId);
    useValuePickerHandoffStore.getState().setResult(null);
    if (!spec) return;
    if (spec.kind === "item-rest-per-rep") {
      patchItem(spec.iIdx, {
        rest_per_rep_sec: valueResult.value || null,
      });
      return;
    }
    patchSetAutoAlign(
      spec.iIdx,
      spec.sIdx,
      spec.field,
      valueResult.value || null,
    );
    // patchItem / patchSetAutoAlign are stable mutators defined above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valueResult]);

  // ── Inline UIMenu builders ─────────────────────────────────────────
  // Per `climbing_plan_generator/CLAUDE.md` → "Inline option menus",
  // pick-one-of-N content-area menus go through `MenuPill` (native
  // UIMenu popover) instead of `ActionSheetIOS`. Each builder returns
  // the `MenuOption[]` array consumed by MenuPill.
  const itemMenuOptions = (iIdx: number): MenuOption[] => {
    const item = items[iIdx];
    const moveOptions: MenuOption[] = PHASES.filter(
      (p) => p !== item?.phase,
    ).map((p) => ({
      label: tr("移到", "Move to") + " " + phaseLabel(p, tr),
      systemImage:
        p === "warmup"
          ? "flame"
          : p === "cooldown"
            ? "snowflake"
            : "bolt.fill",
      onPress: () => patchItem(iIdx, { phase: p }),
    }));
    return [
      {
        label: tr("更换动作", "Swap exercise"),
        systemImage: "arrow.triangle.2.circlepath",
        onPress: () => openPickerReplace(iIdx),
      },
      {
        label: tr("每次休息…", "Rest per rep…"),
        systemImage: "timer",
        onPress: () => {
          if (!item) return;
          openValuePicker(
            { kind: "item-rest-per-rep", iIdx },
            tr("每次休息", "Rest per rep"),
            "duration",
            item.rest_per_rep_sec ?? 0,
          );
        },
      },
      ...moveOptions,
      {
        label: tr("删除动作", "Delete exercise"),
        systemImage: "trash",
        destructive: true,
        onPress: () => removeItem(iIdx),
      },
    ];
  };

  const loadUnitMenuOptions = (iIdx: number): MenuOption[] => [
    {
      label: tr("磅 (lb)", "Pounds (lb)"),
      onPress: () => patchItem(iIdx, { loadUnit: "lb" }),
    },
    {
      label: tr("千克 (kg)", "Kilograms (kg)"),
      onPress: () => patchItem(iIdx, { loadUnit: "kg" }),
    },
    {
      label: tr("% 最大", "% Max"),
      onPress: () => patchItem(iIdx, { loadUnit: "pct" }),
    },
  ];

  // ── Save ────────────────────────────────────────────────────────────
  const buildPayload = (): WorkoutTemplateIn | null => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert(
        tr("缺少标题", "Title required"),
        tr("请填写模板标题", "Please give the template a title"),
      );
      return null;
    }
    if (trimmedTitle.length > 200) {
      Alert.alert(
        tr("标题过长", "Title too long"),
        tr("最多 200 字符", "Max 200 characters"),
      );
      return null;
    }
    // Stable phase-then-author order: group by phase rendering order,
    // preserving the user's authoring order within each phase. Same
    // sort the FE applies visually so the persisted shape matches what
    // the user sees.
    const phaseRank: Record<Phase, number> = {
      warmup: 0,
      main: 1,
      cooldown: 2,
    };
    const ordered = items
      .map((it, idx) => ({ it, idx }))
      .filter((x) => x.it.action_id)
      .sort((a, b) => {
        const pr = phaseRank[a.it.phase] - phaseRank[b.it.phase];
        return pr !== 0 ? pr : a.idx - b.idx;
      });
    const cleanItems: WorkoutItem[] = ordered.map(({ it }) => {
      // Flatten per-set rows into BE's single-row WorkoutItem shape.
      // Auto-align makes all sets share the same values in the
      // typical case; we take set[0]'s values as the canonical
      // prescription, with sets.length as the count.
      const first = it.sets[0] ?? emptySet();
      return {
        phase: it.phase,
        action_id: it.action_id,
        variant_id: it.variant_id ?? null,
        sets: it.sets.length,
        // Reps and Time are independent columns — both persisted.
        reps: first.reps,
        seconds: first.seconds,
        rest_sec: first.rest_per_set_sec,
        rest_per_rep_sec: it.rest_per_rep_sec,
        load: first.load,
        load_unit: first.load != null ? it.loadUnit : null,
        notes: null,
      };
    });
    if (cleanItems.length === 0) {
      Alert.alert(
        tr("空模板", "Empty template"),
        tr(
          "请至少添加一个动作",
          "Add at least one exercise before saving",
        ),
      );
      return null;
    }
    const desc = description.trim() || null;
    // Derive `equipment` as the subset of selected tags that match the
    // BE equipment vocabulary. TR6's `finalize_session` reads
    // `template.equipment ∩ {bouldering_wall, rope_wall}` to upgrade
    // on-wall training to `session_type='mixed'` — writing an empty
    // array here would silently collapse 4x4 / ARC / limit-boulder
    // templates into pure `'train'` and drop them from the Sessions
    // feed. Keep the derivation honest by sourcing from the same tag
    // slugs the user picked in the Tags sheet.
    const equipment = tags.filter((t) => EQUIPMENT_TAG_SLUGS.has(t));
    return {
      title: trimmedTitle,
      goal_tags: tags,
      equipment,
      items: cleanItems,
      // Write to the locale field; null the other so the displayed
      // language matches what the user typed.
      short_desc_zh: lang === "zh" ? desc : null,
      short_desc_en: lang === "en" ? desc : null,
      cover_image_url: coverUrl,
      visibility,
    };
  };

  const handleSavePress = async () => {
    if (saving) return;
    const payload = buildPayload();
    if (!payload) return;
    setSaving(true);
    try {
      let saved: WorkoutTemplateOut;
      if (isEdit && templateId) {
        const patch: WorkoutTemplateUpdateIn = payload;
        saved = await workoutsApi.update(templateId, patch);
      } else {
        saved = await workoutsApi.create(payload);
      }
      const summary: WorkoutTemplateSummary = {
        id: saved.id,
        title: saved.title,
        source: saved.source,
        goal_tags: saved.goal_tags,
        equipment: saved.equipment,
        est_duration_min: saved.est_duration_min,
        short_desc_zh: saved.short_desc_zh,
        short_desc_en: saved.short_desc_en,
        cover_image_url: saved.cover_image_url,
        author_name: saved.author_name,
      };
      useWorkoutTemplateStore.getState().upsertMine(summary);
      router.back();
    } catch (e: any) {
      Alert.alert(
        tr("保存失败", "Save failed"),
        e?.message ?? tr("请稍后再试", "Please try again"),
      );
    } finally {
      setSaving(false);
    }
  };
  // Keep ref aimed at the latest closure so the header's stable
  // onPress always reads current state.
  handleSaveRef.current = handleSavePress;

  if (loadingExisting) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.cardDark} />
      </View>
    );
  }

  return (
    <>
      {/* Native UIBarButtonItem checkmark with iOS 26 `prominent`
          variant — entire button background fills with tint
          (accent-tinted glass), icon renders on top in canvas color.
          Pre-iOS-26 silently falls back to plain. */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="checkmark"
          onPress={() => handleSaveRef.current()}
          disabled={saving}
          variant="prominent"
          tintColor={colors.accent}
        />
      </Stack.Toolbar>

      <ScrollView
        style={styles.container}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Cover */}
        <TouchableOpacity
          style={[
            styles.coverBox,
            !coverUrl && {
              backgroundColor: colors.backgroundSecondary,
            },
          ]}
          onPress={pickCover}
          disabled={uploadingCover}
          accessibilityRole="button"
          accessibilityLabel={tr("封面图", "Cover image")}
        >
          {coverUrl ? (
            <Image source={{ uri: coverUrl }} style={styles.coverImg} />
          ) : null}
          {uploadingCover ? (
            <View style={styles.coverOverlay}>
              <ActivityIndicator size="small" color="#FFF" />
            </View>
          ) : (
            <View style={styles.coverOverlay}>
              <Ionicons
                name={coverUrl ? "image" : "image-outline"}
                size={20}
                color="#FFF"
              />
              <Text style={styles.coverText}>
                {coverUrl
                  ? tr("更换封面", "Change cover")
                  : tr("添加封面（可选）", "Add cover (optional)")}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Title */}
        <SectionLabel
          tr={tr}
          zh="标题"
          en="Title"
          required
          colors={colors}
        />
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={setTitle}
          placeholder={tr(
            "如：周二指力训练",
            "e.g. Tuesday Fingerboard",
          )}
          placeholderTextColor={colors.textTertiary}
          maxLength={200}
        />

        {/* Description (single field) */}
        <SectionLabel
          tr={tr}
          zh="简介"
          en="Description"
          colors={colors}
        />
        <TextInput
          style={styles.multiline}
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder={tr(
            "可选 — 一两句话描述这套训练",
            "Optional — a line or two about this workout",
          )}
          placeholderTextColor={colors.textTertiary}
        />

        {/* Visibility — Motra-style settings row:
                  [eye icon]  Template Visibility   Public ▾
            Inside a white card the MenuPill is `chromeless` so the
            trigger doesn't paint a pill-in-a-pill — text + chevron
            inherit the row's surface. Native iOS UIMenu pops Private
            / Public anchored to the trigger. */}
        <SectionLabel
          tr={tr}
          zh="可见性"
          en="Visibility"
          colors={colors}
        />
        <View style={styles.settingsRow}>
          <Ionicons
            name="eye-outline"
            size={18}
            color={colors.textSecondary}
          />
          <View style={{ flex: 1 }} />
          <MenuPill
            variant="labeled"
            chromeless
            label={
              visibility === "public"
                ? tr("公开", "Public")
                : tr("私有", "Private")
            }
            options={[
              {
                label: tr("私有", "Private"),
                systemImage: "lock.fill",
                onPress: () => setVisibility("private"),
              },
              {
                label: tr("公开", "Public"),
                systemImage: "globe",
                onPress: () => setVisibility("public"),
              },
            ]}
            accessibilityLabel={tr("可见性", "Visibility")}
          />
        </View>

        {/* Tags (sheet) — no outer card. Existing tags render
            inline as chips alongside a dashed "Add Tag +" pill
            which doubles as the tap target + empty-state preview:
            an empty Tags section shows just the dashed pill at the
            real chip size so the user sees what a tag will look like. */}
        <SectionLabel tr={tr} zh="标签" en="Tags" colors={colors} />
        <View style={styles.tagsChipsRow}>
          {tags.map((t) => (
            <View
              key={t}
              style={[
                styles.tagChip,
                tagColor ? { backgroundColor: tagColor } : null,
              ]}
            >
              <Text style={styles.tagChipText}>
                {formatTagLabel(t, lang === "zh" ? "zh" : "en")}
              </Text>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addTagChip}
            onPress={openTagsSheet}
            accessibilityRole="button"
            accessibilityLabel={tr("添加标签", "Add Tag")}
          >
            <Text style={styles.addTagChipText}>
              {tr("添加标签", "Add Tag")}
            </Text>
            <Ionicons name="add" size={14} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Exercises — flat list, auto-sectioned by phase (warmup /
            main / cooldown). Phase headers only render when their
            group is non-empty. Moving an item to a different phase
            happens via its 3-dot menu, not a separate "block" object. */}
        <SectionLabel tr={tr} zh="动作" en="Exercises" colors={colors} />
        {PHASES.map((phase) => {
          const indexed = items
            .map((it, i) => ({ it, i }))
            .filter(({ it }) => it.phase === phase);
          if (indexed.length === 0) return null;
          return (
            <View key={phase} style={styles.phaseGroup}>
              <Text style={styles.phaseHeader}>{phaseLabel(phase, tr)}</Text>
              {indexed.map(({ it: item, i: iIdx }) => (
                <ItemEditor
                  key={iIdx}
                  item={item}
                  tr={tr}
                  colors={colors}
                  styles={styles}
                  onTapTitle={() => toggleCollapse(iIdx)}
                  onOpenThumbnail={() =>
                    router.push({
                      pathname: "/library/exercise-detail",
                      params: {
                        exerciseId: item.action_id,
                        context: "library",
                      },
                    } as any)
                  }
                  itemMenuOptions={itemMenuOptions(iIdx)}
                  loadUnitMenuOptions={loadUnitMenuOptions(iIdx)}
                  onPatchItem={(patch) => patchItem(iIdx, patch)}
                  onAddSet={() => addSet(iIdx)}
                  onRemoveSet={(sIdx) => removeSet(iIdx, sIdx)}
                  onOpenCellPicker={(sIdx, field) => {
                    const s = item.sets[sIdx];
                    if (!s) return;
                    if (field === "rest_per_set_sec") {
                      openValuePicker(
                        { kind: "set", iIdx, sIdx, field: "rest_per_set_sec" },
                        tr("休息时长", "Rest"),
                        "duration",
                        s.rest_per_set_sec ?? 0,
                      );
                    } else if (field === "reps") {
                      openValuePicker(
                        { kind: "set", iIdx, sIdx, field: "reps" },
                        tr("次数", "Reps"),
                        "count",
                        s.reps ?? 0,
                        tr("次", "reps"),
                        50,
                        1,
                      );
                    } else if (field === "seconds") {
                      openValuePicker(
                        { kind: "set", iIdx, sIdx, field: "seconds" },
                        tr("时长", "Time"),
                        "duration",
                        s.seconds ?? 0,
                      );
                    } else if (field === "load") {
                      openValuePicker(
                        { kind: "set", iIdx, sIdx, field: "load" },
                        tr("负荷", "Load"),
                        "load",
                        s.load ?? 0,
                        loadUnitLabel(item.loadUnit, tr),
                        item.loadUnit === "pct" ? 100 : 500,
                        5,
                      );
                    }
                  }}
                />
              ))}
            </View>
          );
        })}

        {/* Single Add Exercise CTA — mirrors itemCard layout so the
            empty state previews how tall a real exercise card will be.
            New items default to phase="main" (move via 3-dot menu). */}
        <TouchableOpacity
          style={styles.addExerciseBtn}
          onPress={() => openPickerAdd("main")}
          accessibilityRole="button"
          accessibilityLabel={tr("添加动作", "Add Exercise")}
        >
          <View style={styles.addExerciseThumb}>
            <Ionicons name="add" size={26} color={colors.accent} />
          </View>
          <Text style={styles.addExerciseText}>
            {tr("添加动作", "Add Exercise")}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* All numeric input goes through the generic value-picker
          formSheet (app/value-picker.tsx) — no TrueSheet siblings to
          mount here. Tags + exercise picker are formSheet routes too,
          so this component owns ScrollView only. */}
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────

function SectionLabel({
  tr,
  zh,
  en,
  required,
  colors,
}: {
  tr: (zh: string, en: string) => string;
  zh: string;
  en: string;
  required?: boolean;
  colors: ReturnType<typeof useThemeColors>;
}) {
  return (
    <Text
      style={{
        marginTop: 20,
        marginBottom: 8,
        fontSize: 12,
        letterSpacing: 1,
        textTransform: "uppercase",
        color: colors.textTertiary,
        fontFamily: theme.fonts.bold,
      }}
    >
      {tr(zh, en)}
      {required ? " *" : ""}
    </Text>
  );
}

type CellField = "rest_per_set_sec" | "reps" | "seconds" | "load";

function ItemEditor({
  item,
  tr,
  colors,
  styles,
  onTapTitle,
  onOpenThumbnail,
  itemMenuOptions,
  loadUnitMenuOptions,
  onPatchItem,
  onAddSet,
  onRemoveSet,
  onOpenCellPicker,
}: {
  item: DraftItem;
  tr: (zh: string, en: string) => string;
  colors: ReturnType<typeof useThemeColors>;
  styles: ReturnType<typeof createStyles>;
  onTapTitle: () => void;
  onOpenThumbnail: () => void;
  itemMenuOptions: MenuOption[];
  loadUnitMenuOptions: MenuOption[];
  onPatchItem: (patch: Partial<DraftItem>) => void;
  onAddSet: () => void;
  onRemoveSet: (sIdx: number) => void;
  onOpenCellPicker: (sIdx: number, field: CellField) => void;
}) {
  const variantOptions = item.variants ?? [];
  const initial = (item.displayName || item.action_id || "?").charAt(0).toUpperCase();

  // Subtitle = "N Sets" with " · Xs rest/rep" appended when set, so
  // the rest-per-rep value lives next to the set count rather than
  // taking its own row. Set via the 3-dot menu "Rest per rep…".
  const setsPart = `${item.sets.length} ${
    item.sets.length === 1 ? tr("组", "Set") : tr("组", "Sets")
  }`;
  const rprPart =
    item.rest_per_rep_sec && item.rest_per_rep_sec > 0
      ? ` · ${formatDurationDisplay(item.rest_per_rep_sec)} ${tr("每次休息", "rest/rep")}`
      : "";
  const subtitle = setsPart + rprPart;

  return (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <TouchableOpacity
          style={styles.itemThumb}
          onPress={onOpenThumbnail}
          accessibilityRole="button"
          accessibilityLabel={tr("查看详情", "View details")}
        >
          <Text style={styles.itemThumbInitial}>{initial}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.itemTitleZone}
          onPress={onTapTitle}
          accessibilityRole="button"
          accessibilityLabel={`${item.displayName ?? item.action_id} — ${
            item.collapsed ? tr("展开", "expand") : tr("收起", "collapse")
          }`}
        >
          <Text style={styles.itemTitle} numberOfLines={1}>
            {item.displayName || item.action_id || tr("选择动作", "Pick exercise")}
          </Text>
          <Text style={styles.itemSubtitle}>{subtitle}</Text>
        </TouchableOpacity>

        <MenuPill
          variant="dots"
          options={itemMenuOptions}
          style={styles.itemMoreBtn}
          accessibilityLabel={tr("更多", "More")}
        />
      </View>

      {item.collapsed ? null : (
        <View style={styles.itemBody}>
          {variantOptions.length > 0 ? (
            <View style={styles.variantRow}>
              <TouchableOpacity
                style={[
                  styles.variantPill,
                  item.variant_id === null && styles.variantPillActive,
                ]}
                onPress={() => onPatchItem({ variant_id: null })}
                hitSlop={SMALL_PILL_HIT_SLOP}
                accessibilityRole="button"
                accessibilityState={{ selected: item.variant_id === null }}
              >
                <Text
                  style={[
                    styles.variantText,
                    item.variant_id === null && styles.variantTextActive,
                  ]}
                >
                  {tr("默认", "Default")}
                </Text>
              </TouchableOpacity>
              {variantOptions.map((v) => {
                const active = item.variant_id === v.id;
                return (
                  <TouchableOpacity
                    key={v.id}
                    style={[
                      styles.variantPill,
                      active && styles.variantPillActive,
                    ]}
                    onPress={() => onPatchItem({ variant_id: v.id })}
                    hitSlop={SMALL_PILL_HIT_SLOP}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={v.label_en}
                  >
                    <Text
                      style={[
                        styles.variantText,
                        active && styles.variantTextActive,
                      ]}
                    >
                      {tr(v.label_zh, v.label_en)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {/* Column headers: Set | Rest | Reps | Time | Load▾.
              Reps and Time are independent columns (no shared toggle).
              Only Load▾ is a tappable pill (MenuPill labeled). */}
          <View style={styles.setHeaderRow}>
            <Text style={[styles.setCol, styles.colSet, styles.setHeaderText]} numberOfLines={1}>
              {tr("组", "Set")}
            </Text>
            <Text style={[styles.setCol, styles.colRest, styles.setHeaderText]} numberOfLines={1}>
              {tr("休息", "Rest")}
            </Text>
            <Text style={[styles.setCol, styles.colReps, styles.setHeaderText]} numberOfLines={1}>
              {tr("次数", "Reps")}
            </Text>
            <Text style={[styles.setCol, styles.colTime, styles.setHeaderText]} numberOfLines={1}>
              {tr("时长", "Time")}
            </Text>
            <View style={[styles.setCol, styles.colLoad, { alignItems: "center" }]}>
              <MenuPill
                variant="labeled"
                label={loadUnitLabel(item.loadUnit, tr)}
                options={loadUnitMenuOptions}
                accessibilityLabel={tr("切换负荷单位", "Switch load unit")}
              />
            </View>
          </View>

          {item.sets.map((s, sIdx) => {
            const cellText = (v: number | null, isDuration: boolean) =>
              v == null || v <= 0 ? "—" : isDuration ? formatDurationDisplay(v) : String(v);
            return (
              <ReanimatedSwipeable
                key={sIdx}
                friction={2}
                rightThreshold={50}
                renderRightActions={() => (
                  <TouchableOpacity
                    style={styles.swipeDeleteBtn}
                    onPress={() => onRemoveSet(sIdx)}
                    accessibilityRole="button"
                    accessibilityLabel={tr("删除组", "Delete set")}
                  >
                    <Text style={styles.swipeDeleteText}>
                      {tr("删除", "Delete")}
                    </Text>
                  </TouchableOpacity>
                )}
              >
                <View style={styles.setRow}>
                  <Text style={[styles.setCol, styles.colSet, styles.setIndex]}>
                    {sIdx + 1}
                  </Text>
                  <TouchableOpacity
                    style={[styles.setCol, styles.colRest, styles.cellBtn]}
                    onPress={() => onOpenCellPicker(sIdx, "rest_per_set_sec")}
                  >
                    <Text style={styles.cellText}>
                      {cellText(s.rest_per_set_sec, true)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.setCol, styles.colReps, styles.cellBtn]}
                    onPress={() => onOpenCellPicker(sIdx, "reps")}
                  >
                    <Text style={styles.cellText}>{cellText(s.reps, false)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.setCol, styles.colTime, styles.cellBtn]}
                    onPress={() => onOpenCellPicker(sIdx, "seconds")}
                  >
                    <Text style={styles.cellText}>{cellText(s.seconds, true)}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.setCol, styles.colLoad, styles.cellBtn]}
                    onPress={() => onOpenCellPicker(sIdx, "load")}
                  >
                    <Text style={styles.cellText}>{cellText(s.load, false)}</Text>
                  </TouchableOpacity>
                </View>
              </ReanimatedSwipeable>
            );
          })}

          <TouchableOpacity
            style={styles.addSetBtn}
            onPress={onAddSet}
            accessibilityRole="button"
            accessibilityLabel={tr("添加组", "Add Set")}
          >
            <Ionicons name="add" size={18} color={colors.textPrimary} />
            <Text style={styles.addSetText}>{tr("添加组", "Add Set")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────

const createStyles = (colors: ReturnType<typeof useThemeColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { alignItems: "center", justifyContent: "center" },

    coverBox: {
      marginTop: 16,
      // 16:9 small banner — large enough to read the placeholder
      // label, compact enough not to dominate the form.
      height: 96,
      borderRadius: 18,
      overflow: "hidden",
      backgroundColor: colors.backgroundSecondary,
    },
    coverImg: {
      ...StyleSheet.absoluteFillObject,
      width: "100%",
      height: "100%",
    },
    coverOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: "rgba(0,0,0,0.25)",
    },
    coverText: {
      color: "#FFF",
      fontFamily: theme.fonts.bold,
      fontSize: 13,
      fontWeight: "700",
    },

    // Title is single-line — capsule radius. Inputs / tags use pure
    // white (cardBackground) so they pop above the warm pearl page bg
    // with a clear "elevated" feel. minHeight = 44 per Apple HIG
    // primary-interaction touch target.
    titleInput: {
      backgroundColor: colors.cardBackground,
      borderRadius: 999,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 44,
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      color: colors.textPrimary,
    },

    multiline: {
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 64,
      textAlignVertical: "top",
      fontSize: 14,
      color: colors.textPrimary,
      fontFamily: theme.fonts.regular,
    },

    pillRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    pillActive: {
      backgroundColor: colors.cardDark,
      borderColor: colors.cardDark,
    },
    pillText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    pillTextActive: {
      color: "#FFF",
      fontWeight: "700",
    },

    // Motra-style settings row — white card, icon + label on the
    // left, trailing dropdown trigger. Matches Apple's Settings.app
    // row anatomy (44pt min height, 16pt insets).
    settingsRow: {
      flexDirection: "row",
      alignItems: "center",
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 8,
      backgroundColor: colors.cardBackground,
      borderRadius: 18,
    },
    settingsRowLabel: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
      fontFamily: theme.fonts.medium,
      fontWeight: "600",
    },
    tagsChipsRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    tagChip: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.cardDark,
    },
    tagChipText: {
      color: "#FFF",
      fontFamily: theme.fonts.medium,
      fontWeight: "600",
      fontSize: 12,
    },
    // Tinted placeholder pill — same outer proportions as tagChip
     // so it sits flush in the chip row + previews real tag size
     // when the section is empty. iOS "tinted button" anatomy:
     // muted neutral fill (no border) carries the affordance via
     // accent-colored text + plus icon. Clean alternative to a
     // dashed outline.
    addTagChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.backgroundSecondary,
    },
    addTagChipText: {
      color: colors.accent,
      fontFamily: theme.fonts.bold,
      fontWeight: "700",
      fontSize: 12,
    },

    // Phase group — flat container. Header is a small uppercase tag
    // (matches SectionLabel cadence) sitting above the item cards in
    // that phase.
    phaseGroup: {
      marginTop: 12,
    },
    phaseHeader: {
      marginTop: 8,
      marginBottom: 4,
      fontSize: 13,
      letterSpacing: 0.5,
      color: colors.textSecondary,
      fontFamily: theme.fonts.bold,
      fontWeight: "700",
    },
    iconBtn: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
    },

    // Item card — Apple HIG cards spec uses larger continuous corners
    // (16-22pt) for grouped content surfaces. Bumped from 12 → 22 for
    // a more "rounded" iOS 26 feel.
    itemCard: {
      marginTop: 12,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 14,
      // Pure white — pops above the warm pearl page bg for clear
      // visual emphasis. cardBackground (#FFFFFF) is the dedicated
      // light-mode card token.
      backgroundColor: colors.cardBackground,
      borderRadius: 22,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },

    // Header: thumbnail + title zone + 3-dot menu
    itemHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
      paddingRight: 4,
    },
    itemThumb: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    itemThumbInitial: {
      fontSize: 22,
      fontFamily: theme.fonts.black,
      color: colors.textSecondary,
    },
    itemTitleZone: {
      flex: 1,
    },
    itemTitle: {
      fontSize: 16,
      fontFamily: theme.fonts.bold,
      fontWeight: "800",
      color: colors.textPrimary,
    },
    itemSubtitle: {
      marginTop: 3,
      fontSize: 13,
      color: colors.textSecondary,
      fontFamily: theme.fonts.medium,
    },
    // Apple HIG 44pt tap target. MenuPill dots variant intentionally
    // skips `matchContents` so the SwiftUI Menu fills this fixed RN
    // frame instead of intrinsic-sizing back to the 18pt icon — that
    // prevented a jitter where the icon would bob up/down when the
    // ScrollView was scrolled right after dismissing the menu.
    itemMoreBtn: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },

    itemBody: {
      paddingTop: 4,
      paddingBottom: 8,
    },

    variantRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6,
      marginTop: 4,
      marginBottom: 8,
    },
    variantPill: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: colors.backgroundSecondary,
      borderWidth: 0.5,
      borderColor: colors.border,
    },
    variantPillActive: {
      backgroundColor: colors.cardDark,
      borderColor: colors.cardDark,
    },
    variantText: {
      fontSize: 12,
      fontFamily: theme.fonts.medium,
      color: colors.textSecondary,
    },
    variantTextActive: {
      color: "#FFF",
      fontWeight: "700",
    },

    // Set table — Set | Rest | Reps | Time | Load | (remove)
    setHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 4,
      paddingBottom: 6,
    },
    setRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 4,
      marginBottom: 6,
    },
    setCol: {
      paddingHorizontal: 3,
    },
    // 5-column layout: Set | Rest | Reps | Time | Load▾
    // colSet wider than the digit content because the header label
    // "Set" / "组" needs ~34pt at 11pt bold to render on one line.
    colSet: { width: 34, alignItems: "center" },
    colRest: { flex: 1.1 },
    colReps: { flex: 0.85 },
    colTime: { flex: 0.95 },
    colLoad: { flex: 1.1 },
    // Headers match the cell-button text style (font + weight + size)
    // so the column reads as one visual unit. Color is muted because
    // the labels are non-interactive.
    setHeaderText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontFamily: theme.fonts.medium,
      textAlign: "center",
    },
    // Small solid-grey pill used on tappable column headers
    // (currently just Load▾). Visually distinguishes "tap to change"
    // from the plain non-interactive labels.
    headerPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.backgroundSecondary,
    },
    headerPillText: {
      fontSize: 11,
      color: colors.textPrimary,
      fontFamily: theme.fonts.bold,
      fontWeight: "700",
      letterSpacing: 0.4,
      textTransform: "uppercase",
    },
    swipeDeleteBtn: {
      backgroundColor: "#FF3B30",
      paddingHorizontal: 22,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 6,
      borderRadius: 999,
    },
    swipeDeleteText: {
      color: "#FFF",
      fontFamily: theme.fonts.bold,
      fontWeight: "800",
      fontSize: 14,
    },
    setIndex: {
      fontSize: 14,
      color: colors.textTertiary,
      fontFamily: theme.fonts.medium,
      textAlign: "center",
    },
    // Cell — white fill + hairline border. Less visually loud than
    // the old grey capsule pill (the data inside is what should pop,
    // not the cell chrome). Squarer corners (8pt) feel "tabular"
    // vs the previous 999pt full pill; still well within Apple HIG
    // for grouped data cells. 44pt min for tap target.
    cellBtn: {
      backgroundColor: colors.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 8,
      paddingVertical: 10,
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      marginHorizontal: 2,
    },
    cellText: {
      fontSize: 14,
      color: colors.textPrimary,
      fontFamily: theme.fonts.medium,
    },
    // "Add Set" inside the item body — filled grey capsule stretching
    // the card width. Single-line CTA → full pill radius + 44pt
    // minHeight (Apple HIG).
    addSetBtn: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      paddingVertical: 12,
      minHeight: 44,
      borderRadius: 999,
      backgroundColor: colors.backgroundSecondary,
    },
    addSetText: {
      color: colors.textPrimary,
      fontFamily: theme.fonts.medium,
      fontWeight: "500",
      fontSize: 14,
    },
    // Empty-state version of itemCard — same outer dimensions
     // (radius 22, paddingX 14, full-width) + dashed accent border
     // so it reads as a placeholder. Thumbnail mirrors itemThumb
     // (56×56, radius 16) so the user sees how tall a real
     // exercise card will be.
    addExerciseBtn: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      borderRadius: 22,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: colors.accent,
      backgroundColor: "transparent",
    },
    addExerciseThumb: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: colors.backgroundSecondary,
      alignItems: "center",
      justifyContent: "center",
    },
    addExerciseText: {
      color: colors.accent,
      fontFamily: theme.fonts.bold,
      fontSize: 15,
    },

  });
