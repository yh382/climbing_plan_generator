import type { ComponentType } from "react";
import BoulderIcon from "./BoulderIcon";
import TopRopeIcon from "./TopRopeIcon";
import LeadIcon from "./LeadIcon";

export type ClimbingTypeKey = "boulder" | "toprope" | "lead";

/** Fixed display order */
const ORDERED_KEYS: ClimbingTypeKey[] = ["boulder", "toprope", "lead"];

/** Maps equipment values → climbing type key */
const EQUIPMENT_TO_TYPE: Record<string, ClimbingTypeKey> = {
  bouldering_wall: "boulder",
  training_board: "boulder",
  top_rope_wall: "toprope",
  lead_wall: "lead",
};

/** Icon components keyed by climbing type */
export const CLIMBING_TYPE_ICON: Record<
  ClimbingTypeKey,
  ComponentType<{ size?: number; color?: string }>
> = {
  boulder: BoulderIcon,
  toprope: TopRopeIcon,
  lead: LeadIcon,
};

/**
 * Given an equipment array, returns the unique climbing type keys
 * that should be displayed, in a fixed order (boulder → toprope → lead).
 */
export function getClimbingTypeIcons(equipment?: string[]): ClimbingTypeKey[] {
  if (!equipment?.length) return [];
  const set = new Set<ClimbingTypeKey>();
  for (const e of equipment) {
    const key = EQUIPMENT_TO_TYPE[e];
    if (key) set.add(key);
  }
  return ORDERED_KEYS.filter((k) => set.has(k));
}
