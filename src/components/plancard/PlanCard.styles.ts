// src/components/plancard/PlanCard.styles.ts

import type { TrainingType, PlanSource, PlanVisibility, PlanStatus } from "./PlanCard.types";

export type PlanCardTheme = {
  bg: string;
  fg: string; // primary text
  sub: string; // secondary text
  pillBg: string;
  pillFg: string;
  border: string;
};

export const planThemeByTrainingType = (type: TrainingType): PlanCardTheme => {
  // Keep it simple & consistent. You can tune colors later.
  switch (type) {
    case "strength":
      return { bg: "#111827", fg: "#FFFFFF", sub: "rgba(255,255,255,0.75)", pillBg: "rgba(255,255,255,0.14)", pillFg: "#FFFFFF", border: "rgba(255,255,255,0.10)" };
    case "endurance":
      return { bg: "#0F766E", fg: "#FFFFFF", sub: "rgba(255,255,255,0.75)", pillBg: "rgba(255,255,255,0.14)", pillFg: "#FFFFFF", border: "rgba(255,255,255,0.10)" };
    case "power":
      return { bg: "#7C2D12", fg: "#FFFFFF", sub: "rgba(255,255,255,0.75)", pillBg: "rgba(255,255,255,0.14)", pillFg: "#FFFFFF", border: "rgba(255,255,255,0.10)" };
    case "mobility":
      return { bg: "#4338CA", fg: "#FFFFFF", sub: "rgba(255,255,255,0.75)", pillBg: "rgba(255,255,255,0.14)", pillFg: "#FFFFFF", border: "rgba(255,255,255,0.10)" };
    case "recovery":
      return { bg: "#1F2937", fg: "#FFFFFF", sub: "rgba(255,255,255,0.75)", pillBg: "rgba(255,255,255,0.14)", pillFg: "#FFFFFF", border: "rgba(255,255,255,0.10)" };
    case "technique":
      return { bg: "#4B5563", fg: "#FFFFFF", sub: "rgba(255,255,255,0.75)", pillBg: "rgba(255,255,255,0.14)", pillFg: "#FFFFFF", border: "rgba(255,255,255,0.10)" };
    case "mixed":
    default:
      return { bg: "#111827", fg: "#FFFFFF", sub: "rgba(255,255,255,0.75)", pillBg: "rgba(255,255,255,0.14)", pillFg: "#FFFFFF", border: "rgba(255,255,255,0.10)" };
  }
};

export const sourceLabel = (source: PlanSource) => {
  switch (source) {
    case "ai":
      return "AI";
    case "custom":
      return "Custom";
    case "official":
      return "Official";
    default:
      return "Plan";
  }
};

export const visibilityLabel = (v: PlanVisibility) => (v === "public" ? "Public" : "Private");
export const statusLabel = (s: PlanStatus) => {
  switch (s) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "completed":
      return "Completed";
    default:
      return "Plan";
  }
};

export const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
