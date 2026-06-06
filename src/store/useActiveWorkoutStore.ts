// src/store/useActiveWorkoutStore.ts
//
// Tracks the one active workout session (timer + minimized state + items).
//
// TR4 changes:
// - Typed `sessionData: WorkoutItem[]` (was `any[]`). Item shape locked
//   for both legacy plan-driven and new template-driven flows.
// - New `startFromTemplate(templateId, templateData, variantSelections?)`.
//   templateData is **caller-injected** — store does NOT cross-import
//   useWorkoutTemplateStore (codebase rule: stores cannot import other
//   stores; pass data through hooks/services instead).
// - `templateId` surfaced as state so finalize_session POST can attach
//   it (TR4 Phase 4 finalize hook).
// - `startWorkout(title, data, sessionJson?)` retained for plan-view's
//   legacy PlanV3 launch path; will be removed alongside PlanView in a
//   future cleanup once TR3 Plan V4 takes over.
import { create } from 'zustand';

import {
  bootstrapTemplateSession,
  endTemplateSession,
} from '../features/workouts/sessionBootstrap';
import type { WorkoutTemplateOut } from '../features/workouts/types';

// ── Item shape ─────────────────────────────────────────────────────────

/** Bilingual label (zh/en) — matches the legacy {en,zh} convention used
 *  by name_override / display fields across the app. */
export type WorkoutItemLabel = { zh?: string; en: string };

/** One step in an active workout. Both plan-driven (legacy PlanV3
 *  SessionBlock item under `raw`) and template-driven (WorkoutItem
 *  under `raw` + `templatePhase` for context) share this shape so the
 *  execution screen can stay format-agnostic. */
export type WorkoutItem = {
  label: WorkoutItemLabel;
  /** Underlying item — legacy PlanV3 SessionBlockItem or new template
   *  WorkoutItem. Kept loose because consumers only read display fields. */
  raw: Record<string, unknown>;
  completed: boolean;
  /** Selected ProtocolVariant.id (TR1). Null = base protocol. */
  variantId?: string | null;
  /** Workout phase ("warmup" / "main" / "cooldown") when launched from
   *  a template. Plan-driven flow leaves this undefined. */
  templatePhase?: string;
};

// ── Store ──────────────────────────────────────────────────────────────

interface ActiveWorkoutState {
  isActive: boolean;
  isMinimized: boolean;
  isPaused: boolean;
  seconds: number;

  sessionData: WorkoutItem[];
  sessionTitle: string;
  /** Serialized PlanV3 session payload for the floating widget's resume
   *  navigation (legacy plan-view path only). New template-launched
   *  flows leave this empty and rely on `templateId`. */
  sessionJson: string;

  /** TR4: when launched from a WorkoutTemplate, the source template id —
   *  passed to BE on session finalize so climb_session.template_id is
   *  populated, enabling TR7 BodyAreaBalance JOIN. Null for legacy
   *  plan-driven launches. */
  templateId: string | null;

  /** TR5/TR4-FU: BE-returned session id when bootstrapTemplateSession
   *  succeeds. Used to POST /sessions/{id}/end on finishWorkout so
   *  finalize_session runs and writes session_type / summary. Null when
   *  the bootstrap call failed (offline / 5xx) — we still let the FE
   *  flow finish, just without the BE row. */
  bootstrapSessionId: string | null;

  // Actions
  /** Legacy: launch from a PlanV3 today-session. PlanView callsite. */
  startWorkout: (title: string, data: WorkoutItem[], sessionJson?: string) => void;

  /** TR4: launch from a WorkoutTemplate. Template data is caller-
   *  injected (avoid store-to-store import). `variantSelections` is a
   *  Map of action_id → variant_id captured during template browse. */
  startFromTemplate: (
    templateId: string,
    templateData: WorkoutTemplateOut,
    variantSelections?: Record<string, string>,
  ) => void;

  pauseWorkout: () => void;
  resumeWorkout: () => void;
  minimizeWorkout: () => void;
  maximizeWorkout: () => void;
  finishWorkout: () => void;
  tick: () => void;
  updateSessionData: (data: WorkoutItem[]) => void;
}

// ── Helper: flatten a WorkoutTemplate into WorkoutItem[] ───────────────

function expandTemplateToItems(
  template: WorkoutTemplateOut,
  variantSelections: Record<string, string> = {},
): WorkoutItem[] {
  const items: WorkoutItem[] = [];
  // FE preserves user-defined order across phases — phase grouping is a
  // visual concern only. (BE's flat list already sits in that user order.)
  for (const it of template.items ?? []) {
    items.push({
      // Action_id is the only stable label available without joining
      // exercise rows. Caller (exercise execution screen) can re-resolve
      // the human-readable name via exercisesApi.getExerciseDetail.
      label: { en: it.action_id, zh: it.action_id },
      raw: it as unknown as Record<string, unknown>,
      completed: false,
      variantId: it.variant_id ?? variantSelections[it.action_id] ?? null,
      templatePhase: it.phase,
    });
  }
  return items;
}

const useActiveWorkoutStore = create<ActiveWorkoutState>((set, get) => ({
  isActive: false,
  isMinimized: false,
  isPaused: false,
  seconds: 0,
  sessionData: [],
  sessionTitle: '',
  sessionJson: '',
  templateId: null,
  bootstrapSessionId: null,

  startWorkout: (title, data, sessionJson) => set({
    isActive: true,
    isMinimized: false,
    isPaused: false,
    seconds: 0,
    sessionTitle: title,
    sessionData: data,
    sessionJson: sessionJson || '',
    templateId: null, // legacy path — no template linkage
    bootstrapSessionId: null,
  }),

  startFromTemplate: (templateId, templateData, variantSelections) => {
    // Fire-and-forget BE bootstrap. We don't await the network because
    // the FE timer must respond instantly; when the POST resolves we
    // patch the resulting session id into the store so finishWorkout
    // can hit /sessions/{id}/end. If the call fails we leave
    // bootstrapSessionId null and the finalize-session linkage is lost
    // for this run — acceptable in the no-users phase per ROADMAP.
    set({
      isActive: true,
      isMinimized: false,
      isPaused: false,
      seconds: 0,
      sessionTitle: templateData.title,
      sessionData: expandTemplateToItems(templateData, variantSelections),
      sessionJson: '', // template flow uses templateId for resume, not blob
      templateId,
      bootstrapSessionId: null,
    });
    bootstrapTemplateSession(templateId).then((id) => {
      // Guard against a finish or new launch happening in the meantime —
      // only attach the id if the current launch's templateId still
      // matches what we kicked off the network for.
      if (id && get().templateId === templateId && get().isActive) {
        set({ bootstrapSessionId: id });
      }
    });
  },

  pauseWorkout: () => set({ isPaused: true }),
  resumeWorkout: () => set({ isPaused: false }),

  minimizeWorkout: () => set({ isMinimized: true }),
  maximizeWorkout: () => set({ isMinimized: false }),

  finishWorkout: () => {
    // Close out BE session before clearing local state so the id is
    // still available. Fire-and-forget — failing here just means BE
    // won't have a 'completed' row but the FE shows the workout done.
    const id = get().bootstrapSessionId;
    if (id) {
      endTemplateSession(id);
    }
    set({
      isActive: false,
      isMinimized: false,
      seconds: 0,
      templateId: null,
      bootstrapSessionId: null,
    });
  },

  tick: () => set((state) => ({
    seconds: state.isActive && !state.isPaused ? state.seconds + 1 : state.seconds,
  })),

  updateSessionData: (data) => set({ sessionData: data }),
}));

export default useActiveWorkoutStore;
