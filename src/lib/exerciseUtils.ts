// src/lib/exerciseUtils.ts — Exercise name parsing utilities

/**
 * Parses exercise names that contain parenthetical detail info.
 * e.g. "Board 10 (10 Board Problems)" → { shortName: "Board 10", detailName: "10 Board Problems" }
 *      "Volume Bouldering"            → { shortName: "Volume Bouldering" }
 */
export function parseExerciseName(name: string): {
  shortName: string;
  detailName?: string;
} {
  const match = name.match(/^(.+?)\s*\((.+)\)$/);
  if (match) {
    return { shortName: match[1].trim(), detailName: match[2].trim() };
  }
  return { shortName: name };
}
