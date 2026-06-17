// Shared route-pin color system (Window SET-UX Phase A).
//
// Single source for: the lower-saturation hold-color palette, the
// luminance-based contrast-text rule (grade label on the pin), and the
// name↔hex normalization that bridges the cross-end divergence — the app
// stores route.color as a color NAME ("blue"), while admin-cms RouteForm
// stores free text that may be a name OR a raw hex ("#ef4444"). Both must
// resolve to a real color (never silently fall to gray). Mirrored in
// admin-cms `lib/routePins.ts` (keep values in sync).

/** Lower-saturation palette, keyed by color name. Replaces RouteDot's old
 *  punchy COLOR_HEX — softer fills so a wall full of dots doesn't scream. */
export const ROUTE_COLOR_HEX: Record<string, string> = {
  blue: '#4A82BC',
  yellow: '#DDBB55',
  red: '#CB5C5C',
  green: '#5C9E69',
  black: '#3A3A3E',
  white: '#EDEDED',
  pink: '#C76591',
  purple: '#8B72BC',
  orange: '#D88C4F',
  teal: '#4FA597',
  gray: '#9AA3B2',
};

const GRAY_FALLBACK = '#9AA3B2';

/** Resolve a `route.color` (a known color NAME, or a raw `#rgb`/`#rrggbb`
 *  hex) to a hex string. Handles the app-names vs admin-hex divergence
 *  (SET-UX R7) so the same route renders the same color on both ends. */
export function resolveRouteColor(color: string | null | undefined): string {
  if (!color) return GRAY_FALLBACK;
  const c = color.trim().toLowerCase();
  if (ROUTE_COLOR_HEX[c]) return ROUTE_COLOR_HEX[c];
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/.test(c)) return c;
  return GRAY_FALLBACK;
}

/** Black or white text for legibility on a given fill, via relative
 *  luminance. Threshold 150 keeps mid-tones (green/purple/pink → white,
 *  yellow/orange/white → black) readable. */
export function gradeTextColor(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  if (h.length !== 6) return '#FFFFFF';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 150 ? '#1A1A1A' : '#FFFFFF';
}

/** Compact grade for the pin center: drop the YDS "5." prefix
 *  ("5.11a" → "11a"); V-scale unchanged ("V6"). */
export function pinGradeLabel(grade: string | null | undefined): string {
  return (grade ?? '').replace(/^5\./, '');
}
