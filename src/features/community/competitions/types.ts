// Climber-facing competition types (P2-F, backed by routers/comp_app.py).

export interface CompProblem {
  id: string;
  gym_route_id: string | null;
  label: string | null;
  points: number | null;
  group_key: string | null;
}

export interface CompDivision {
  id: string;
  label: string;
}

export interface CompScorecardEntry {
  comp_problem_id: string;
  top: boolean;
  zone: boolean;
  attempts: number;
  flashed: boolean;
}

export interface CompOrganizer {
  id: string;
  name: string | null;
  logo_url: string | null;
}

export interface CompBrief {
  id: string;
  title: string;
  description?: string | null;
  status: string; // published | active | finished
  gym_id: string | null;
  organizer?: CompOrganizer | null;
  start_at?: string | null;
  end_at?: string | null;
  config: any;
  problem_count: number;
  enrollment_count: number;
}

/** Human format summary from the scoring config (e.g. "Zone + Top · best 5"). */
export function formatSummary(config: any): string {
  const s = config?.scoring ?? {};
  const mode =
    s.mode === "zone_top" ? "Zone + Top" : s.mode === "volume" ? "Volume" : "Points";
  const bestN = config?.aggregation?.best_n;
  return bestN ? `${mode} · best ${bestN}` : mode;
}

export interface CompDetail extends CompBrief {
  problems: CompProblem[];
  my_enrollment: { division_id: string } | null;
  my_scorecards: CompScorecardEntry[];
}

export interface StandingsRow {
  user_id: string;
  display_name: string;
  score: number;
  tops: number;
  zones: number;
  attempts: number;
  rank: number;
}

export interface Standings {
  divisions: Record<string, StandingsRow[]>;
}

/** divisions live in config.divisions = [{id, label, ...}] */
export function divisionsOf(config: any): CompDivision[] {
  const ds = config?.divisions;
  if (!Array.isArray(ds)) return [];
  return ds
    .filter((d) => d && d.id)
    .map((d) => ({ id: String(d.id), label: String(d.label ?? d.id) }));
}

export function divisionLabel(config: any, id: string | null | undefined): string {
  if (!id) return "";
  const d = divisionsOf(config).find((x) => x.id === id);
  return d?.label ?? id;
}
