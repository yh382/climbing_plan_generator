// src/features/profile/components/basicinfo/utils.ts

import { FingerStrength } from "./types";

export function computeApeIndexCm(height: number | null, armSpan: number | null) {
  if (height == null || armSpan == null) return null;
  return armSpan - height;
}

function edgeFactor(edgeMm: 10 | 15 | 20 | null) {
  if (edgeMm === 10) return 1.25;
  if (edgeMm === 15) return 1.1;
  if (edgeMm === 20) return 1.0;
  return 1.0;
}

function gripFactor(grip: FingerStrength["grip"]) {
  if (grip === "half_crimp") return 1.0;
  if (grip === "open_hand") return 1.08;
  return 1.0;
}

function timeFactor(hangSeconds: number | null) {
  // gentle normalization around 10s
  if (hangSeconds == null) return 1.0;
  const ratio = hangSeconds / 10.0;
  const clamped = Math.max(0.7, Math.min(1.3, ratio));
  return Math.sqrt(clamped);
}

export function computeFSI(
  bodyWeightKg: number | null,
  finger: FingerStrength | null
): number | null {
  if (!finger) return null;
  if (bodyWeightKg == null || bodyWeightKg <= 0) return null;

  const edge = finger.edge_mm ?? null;
  const grip = finger.grip ?? null;

  // ✅ support both new + legacy fields
  const added =
    (finger as any)?.added_weight_kg ??
    (finger as any)?.added_kg ??
    null;

  const hangSeconds =
    (finger as any)?.hang_seconds ??
    (finger as any)?.hang_s ??
    null;

  if (edge == null || grip == null || added == null) return null;

  const totalLoad = bodyWeightKg + added;
  if (totalLoad <= 0) return null;

  const base = totalLoad / bodyWeightKg;
  const fsi = base * edgeFactor(edge) * gripFactor(grip) * timeFactor(hangSeconds);

  return Math.round(fsi * 100) / 100;
}

export function formatGrip(grip: FingerStrength["grip"]) {
  if (grip === "half_crimp") return "Half Crimp";
  if (grip === "open_hand") return "Open Hand";
  return "—";
}
