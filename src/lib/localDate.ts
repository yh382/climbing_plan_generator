// src/lib/localDate.ts
// Local-timezone YYYY-MM-DD formatter — single source of truth for "what
// date is this for the user". The app stores climb logs / sessions / daily
// rollups bucketed by this string, so it MUST be local. UTC ISO slicing
// breaks for users west of UTC (afternoon = next UTC day) and east of UTC
// late at night, causing logs to land in the wrong daily bucket. See B2
// follow-up bug investigation for the full story.

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** Format a Date (or now) as YYYY-MM-DD in the user's local timezone. */
export function localDateString(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Local date string from a millisecond timestamp. */
export function localDateStringFromMs(ms: number): string {
  return localDateString(new Date(ms));
}
