// src/services/sessionStats.ts
// B2-FU: shared aggregator for active-session stats (route count / sends /
// attempts / best grade). Single source of truth used by both:
//   - TodayDetailsList (Journal tab → Live Activity stats push effect)
//   - enqueueRouteSendLog / enqueueRouteAttemptLog (catalog log → LA push)
//
// Aggregation rules mirror TodayDetailsList's prior inlined logic so behavior
// remains identical when callers swap to this helper.

import { readSessionList } from "../features/journal/loglist/storage";
import { gradeToScore } from "../lib/gradeSystem";

// storage stores three buckets ("boulder" | "toprope" | "lead"); rope-style
// (toprope/lead) share the 5.X grade pool for "best" extraction.
export type SessionWallType = "boulder" | "toprope" | "lead";

export interface SessionStats {
  routeCount: number;
  sends: number;
  attempts: number;
  best: string;
}

const EMPTY: SessionStats = { routeCount: 0, sends: 0, attempts: 0, best: "" };

function isSendItem(it: any): boolean {
  const sendCount = it?.sendCount;
  if (typeof sendCount === "number") return sendCount > 0;
  // Older items missing sendCount: infer from style.
  const style = it?.style;
  return style === "redpoint" || style === "flash" || style === "onsight";
}

function pickBestSentGrade(sentGrades: string[], wallType: SessionWallType): string {
  if (sentGrades.length === 0) return "";
  // Use the unified gradeToScore (mirrors backend) so 5.10b > 5.8 properly.
  // Items that fail to parse (corrupt / cross-system) drop out silently.
  const system = wallType === "boulder" ? "vscale" : "yds";
  let bestText = "";
  let bestScore = -Infinity;
  for (const g of sentGrades) {
    try {
      const score = gradeToScore(g, system);
      if (score > bestScore) {
        bestScore = score;
        bestText = g;
      }
    } catch {
      // skip
    }
  }
  return bestText;
}

export async function computeSessionStats(
  sessionKey: string,
  wallType: SessionWallType,
): Promise<SessionStats> {
  if (!sessionKey) return EMPTY;
  const items = await readSessionList(sessionKey, wallType);
  if (items.length === 0) return EMPTY;

  let sends = 0;
  let attempts = 0;
  // bestGrade only considers SENT routes (B2-FU follow-up). An attempt at
  // 5.8 must not eclipse a sent 5.10b in the LA "Best" cell.
  const sentGrades: string[] = [];
  for (const it of items) {
    const sendCount = (it as any)?.sendCount;
    if (typeof sendCount === "number") {
      sends += sendCount;
    } else {
      const style = (it as any)?.style;
      if (style === "redpoint" || style === "flash" || style === "onsight") sends += 1;
    }
    attempts += (it as any)?.attemptsTotal ?? (it as any)?.attempts ?? 1;
    if (isSendItem(it)) {
      const g = String(it?.grade || "").trim();
      if (g) sentGrades.push(g);
    }
  }

  return {
    routeCount: items.length,
    sends,
    attempts,
    best: pickBestSentGrade(sentGrades, wallType),
  };
}
