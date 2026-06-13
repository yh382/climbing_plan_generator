// Grade option lists for the OutdoorSendSheet "suggest a grade" stepper.
// Single source shared by the outdoor + indoor-gym route detail pages
// (both previously hardcoded identical copies). NOTE these are the
// *pickable send-sheet options*, deliberately distinct from
// lib/gradeSystem.ts's V_SCALE_GRADES / YDS_GRADES (full canonical
// scales): the send sheet leads V-scale with `VB` and caps at V16 / 5.15c
// to keep the wheel short for the grades climbers actually log. Keep that
// behavior — don't silently swap in the full scales.

export const YDS_GRADES = [
  '5.5', '5.6', '5.7', '5.8', '5.9',
  '5.10a', '5.10b', '5.10c', '5.10d',
  '5.11a', '5.11b', '5.11c', '5.11d',
  '5.12a', '5.12b', '5.12c', '5.12d',
  '5.13a', '5.13b', '5.13c', '5.13d',
  '5.14a', '5.14b', '5.14c', '5.14d',
  '5.15a', '5.15b', '5.15c',
];

export const V_GRADES = [
  'VB', 'V0', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8',
  'V9', 'V10', 'V11', 'V12', 'V13', 'V14', 'V15', 'V16',
];

/** Pick the grade wheel for a route. V-scale when the system hint says so
 *  or the route's own grade is V-prefixed; YDS otherwise. */
export function gradeOptionsFor(
  systemHint?: string,
  originalGrade?: string,
): string[] {
  if (
    systemHint === 'vscale' ||
    (originalGrade && originalGrade.toUpperCase().startsWith('V'))
  ) {
    return V_GRADES;
  }
  return YDS_GRADES;
}
